#!/bin/bash

# Test script to simulate the GitHub Actions metadata generation
echo "🧪 Testing Docker metadata generation..."

# Simulate environment variables
export GITHUB_REF="refs/heads/main"
export GITHUB_SHA="abcd1234567890"
export GITHUB_REPOSITORY="gajjarvatsall/blue-green-deployment"

# Simulate metadata output (this is what docker/metadata-action would generate)
MOCK_TAGS="docker.io/gajjarvatsall/blue-green-demo-app:main
docker.io/gajjarvatsall/blue-green-demo-app:sha-abcd123
docker.io/gajjarvatsall/blue-green-demo-app:latest"

echo "📋 Simulated metadata tags:"
echo "$MOCK_TAGS"
echo ""

# Test the primary tag extraction logic
echo "🔍 Testing primary tag extraction..."
PRIMARY_TAG=$(echo "$MOCK_TAGS" | head -n1)

echo "✅ Primary tag selected: $PRIMARY_TAG"

# Validate tag is not empty
if [ -z "$PRIMARY_TAG" ]; then
    echo "❌ Error: No tags generated"
    exit 1
fi

# Test version extraction
VERSION=$(echo $PRIMARY_TAG | cut -d: -f2)
IMAGE_REPO=$(echo $PRIMARY_TAG | cut -d: -f1)

echo "🔖 Version: $VERSION"
echo "📍 Repository: $IMAGE_REPO"

echo ""
echo "✅ Tag extraction test completed successfully!"
