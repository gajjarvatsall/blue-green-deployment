#!/bin/bash

# deploy-blue.sh - Deploy to Blue Environment
set -e

VERSION=${1:-"1.0.0"}
NAMESPACE=${2:-"default"}
RELEASE_NAME="blue-green-demo"

echo "🔵 Deploying Blue Environment"
echo "Version: $VERSION"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy to Blue environment
helm upgrade --install $RELEASE_NAME-blue ./blue-green-app \
  --namespace $NAMESPACE \
  --set environment.name=blue \
  --set image.tag=$VERSION \
  --set blueGreen.activeEnvironment=blue \
  --set ingress.enabled=true \
  --wait \
  --timeout=300s

# Check deployment status
echo "🔍 Checking Blue deployment status..."
kubectl rollout status deployment/$RELEASE_NAME-blue-blue-green-app-blue -n $NAMESPACE

# Test Blue environment
echo "🧪 Testing Blue environment..."
kubectl port-forward service/$RELEASE_NAME-blue-blue-green-app-blue 8080:80 -n $NAMESPACE &
PID=$!
sleep 5

# Basic health check
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Blue environment is healthy"
else
    echo "❌ Blue environment health check failed"
    kill $PID
    exit 1
fi

kill $PID

echo "🎉 Blue environment deployed successfully!"
echo "🔗 Access via: kubectl port-forward service/$RELEASE_NAME-blue-blue-green-app-blue 8080:80 -n $NAMESPACE"