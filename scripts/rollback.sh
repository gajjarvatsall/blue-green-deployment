#!/bin/bash
set -e

ROLLBACK_ENV=${1:-"blue"}
NAMESPACE=${2:-"default"}

echo "🔙 Rolling back to $ROLLBACK_ENV environment..."

# Switch traffic back
./scripts/switch-traffic.sh $ROLLBACK_ENV $NAMESPACE

# Send alert
echo "⚠️ ROLLBACK EXECUTED - Traffic reverted to $ROLLBACK_ENV environment"

# Log rollback event
kubectl create event rollback-executed \
  --reason="DeploymentFailed" \
  --message="Automatic rollback to $ROLLBACK_ENV environment" \
  --type="Warning" || true