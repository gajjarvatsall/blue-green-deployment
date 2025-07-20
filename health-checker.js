const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class HealthChecker {
    constructor() {
        this.app = express();
        this.setupRoutes();
        this.healthChecks = [];
        this.metricsHistory = [];
    }

    setupRoutes() {
        this.app.use(express.json());
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const health = this.performHealthCheck();
            res.status(health.status === 'healthy' ? 200 : 503).json(health);
        });

        // Detailed health report
        this.app.get('/health/detailed', (req, res) => {
            const detailedHealth = this.performDetailedHealthCheck();
            res.json(detailedHealth);
        });

        // Traffic readiness check
        this.app.get('/ready', (req, res) => {
            const readiness = this.checkTrafficReadiness();
            res.status(readiness.ready ? 200 : 503).json(readiness);
        });

        // Environment comparison
        this.app.get('/compare/:env1/:env2', async (req, res) => {
            const comparison = await this.compareEnvironments(req.params.env1, req.params.env2);
            res.json(comparison);
        });
    }

    performHealthCheck() {
        const checks = [
            this.checkMemoryUsage(),
            this.checkCPUUsage(),
            this.checkDatabaseConnection(),
            this.checkExternalServices(),
            this.checkApplicationHealth()
        ];

        const failedChecks = checks.filter(check => !check.healthy);
        const status = failedChecks.length === 0 ? 'healthy' : 'unhealthy';

        return {
            status,
            timestamp: new Date().toISOString(),
            checks,
            failedChecks: failedChecks.length,
            uptime: process.uptime()
        };
    }

    performDetailedHealthCheck() {
        const basic = this.performHealthCheck();
        
        return {
            ...basic,
            metrics: {
                responseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate(),
                throughput: this.calculateThroughput(),
                memoryTrend: this.getMemoryTrend()
            },
            dependencies: this.checkDependencies(),
            configuration: this.getConfigurationStatus()
        };
    }

    checkTrafficReadiness() {
        const health = this.performHealthCheck();
        const metrics = this.performDetailedHealthCheck().metrics;
        
        const ready = health.status === 'healthy' && 
                     metrics.responseTime < 1000 && 
                     metrics.errorRate < 0.01;

        return {
            ready,
            reason: ready ? 'All systems operational' : 'Health checks failed',
            health: health.status,
            responseTime: metrics.responseTime,
            errorRate: metrics.errorRate,
            timestamp: new Date().toISOString()
        };
    }

    async compareEnvironments(env1, env2) {
        try {
            const [health1, health2] = await Promise.all([
                this.getEnvironmentHealth(env1),
                this.getEnvironmentHealth(env2)
            ]);

            return {
                comparison: {
                    [env1]: health1,
                    [env2]: health2
                },
                recommendation: this.getRecommendation(health1, health2),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: `Failed to compare environments: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Helper methods
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const totalMemory = usage.heapTotal;
        const usedMemory = usage.heapUsed;
        const memoryPercentage = (usedMemory / totalMemory) * 100;

        return {
            name: 'memory',
            healthy: memoryPercentage < 80,
            value: memoryPercentage,
            threshold: 80,
            unit: 'percentage'
        };
    }

    checkCPUUsage() {
        // Simulate CPU check - in real implementation, use process.cpuUsage()
        const cpuUsage = Math.random() * 100;
        
        return {
            name: 'cpu',
            healthy: cpuUsage < 80,
            value: cpuUsage,
            threshold: 80,
            unit: 'percentage'
        };
    }

    checkDatabaseConnection() {
        // Simulate database connection check
        const connected = Math.random() > 0.1; // 90% success rate
        
        return {
            name: 'database',
            healthy: connected,
            value: connected ? 'connected' : 'disconnected',
            responseTime: connected ? Math.random() * 50 : null
        };
    }

    checkExternalServices() {
        // Simulate external service health
        const services = ['payment-service', 'email-service', 'user-service'];
        const results = services.map(service => ({
            name: service,
            healthy: Math.random() > 0.05, // 95% success rate
            responseTime: Math.random() * 100
        }));

        return {
            name: 'external-services',
            healthy: results.every(r => r.healthy),
            services: results
        };
    }

    checkApplicationHealth() {
        return {
            name: 'application',
            healthy: true,
            version: process.env.VERSION || '1.0.0',
            environment: process.env.ENVIRONMENT || 'blue',
            startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
        };
    }

    calculateAverageResponseTime() {
        return 150 + Math.random() * 100; // Simulate 150-250ms
    }

    calculateErrorRate() {
        return Math.random() * 0.02; // 0-2% error rate
    }

    calculateThroughput() {
        return 100 + Math.random() * 200; // 100-300 requests/minute
    }

    getMemoryTrend() {
        return Array.from({length: 10}, () => Math.random() * 100);
    }

    checkDependencies() {
        return {
            redis: { healthy: true, version: '6.2.0' },
            postgres: { healthy: true, version: '13.0' },
            nginx: { healthy: true, version: '1.21.0' }
        };
    }

    getConfigurationStatus() {
        return {
            environment: process.env.ENVIRONMENT || 'blue',
            version: process.env.VERSION || '1.0.0',
            port: process.env.PORT || 3000,
            database: {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432
            }
        };
    }

    async getEnvironmentHealth(env) {
        // Simulate getting health from environment
        const url = `http://blue-green-demo-${env}:3000/health`;
        try {
            const response = await axios.get(url, { timeout: 5000 });
            return response.data;
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    getRecommendation(health1, health2) {
        if (health1.status === 'healthy' && health2.status === 'unhealthy') {
            return 'Switch to environment 1';
        } else if (health2.status === 'healthy' && health1.status === 'unhealthy') {
            return 'Switch to environment 2';
        } else if (health1.status === 'healthy' && health2.status === 'healthy') {
            return 'Both environments healthy - safe to switch';
        } else {
            return 'Both environments unhealthy - do not switch';
        }
    }
}

module.exports = HealthChecker;