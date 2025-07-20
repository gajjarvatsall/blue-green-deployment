# Zero-Downtime Blue-Green Deployment System

A comprehensive demonstration of Blue-Green deployment strategy using Node.js, Docker, Kubernetes, and Helm.

## 🎯 Overview

This project demonstrates a Blue-Green deployment strategy for zero-downtime deployments. The application is a Node.js Express server with comprehensive health checks, metrics, and Kubernetes-native deployment configurations.

### What is Blue-Green Deployment?

Blue-Green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green. At any time, only one environment is live, serving all production traffic. When deploying a new version, you deploy to the inactive environment, test it, and then switch traffic to it.

## 🏗️ Architecture

<img width="767" height="469" alt="Screenshot 2025-07-20 at 3 10 49 PM" src="https://github.com/user-attachments/assets/98e7279e-a2cd-4e7b-8bf2-b98bbdb4f2ef" />

## ✨ Features

- **Zero-Downtime Deployments**: Switch between environments instantly
- **Health Checks**: Comprehensive liveness, readiness, and startup probes
- **Monitoring**: Built-in metrics and Prometheus-compatible endpoints
- **Kubernetes Native**: Helm charts with best practices
- **Docker Support**: Multi-stage builds with security best practices
- **Environment Management**: Separate blue and green environments
- **Rollback Capability**: Quick rollback to previous version
- **Local Development**: Kind cluster configuration for local testing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** (v20 or higher)
- **kubectl** (v1.25 or higher)
- **Helm** (v3.10 or higher)
- **Kind** (for local development)

### Installation Commands

```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Docker
# Follow instructions at: https://docs.docker.com/get-docker/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kind
go install sigs.k8s.io/kind@latest
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd blue-green-deployment
npm install
```

### 2. Run Locally

```bash
# Start the application
npm start

# Or with development hot-reload
npm run dev

# Test the application
curl http://localhost:3000/health
```

### 3. Setup Local Kubernetes

```bash
# Create Kind cluster
kind create cluster --config kind-config.yaml

# Verify cluster
kubectl cluster-info
```

### 4. Deploy with Helm

```bash
# Deploy Blue environment
./deploy-blue.sh 1.0.0

# Deploy Green environment (with new version)
./deploy-green.sh 1.1.0

# Switch traffic to Green
kubectl patch service blue-green-demo-active -p '{"spec":{"selector":{"environment":"green"}}}'
```

## 📁 Project Structure

```
blue-green-deployment/
├── app.js                 # Main Node.js application
├── package.json          # Node.js dependencies
├── Dockerfile            # Docker image configuration
├── kind-config.yaml      # Kind cluster configuration
├── deploy-blue.sh        # Blue environment deployment script
├── deploy-green.sh       # Green environment deployment script
├── blue-green-app/       # Helm chart
│   ├── Chart.yaml        # Chart metadata
│   ├── values.yaml       # Default configuration values
│   └── templates/        # Kubernetes templates
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── configmap.yaml
│       └── serviceaccount.yaml
└── README.md            # This file
```

## 🚀 Deployment Guide

### Step-by-Step Deployment

#### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t blue-green-app:1.0.0 .

# Tag for your registry
docker tag blue-green-app:1.0.0 your-registry/blue-green-app:1.0.0

# Push to registry
docker push your-registry/blue-green-app:1.0.0
```

#### 2. Deploy Blue Environment

```bash
# Deploy initial version to Blue
./deploy-blue.sh 1.0.0 production

# Verify deployment
kubectl get pods -l environment=blue
kubectl get svc -l environment=blue
```

#### 3. Test Blue Environment

```bash
# Port forward to test
kubectl port-forward svc/blue-green-demo-blue 3000:3000

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/
```

#### 4. Deploy Green Environment

```bash
# Deploy new version to Green
./deploy-green.sh 1.1.0 production

# Verify Green deployment
kubectl get pods -l environment=green
```

#### 5. Switch Traffic

```bash
# Switch active service to Green
kubectl patch service blue-green-demo-active -p '{"spec":{"selector":{"environment":"green"}}}'

# Verify switch
kubectl describe service blue-green-demo-active
```

#### 6. Cleanup Old Environment

```bash
# After confirming Green works, cleanup Blue
helm uninstall blue-green-demo-blue -n production
```

## 🏥 Monitoring & Health Checks

### Health Check Endpoints

| Endpoint   | Purpose         | Description                        |
| ---------- | --------------- | ---------------------------------- |
| `/health`  | General health  | Overall application status         |
| `/ready`   | Readiness probe | Application ready to serve traffic |
| `/live`    | Liveness probe  | Application is alive               |
| `/metrics` | Monitoring      | Prometheus-compatible metrics      |

### Sample Health Check Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "blue",
  "hostname": "blue-green-demo-blue-7b9f8d5c4-xk2mp",
  "timestamp": "2025-07-19T10:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 45678592,
    "heapTotal": 26214400,
    "heapUsed": 18874544,
    "external": 1089024
  },
  "requests": 1247,
  "errors": 0
}
```

## 📡 API Endpoints

### Core Endpoints

- `GET /` - Main application endpoint
- `GET /health` - Health check
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe
- `GET /metrics` - Application metrics

### Example Usage

```bash
# Check application health
curl -X GET http://localhost:3000/health

# Get application metrics
curl -X GET http://localhost:3000/metrics

# Main application endpoint
curl -X GET http://localhost:3000/
```

## ⚙️ Configuration

### Environment Variables

| Variable      | Default      | Description            |
| ------------- | ------------ | ---------------------- |
| `PORT`        | `3000`       | Application port       |
| `VERSION`     | `1.0.0`      | Application version    |
| `ENVIRONMENT` | `blue`       | Deployment environment |
| `NODE_ENV`    | `production` | Node.js environment    |

### Helm Values

Key configuration options in `values.yaml`:

```yaml
# Replica count
replicaCount: 3

# Image configuration
image:
  repository: blue-green-app
  tag: "1.0.0"
  pullPolicy: IfNotPresent

# Service configuration
service:
  type: ClusterIP
  port: 3000
  targetPort: 3000

# Blue-Green specific
blueGreen:
  activeEnvironment: "blue"
  strategy:
    type: "manual"

environment:
  name: "blue"

# Resource limits
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### 2. Docker Build Issues

```bash
# Clean Docker cache
docker system prune -a

# Rebuild with no cache
docker build --no-cache -t blue-green-app:1.0.0 .
```

#### 3. Kubernetes Deployment Issues

```bash
# Check pod status
kubectl get pods -l app=blue-green-app

# Check pod logs
kubectl logs -l environment=blue

# Describe pod for events
kubectl describe pod <pod-name>
```

#### 4. Health Check Failures

```bash
# Check if health endpoint responds
kubectl exec -it <pod-name> -- curl localhost:3000/health

# Check readiness probe configuration
kubectl describe pod <pod-name> | grep -A 10 "Readiness"
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -l app=blue-green-app

# Check Helm releases
helm list -A

# View Helm values
helm get values blue-green-demo-blue

# Check service endpoints
kubectl get endpoints

# Monitor pod logs in real-time
kubectl logs -f deployment/blue-green-demo-blue
```

## 🔄 Blue-Green Deployment Best Practices

1. **Always test thoroughly** in the inactive environment before switching
2. **Monitor both environments** during deployment
3. **Keep rollback plan ready** in case of issues
4. **Use feature flags** for gradual rollouts
5. **Automate health checks** before traffic switching
6. **Monitor application metrics** post-deployment
7. **Clean up old environments** after successful deployment

## 📊 Monitoring Integration

### Prometheus Configuration

```yaml
# Add to your Prometheus scrape config
scrape_configs:
  - job_name: "blue-green-app"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html)

---

**Happy Deploying!** 🚀

For questions or support, please open an issue in the repository.
