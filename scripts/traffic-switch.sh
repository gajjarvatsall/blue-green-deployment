#!/bin/bash
# Traffic switching script

set -e

TARGET_ENV=${1:-"green"}

echo "🔄 Switching traffic to $TARGET_ENV environment"

# Get current active environment
CURRENT_ACTIVE=$(kubectl get configmap blue-green-config -o jsonpath='{.data.active-environment}' 2>/dev/null || echo "blue")

if [ "$CURRENT_ACTIVE" = "$TARGET_ENV" ]; then
    echo "ℹ️  Traffic is already pointing to $TARGET_ENV"
    exit 0
fi

# Update the active environment configuration
kubectl create configmap blue-green-config \
    --from-literal=active-environment="$TARGET_ENV" \
    --from-literal=previous-environment="$CURRENT_ACTIVE" \
    --from-literal=switch-timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --dry-run=client -o yaml | kubectl apply -f -

# Update ingress to point to new environment
kubectl patch ingress blue-green-demo \
    -p "{\"spec\":{\"rules\":[{\"host\":\"blue-green-demo.local\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"blue-green-demo-$TARGET_ENV\",\"port\":{\"number\":3000}}}}]}}]}}"

echo "✅ Traffic successfully switched to $TARGET_ENV"
echo "📊 Previous environment ($CURRENT_ACTIVE) is now idle and ready for next deployment"

# Log the switch
kubectl create event \
    --for deployment/blue-green-demo-$TARGET_ENV \
    --reason="TrafficSwitched" \
    --message="Traffic switched from $CURRENT_ACTIVE to $TARGET_ENV at $(date)"