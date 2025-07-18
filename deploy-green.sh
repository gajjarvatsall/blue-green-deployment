#!/bin/bash

# deploy-green.sh - Deploy to Green Environment
set -e

VERSION=${1:-"2.0.0"}
NAMESPACE=${2:-"default"}
RELEASE_NAME="blue-green-demo"

echo "🟢 Deploying Green Environment"
echo "Version: $VERSION"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy to Green environment
helm upgrade --install $RELEASE_NAME-green ./blue-green-app \
  --namespace $NAMESPACE \
  --set environment.name=green \
  --set image.tag=$VERSION \
  --set blueGreen.activeEnvironment=blue \
  --set ingress.enabled=true \
  --wait \
  --timeout=300s

# Check deployment status
echo "🔍 Checking Green deployment status..."
kubectl rollout status deployment/$RELEASE_NAME-green-blue-green-app-green -n $NAMESPACE

# Test Green environment
echo "🧪 Testing Green environment..."
kubectl port-forward service/$RELEASE_NAME-green-blue-green-app-green 8081:80 -n $NAMESPACE &
PID=$!
sleep 5

# Basic health check
if curl -f http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ Green environment is healthy"
else
    echo "❌ Green environment health check failed"
    kill $PID
    exit 1
fi

kill $PID

echo "🎉 Green environment deployed successfully!"
echo "🔗 Access via: kubectl port-forward service/$RELEASE_NAME-green-blue-green-app-green 8081:80 -n $NAMESPACE"