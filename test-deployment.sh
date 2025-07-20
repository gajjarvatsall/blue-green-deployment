#!/bin/bash

# test-deployment.sh - Local testing script for blue-green deployment

set -e

echo "🧪 Testing Blue-Green Deployment Locally"

# Configuration
IMAGE_NAME="blue-green-demo-app"
VERSION="test-$(date +%s)"
CLUSTER_NAME="blue-green-test"

echo "📋 Configuration:"
echo "  Image: $IMAGE_NAME:$VERSION"
echo "  Cluster: $CLUSTER_NAME"

# Step 1: Build Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:$VERSION .

# Step 2: Create KIND cluster
echo "🏗️ Creating KIND cluster..."
if kind get clusters | grep -q $CLUSTER_NAME; then
    echo "Cluster $CLUSTER_NAME already exists, deleting..."
    kind delete cluster --name $CLUSTER_NAME
fi

kind create cluster --name $CLUSTER_NAME --config kind-config.yaml

# Step 3: Load image into cluster
echo "📦 Loading image into cluster..."
kind load docker-image $IMAGE_NAME:$VERSION --name $CLUSTER_NAME

# Step 4: Install NGINX Ingress
echo "🌐 Installing NGINX Ingress..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s

# Step 5: Deploy to Blue environment
echo "🔵 Deploying to Blue environment..."
helm upgrade --install blue-green-demo-blue ./blue-green-app \
  --set environment.name=blue \
  --set image.tag=$VERSION \
  --set image.repository=$IMAGE_NAME \
  --set image.pullPolicy=Never \
  --wait --timeout=5m

# Step 6: Wait for deployment
echo "⏳ Waiting for Blue deployment..."
kubectl rollout status deployment/blue-green-demo-blue-blue-green-app --timeout=300s

# Step 7: Test Blue environment
echo "🧪 Testing Blue environment..."
kubectl port-forward service/blue-green-demo-blue-blue-green-app 8080:3000 &
PF_PID=$!
sleep 10

for i in {1..5}; do
    echo "Health check $i/5"
    if curl -f http://localhost:8080/health; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
        kill $PF_PID
        exit 1
    fi
done

kill $PF_PID

# Step 8: Deploy to Green environment
echo "🟢 Deploying to Green environment..."
helm upgrade --install blue-green-demo-green ./blue-green-app \
  --set environment.name=green \
  --set image.tag=$VERSION \
  --set image.repository=$IMAGE_NAME \
  --set image.pullPolicy=Never \
  --wait --timeout=5m

# Step 9: Wait for Green deployment
echo "⏳ Waiting for Green deployment..."
kubectl rollout status deployment/blue-green-demo-green-blue-green-app --timeout=300s

# Step 10: Test Green environment
echo "🧪 Testing Green environment..."
kubectl port-forward service/blue-green-demo-green-blue-green-app 8081:3000 &
PF_PID=$!
sleep 10

for i in {1..5}; do
    echo "Health check $i/5"
    if curl -f http://localhost:8081/health; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
        kill $PF_PID
        exit 1
    fi
done

kill $PF_PID

echo "🎉 Blue-Green deployment test completed successfully!"
echo "📊 Summary:"
echo "  ✅ Blue environment: Deployed and healthy"
echo "  ✅ Green environment: Deployed and healthy"
echo "  🔗 Both environments running version: $VERSION"

echo ""
echo "🔧 Useful commands:"
echo "  View pods: kubectl get pods"
echo "  View services: kubectl get services"
echo "  Test blue: kubectl port-forward service/blue-green-demo-blue-blue-green-app 8080:3000"
echo "  Test green: kubectl port-forward service/blue-green-demo-green-blue-green-app 8081:3000"
echo "  Cleanup: kind delete cluster --name $CLUSTER_NAME"
