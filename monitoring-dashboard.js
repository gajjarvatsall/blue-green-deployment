const express = require("express");
const axios = require("axios");
const HealthChecker = require("./health-checker");
const TrafficController = require("./traffic-controller");

class MonitoringDashboard {
  constructor() {
    this.app = express();
    this.healthChecker = new HealthChecker();
    this.trafficController = new TrafficController();
    this.setupRoutes();
    this.metrics = {
      deployments: [],
      traffic: [],
      errors: [],
      performance: [],
    };
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static("public"));

    // Dashboard endpoints
    this.app.get("/dashboard", (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    this.app.get("/api/status", async (req, res) => {
      const status = await this.getSystemStatus();
      res.json(status);
    });

    this.app.get("/api/environments", async (req, res) => {
      const environments = await this.getEnvironmentStatus();
      res.json(environments);
    });

    this.app.get("/api/metrics", (req, res) => {
      res.json(this.metrics);
    });

    this.app.post("/api/switch", async (req, res) => {
      try {
        const { environment, canary } = req.body;
        const result = await this.trafficController.switchTraffic(environment, {
          enableCanary: canary,
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post("/api/rollback", async (req, res) => {
      try {
        const result = await this.trafficController.rollback();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async getSystemStatus() {
    const trafficStatus = await this.trafficController.getTrafficStatus();

    return {
      timestamp: new Date().toISOString(),
      currentEnvironment: trafficStatus.currentEnvironment,
      switchInProgress: this.trafficController.switchInProgress,
      uptime: process.uptime(),
      version: process.env.VERSION || "1.0.0",
    };
  }

  async getEnvironmentStatus() {
    try {
      const [blueHealth, greenHealth] = await Promise.all([
        this.getEnvironmentHealth("blue"),
        this.getEnvironmentHealth("green"),
      ]);

      return {
        blue: blueHealth,
        green: greenHealth,
        comparison: this.compareEnvironments(blueHealth, greenHealth),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getEnvironmentHealth(env) {
    try {
      const response = await axios.get(
        `http://blue-green-demo-${env}:3000/health/detailed`,
        {
          timeout: 5000,
        }
      );
      return {
        environment: env,
        status: "healthy",
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        environment: env,
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  compareEnvironments(blue, green) {
    if (blue.status === "healthy" && green.status === "healthy") {
      return {
        recommendation: "Both environments healthy",
        canSwitch: true,
        preferredEnvironment: "either",
      };
    } else if (blue.status === "healthy" && green.status === "unhealthy") {
      return {
        recommendation: "Switch to blue environment",
        canSwitch: true,
        preferredEnvironment: "blue",
      };
    } else if (blue.status === "unhealthy" && green.status === "healthy") {
      return {
        recommendation: "Switch to green environment",
        canSwitch: true,
        preferredEnvironment: "green",
      };
    } else {
      return {
        recommendation: "Both environments unhealthy - investigate",
        canSwitch: false,
        preferredEnvironment: "none",
      };
    }
  }

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blue-Green Deployment Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-healthy { color: #27ae60; }
        .status-unhealthy { color: #e74c3c; }
        .status-warning { color: #f39c12; }
        .environment-card { border-left: 4px solid #3498db; }
        .environment-card.active { border-left-color: #27ae60; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { text-align: center; padding: 15px; background: #ecf0f1; border-radius: 6px; }
        .controls { display: flex; gap: 10px; margin-top: 15px; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #3498db; color: white; }
        .btn-success { background: #27ae60; color: white; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-warning { background: #f39c12; color: white; }
        .logs { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 6px; font-family: monospace; height: 200px; overflow-y: auto; }
        .chart { height: 200px; background: #ecf0f1; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Blue-Green Deployment Dashboard</h1>
            <p>Real-time monitoring and control for zero-downtime deployments</p>
        </div>

        <div class="dashboard">
            <div class="card">
                <h3>System Status</h3>
                <div id="systemStatus">Loading...</div>
            </div>
            
            <div class="card">
                <h3>Traffic Control</h3>
                <div id="trafficControl">
                    <div class="controls">
                        <button class="btn btn-primary" onclick="switchEnvironment('blue')">Switch to Blue</button>
                        <button class="btn btn-success" onclick="switchEnvironment('green')">Switch to Green</button>
                        <button class="btn btn-warning" onclick="rollback()">Rollback</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard">
            <div class="card environment-card" id="blueEnvironment">
                <h3>🔵 Blue Environment</h3>
                <div id="blueStatus">Loading...</div>
                <div class="metrics" id="blueMetrics"></div>
            </div>
            
            <div class="card environment-card" id="greenEnvironment">
                <h3>🟢 Green Environment</h3>
                <div id="greenStatus">Loading...</div>
                <div class="metrics" id="greenMetrics"></div>
            </div>
        </div>

        <div class="card">
            <h3>Deployment Logs</h3>
            <div class="logs" id="logs">
                <div>Dashboard initialized...</div>
            </div>
        </div>
    </div>

    <script>
        let currentEnvironment = 'blue';
        
        async function fetchStatus() {
            try {
                const [systemResponse, environmentsResponse] = await Promise.all([
                    fetch('/api/status'),
                    fetch('/api/environments')
                ]);
                
                const systemStatus = await systemResponse.json();
                const environments = await environmentsResponse.json();
                
                updateSystemStatus(systemStatus);
                updateEnvironmentStatus(environments);
                
            } catch (error) {
                log('Error fetching status: ' + error.message);
            }
        }
        
        function updateSystemStatus(status) {
            const systemStatusDiv = document.getElementById('systemStatus');
            systemStatusDiv.innerHTML = \`
                <div class="metrics">
                    <div class="metric">
                        <strong>Current Environment</strong><br>
                        <span class="status-healthy">\${status.currentEnvironment.toUpperCase()}</span>
                    </div>
                    <div class="metric">
                        <strong>Switch Status</strong><br>
                        <span class="\${status.switchInProgress ? 'status-warning' : 'status-healthy'}">
                            \${status.switchInProgress ? 'In Progress' : 'Ready'}
                        </span>
                    </div>
                    <div class="metric">
                        <strong>Uptime</strong><br>
                        <span>\${Math.floor(status.uptime / 60)}m \${Math.floor(status.uptime % 60)}s</span>
                    </div>
                    <div class="metric">
                        <strong>Version</strong><br>
                        <span>\${status.version}</span>
                    </div>
                </div>
            \`;
            
            currentEnvironment = status.currentEnvironment;
        }
        
        function updateEnvironmentStatus(environments) {
            updateEnvironmentCard('blue', environments.blue);
            updateEnvironmentCard('green', environments.green);
            
            // Update active environment indicator
            document.getElementById('blueEnvironment').classList.toggle('active', currentEnvironment === 'blue');
            document.getElementById('greenEnvironment').classList.toggle('active', currentEnvironment === 'green');
        }
        
        function updateEnvironmentCard(env, status) {
            const statusDiv = document.getElementById(env + 'Status');
            const metricsDiv = document.getElementById(env + 'Metrics');
            
            const statusClass = status.status === 'healthy' ? 'status-healthy' : 'status-unhealthy';
            
            statusDiv.innerHTML = \`
                <div class="\${statusClass}">
                    <strong>Status:</strong> \${status.status.toUpperCase()}
                </div>
                <div><strong>Last Check:</strong> \${new Date(status.timestamp).toLocaleTimeString()}</div>
            \`;
            
            if (status.status === 'healthy' && status.data) {
                const data = status.data;
                metricsDiv.innerHTML = \`
                    <div class="metric">
                        <strong>Response Time</strong><br>
                        <span>\${Math.round(data.metrics.responseTime)}ms</span>
                    </div>
                    <div class="metric">
                        <strong>Error Rate</strong><br>
                        <span>\${(data.metrics.errorRate * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <strong>Throughput</strong><br>
                        <span>\${Math.round(data.metrics.throughput)}/min</span>
                    </div>
                    <div class="metric">
                        <strong>Memory Usage</strong><br>
                        <span>\${data.checks.find(c => c.name === 'memory')?.value?.toFixed(1) || 'N/A'}%</span>
                    </div>
                \`;
            } else {
                metricsDiv.innerHTML = \`
                    <div class="metric">
                        <strong>Error</strong><br>
                        <span class="status-unhealthy">\${status.error || 'Unknown error'}</span>
                    </div>
                \`;
            }
        }
        
        async function switchEnvironment(env) {
            if (currentEnvironment === env) {
                log(\`Already routing to \${env} environment\`);
                return;
            }
            
            try {
                log(\`Switching traffic to \${env} environment...\`);
                
                const response = await fetch('/api/switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ environment: env, canary: false })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    log(\`✅ Successfully switched to \${env} environment\`);
                } else {
                    log(\`❌ Failed to switch to \${env} environment: \${result.error}\`);
                }
                
                fetchStatus();
                
            } catch (error) {
                log(\`❌ Error switching environment: \${error.message}\`);
            }
        }
        
        async function rollback() {
            try {
                log('Rolling back to previous environment...');
                
                const response = await fetch('/api/rollback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    log(\`✅ Successfully rolled back to \${result.rolledBackTo} environment\`);
                } else {
                    log(\`❌ Rollback failed: \${result.error}\`);
                }
                
                fetchStatus();
                
            } catch (error) {
                log(\`❌ Error during rollback: \${error.message}\`);
            }
        }
        
        function log(message) {
            const logsDiv = document.getElementById('logs');
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.textContent = \`[\${timestamp}] \${message}\`;
            logsDiv.appendChild(logEntry);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }
        
        // Initialize dashboard
        fetchStatus();
        setInterval(fetchStatus, 5000); // Update every 5 seconds
    </script>
</body>
</html>
        `;
  }

  start(port = 4000) {
    this.app.listen(port, () => {
      console.log(`📊 Monitoring dashboard running on port ${port}`);
      console.log(`🔗 Dashboard URL: http://localhost:${port}/dashboard`);
    });
  }
}

module.exports = MonitoringDashboard;

// Start the dashboard if this file is run directly
if (require.main === module) {
  const dashboard = new MonitoringDashboard();
  dashboard.start(4000);
}
