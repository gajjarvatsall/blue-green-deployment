const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class TrafficController {
    constructor() {
        this.currentEnvironment = 'blue';
        this.targetEnvironment = 'green';
        this.switchInProgress = false;
        this.healthChecker = null;
    }

    async switchTraffic(targetEnv, options = {}) {
        if (this.switchInProgress) {
            throw new Error('Traffic switch already in progress');
        }

        this.switchInProgress = true;
        
        try {
            const result = await this.performTrafficSwitch(targetEnv, options);
            return result;
        } finally {
            this.switchInProgress = false;
        }
    }

    async performTrafficSwitch(targetEnv, options) {
        const {
            healthCheckRetries = 3,
            healthCheckInterval = 5000,
            canaryPercentage = 0,
            enableCanary = false
        } = options;

        console.log(`🔄 Starting traffic switch to ${targetEnv} environment`);
        
        // Step 1: Pre-switch health check
        const healthCheck = await this.performHealthCheck(targetEnv, healthCheckRetries, healthCheckInterval);
        if (!healthCheck.healthy) {
            throw new Error(`Target environment ${targetEnv} is not healthy: ${healthCheck.reason}`);
        }

        // Step 2: Canary deployment (if enabled)
        if (enableCanary) {
            await this.performCanaryDeployment(targetEnv, canaryPercentage);
        }

        // Step 3: Switch traffic
        await this.updateIngressRules(targetEnv);
        
        // Step 4: Post-switch validation
        const postSwitchHealth = await this.validatePostSwitch(targetEnv);
        if (!postSwitchHealth.healthy) {
            console.log('❌ Post-switch validation failed, rolling back...');
            await this.rollback();
            throw new Error(`Post-switch validation failed: ${postSwitchHealth.reason}`);
        }

        // Step 5: Update current environment
        this.currentEnvironment = targetEnv;
        this.targetEnvironment = targetEnv === 'blue' ? 'green' : 'blue';

        return {
            success: true,
            previousEnvironment: targetEnv === 'blue' ? 'green' : 'blue',
            currentEnvironment: targetEnv,
            timestamp: new Date().toISOString(),
            healthCheck,
            postSwitchHealth
        };
    }

    async performHealthCheck(env, retries, interval) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(`http://blue-green-demo-${env}:3000/ready`, {
                    timeout: 10000
                });
                
                if (response.status === 200 && response.data.ready) {
                    return {
                        healthy: true,
                        environment: env,
                        attempt: i + 1,
                        data: response.data
                    };
                }
            } catch (error) {
                console.log(`Health check attempt ${i + 1} failed: ${error.message}`);
            }
            
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        return {
            healthy: false,
            environment: env,
            attempts: retries,
            reason: 'Health check failed after maximum retries'
        };
    }

    async performCanaryDeployment(targetEnv, percentage) {
        console.log(`🐤 Starting canary deployment: ${percentage}% to ${targetEnv}`);
        
        // Update ingress with weighted routing
        await this.updateCanaryIngress(targetEnv, percentage);
        
        // Monitor canary for issues
        await this.monitorCanary(targetEnv, percentage);
        
        console.log(`✅ Canary deployment successful`);
    }

    async updateIngressRules(targetEnv) {
        console.log(`🔄 Updating ingress rules to route to ${targetEnv}`);
        
        const ingressPatch = {
            spec: {
                rules: [{
                    host: 'blue-green-demo.local',
                    http: {
                        paths: [{
                            path: '/',
                            pathType: 'Prefix',
                            backend: {
                                service: {
                                    name: `blue-green-demo-${targetEnv}`,
                                    port: {
                                        number: 80
                                    }
                                }
                            }
                        }]
                    }
                }]
            }
        };

        try {
            await execAsync(`kubectl patch ingress blue-green-demo --type=merge -p '${JSON.stringify(ingressPatch)}'`);
            console.log(`✅ Ingress updated to route to ${targetEnv}`);
        } catch (error) {
            throw new Error(`Failed to update ingress: ${error.message}`);
        }
    }

    async updateCanaryIngress(targetEnv, percentage) {
        const annotations = {
            'nginx.ingress.kubernetes.io/canary': 'true',
            'nginx.ingress.kubernetes.io/canary-weight': percentage.toString()
        };

        try {
            await execAsync(`kubectl annotate ingress blue-green-demo-canary ${Object.entries(annotations).map(([k, v]) => `${k}=${v}`).join(' ')}`);
            console.log(`✅ Canary ingress updated: ${percentage}% to ${targetEnv}`);
        } catch (error) {
            throw new Error(`Failed to update canary ingress: ${error.message}`);
        }
    }

    async monitorCanary(targetEnv, percentage) {
        const monitoringDuration = 30000; // 30 seconds
        const checkInterval = 5000; // 5 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < monitoringDuration) {
            const health = await this.performHealthCheck(targetEnv, 1, 1000);
            
            if (!health.healthy) {
                throw new Error(`Canary monitoring failed: ${health.reason}`);
            }
            
            console.log(`📊 Canary monitoring: ${percentage}% traffic to ${targetEnv} - OK`);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }

    async validatePostSwitch(env) {
        // Wait a bit for traffic to stabilize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Perform comprehensive health check
        const health = await this.performHealthCheck(env, 3, 2000);
        
        if (!health.healthy) {
            return health;
        }

        // Additional validation checks
        try {
            // Check if application is responding correctly
            const response = await axios.get(`http://blue-green-demo-${env}:3000/api/health`, {
                timeout: 5000
            });
            
            return {
                healthy: true,
                environment: env,
                responseTime: response.headers['x-response-time'],
                version: response.data.version
            };
        } catch (error) {
            return {
                healthy: false,
                environment: env,
                reason: `Application validation failed: ${error.message}`
            };
        }
    }

    async rollback() {
        console.log('🔄 Rolling back to previous environment...');
        
        const previousEnv = this.currentEnvironment === 'blue' ? 'green' : 'blue';
        
        try {
            await this.updateIngressRules(previousEnv);
            console.log(`✅ Successfully rolled back to ${previousEnv}`);
            return { success: true, rolledBackTo: previousEnv };
        } catch (error) {
            console.log(`❌ Rollback failed: ${error.message}`);
            throw error;
        }
    }

    async getTrafficStatus() {
        try {
            const { stdout } = await execAsync('kubectl get ingress blue-green-demo -o json');
            const ingress = JSON.parse(stdout);
            
            const serviceName = ingress.spec.rules[0].http.paths[0].backend.service.name;
            const environment = serviceName.includes('blue') ? 'blue' : 'green';
            
            return {
                currentEnvironment: environment,
                ingressName: ingress.metadata.name,
                lastUpdate: ingress.metadata.managedFields[0].time,
                status: 'active'
            };
        } catch (error) {
            return {
                error: `Failed to get traffic status: ${error.message}`
            };
        }
    }
}

module.exports = TrafficController;