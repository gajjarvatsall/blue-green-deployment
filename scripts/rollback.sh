#!/bin/bash
# Emergency rollback script

set -e

REASON=${1:-"Emergency rollback"}

echo "🚨 Initiating emergency rollback: $REASON"

# Get current configuration
CURRENT_ACTIVE=$(kubectl get configmap blue-green-config -o jsonpath='{.data.active-environment}' 2>/dev/null || echo "blue")
PREVIOUS_ENV=$(kubectl get configmap blue-green-config -o jsonpath='{.data.previous-environment}' 2>/dev/null || echo "green")

if [ "$CURRENT_ACTIVE" = "blue" ]; then
    ROLLBACK_TO="green"
else
    ROLLBACK_TO="blue"
fi

echo "📋 Current active: $CURRENT_ACTIVE"
echo "🔄 Rolling back to: $ROLLBACK_TO"

# Check if rollback target exists and is healthy
if ! kubectl get deployment "blue-green-demo-$ROLLBACK_TO" > /dev/null 2>&1; then
    echo "❌ Rollback target deployment not found: blue-green-demo-$ROLLBACK_TO"
    exit 1
fi

# Ensure rollback target is ready
kubectl rollout status deployment/blue-green-demo-$ROLLBACK_TO --timeout=60s

# Switch traffic immediately
echo "⚡ Switching traffic to $ROLLBACK_TO (rollback)"

kubectl create configmap blue-green-config \
    --from-literal=active-environment="$ROLLBACK_TO" \
    --from-literal=previous-environment="$CURRENT_ACTIVE" \
    --from-literal=rollback-reason="$REASON" \
    --from-literal=rollback-timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --dry-run=client -o yaml | kubectl apply -f -

# Update ingress
kubectl patch ingress blue-green-demo \
    -p "{\"spec\":{\"rules\":[{\"host\":\"blue-green-demo.local\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"blue-green-demo-$ROLLBACK_TO\",\"port\":{\"number\":3000}}}}]}}]}}"

# Create rollback event
kubectl create event \
    --for deployment/blue-green-demo-$ROLLBACK_TO \
    --reason="EmergencyRollback" \
    --message="Emergency rollback from $CURRENT_ACTIVE to $ROLLBACK_TO. Reason: $REASON"

echo "✅ Emergency rollback completed successfully!"
echo "🎯 Traffic is now pointing to $ROLLBACK_TO"
echo "📝 Reason: $REASON"

# Quick health check
sleep 5
kubectl port-forward service/blue-green-demo-$ROLLBACK_TO 8080:3000 &
PF_PID=$!
sleep 5

if curl -f -s http://localhost:8080/health > /dev/null; then
    echo "✅ Rollback target is healthy"
else
    echo "⚠️  Warning: Rollback target health check failed"
fi

kill $PF_PID 2>/dev/null || true