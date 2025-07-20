#!/bin/bash
set -e

TARGET_ENV=${1:-"green"}
NAMESPACE=${2:-"default"}
RELEASE_NAME="blue-green-demo"

echo "🔄 Switching traffic to $TARGET_ENV environment..."

# Update ingress to point to target environment
kubectl patch ingress ${RELEASE_NAME} -p "{
  \"spec\": {
    \"rules\": [{
      \"host\": \"blue-green-demo.local\",
      \"http\": {
        \"paths\": [{
          \"path\": \"/\",
          \"pathType\": \"Prefix\",
          \"backend\": {
            \"service\": {
              \"name\": \"${RELEASE_NAME}-${TARGET_ENV}\",
              \"port\": {
                \"number\": 80
              }
            }
          }
        }]
      }
    }]
  }
}" -n $NAMESPACE

# Update active environment config
kubectl create configmap deployment-config \
  --from-literal=active-environment=$TARGET_ENV \
  --dry-run=client -o yaml | kubectl apply -n $NAMESPACE -f -

echo "✅ Traffic switched to $TARGET_ENV environment"

# Wait for traffic to be fully switched
sleep 10

# Test the switch
echo "🧪 Testing traffic switch..."
RESPONSE=$(curl -s http://blue-green-demo.local/api/version || echo "ERROR")
if [[ $RESPONSE == *"$TARGET_ENV"* ]]; then
  echo "✅ Traffic switch verified - now serving from $TARGET_ENV"
else
  echo "❌ Traffic switch verification failed"
  exit 1
fi