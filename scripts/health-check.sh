#!/bin/bash
# Enhanced health check script

set -e

TARGET_ENV=${1:-"green"}
MAX_RETRIES=30
RETRY_INTERVAL=10

echo "🏥 Running comprehensive health checks for $TARGET_ENV environment"

# Function to run health check
run_health_check() {
    local service_name="blue-green-demo-$TARGET_ENV"
    local port=3000
    
    echo "📋 Starting health checks..."
    
    # Port forward for testing
    kubectl port-forward "service/$service_name" 8080:$port &
    PF_PID=$!
    sleep 5
    
    # Basic health check
    echo "1️⃣  Basic health check..."
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f -s http://localhost:8080/health > /dev/null; then
            echo "✅ Basic health check passed"
            break
        fi
        if [ $i -eq $MAX_RETRIES ]; then
            echo "❌ Basic health check failed after $MAX_RETRIES attempts"
            kill $PF_PID
            exit 1
        fi
        sleep $RETRY_INTERVAL
    done
    
    # API functionality tests
    echo "2️⃣  API functionality tests..."
    
    # Test API endpoints
    ENDPOINTS=("/api/users" "/api/orders" "/api/version" "/api/features")
    for endpoint in "${ENDPOINTS[@]}"; do
        if ! curl -f -s "http://localhost:8080$endpoint" > /dev/null; then
            echo "❌ API test failed for $endpoint"
            kill $PF_PID
            exit 1
        fi
    done
    echo "✅ All API endpoints responding"
    
    # Performance test
    echo "3️⃣  Performance test..."
    start_time=$(date +%s)
    for i in {1..100}; do
        curl -f -s http://localhost:8080/api/users > /dev/null
    done
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    rps=$((100 / duration))
    echo "✅ Performance test: $rps requests/second"
    
    # Memory and resource check
    echo "4️⃣  Resource utilization check..."
    POD_NAME=$(kubectl get pods -l "app.kubernetes.io/instance=blue-green-demo-$TARGET_ENV" -o jsonpath='{.items[0].metadata.name}')
    
    if [ -n "$POD_NAME" ]; then
        MEMORY_USAGE=$(kubectl top pod $POD_NAME --no-headers | awk '{print $3}' | sed 's/Mi//')
        if [ "$MEMORY_USAGE" -gt 500 ]; then
            echo "⚠️  High memory usage: ${MEMORY_USAGE}Mi"
        else
            echo "✅ Memory usage normal: ${MEMORY_USAGE}Mi"
        fi
    fi
    
    kill $PF_PID
    echo "🎉 All health checks passed for $TARGET_ENV environment!"
}

# Run the health checks
run_health_check

# Store health check results
kubectl create configmap health-check-result-$TARGET_ENV \
    --from-literal=status="passed" \
    --from-literal=timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --from-literal=environment="$TARGET_ENV" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Health check completed successfully!"