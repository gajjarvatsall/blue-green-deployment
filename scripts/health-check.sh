#!/bin/bash
set -e

TARGET_ENV=${1:-"green"}
NAMESPACE=${2:-"default"}
RELEASE_NAME="blue-green-demo"
MAX_RETRIES=30
RETRY_INTERVAL=10

echo "🏥 Running comprehensive health checks for $TARGET_ENV environment..."

SERVICE_NAME="${RELEASE_NAME}-${TARGET_ENV}"
SERVICE_URL="http://${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available deployment/${RELEASE_NAME}-${TARGET_ENV} \
  --timeout=300s -n $NAMESPACE

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/instance=${RELEASE_NAME},environment=${TARGET_ENV} \
  --timeout=300s -n $NAMESPACE

# Health check loop
for i in $(seq 1 $MAX_RETRIES); do
  echo "🔍 Health check attempt $i/$MAX_RETRIES"
  
  # Basic health check
  if kubectl exec -n $NAMESPACE deployment/${RELEASE_NAME}-${TARGET_ENV} -- \
     curl -f -s ${SERVICE_URL}:3000/health > /dev/null; then
    echo "✅ Basic health check passed"
    
    # Deep health check
    if kubectl exec -n $NAMESPACE deployment/${RELEASE_NAME}-${TARGET_ENV} -- \
       curl -f -s ${SERVICE_URL}:3000/health/deep | grep -q "healthy"; then
      echo "✅ Deep health check passed"
      
      # Load test
      kubectl exec -n $NAMESPACE deployment/${RELEASE_NAME}-${TARGET_ENV} -- \
        curl -f -s "${SERVICE_URL}:3000/test/load?requests=10"
      echo "✅ Load test passed"
      
      echo "🎉 All health checks passed for $TARGET_ENV environment!"
      exit 0
    fi
  fi
  
  echo "⚠️ Health check failed, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "❌ Health checks failed after $MAX_RETRIES attempts"
exit 1