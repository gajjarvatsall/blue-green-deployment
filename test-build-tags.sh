#!/bin/bash

# test-build-tags.sh - Test Docker build and tag generation

set -e

echo "🧪 Testing Docker Build and Tag Generation"

# Simulate GitHub Actions environment variables
export GITHUB_REPOSITORY_OWNER="gajjarvatsall"
export GITHUB_REF_NAME="main"
export GITHUB_SHA=$(git rev-parse HEAD)
export GITHUB_SHA_SHORT=$(echo $GITHUB_SHA | cut -c1-7)

# Configuration
REGISTRY="docker.io"
IMAGE_NAME="$GITHUB_REPOSITORY_OWNER/blue-green-demo-app"

echo "📋 Configuration:"
echo "  Registry: $REGISTRY"
echo "  Image: $IMAGE_NAME"
echo "  SHA: $GITHUB_SHA_SHORT"
echo "  Branch: $GITHUB_REF_NAME"

# Test different tag formats that would be generated
TAGS=(
    "$REGISTRY/$IMAGE_NAME:$GITHUB_REF_NAME"
    "$REGISTRY/$IMAGE_NAME:sha-$GITHUB_SHA_SHORT"
    "$REGISTRY/$IMAGE_NAME:latest"
)

echo ""
echo "🏷️  Generated Tags:"
for tag in "${TAGS[@]}"; do
    echo "  - $tag"
done

# Test the main tag (what would be used)
MAIN_TAG="$REGISTRY/$IMAGE_NAME:$GITHUB_REF_NAME"
echo ""
echo "🎯 Main tag to use: $MAIN_TAG"

# Build the image with the main tag
echo ""
echo "🔨 Building Docker image..."
docker build -t "$MAIN_TAG" .

# Test tag extraction (simulating GitHub Actions)
echo ""
echo "🧪 Testing tag extraction:"
SIMULATED_TAGS="$REGISTRY/$IMAGE_NAME:$GITHUB_REF_NAME
$REGISTRY/$IMAGE_NAME:sha-$GITHUB_SHA_SHORT  
$REGISTRY/$IMAGE_NAME:latest"

echo "Simulated tags output:"
echo "$SIMULATED_TAGS"

# Extract first tag (like in the workflow)
FIRST_TAG=$(echo "$SIMULATED_TAGS" | head -n1)
echo "First extracted tag: '$FIRST_TAG'"

# Check if tag is empty
if [ -z "$FIRST_TAG" ]; then
    echo "❌ Error: Extracted tag is empty!"
    exit 1
else
    echo "✅ Tag extraction successful"
fi

# Test image operations
echo ""
echo "🐳 Testing Docker operations:"

# Test the built image
echo "Testing local image..."
docker run -d -p 3002:3000 --name test-tag-container "$MAIN_TAG"
sleep 3

if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Image runs successfully"
else
    echo "❌ Image failed to respond"
    docker logs test-tag-container
fi

# Cleanup
docker rm -f test-tag-container
docker rmi "$MAIN_TAG"

echo ""
echo "🎉 Tag generation test completed!"
echo ""
echo "💡 If the GitHub Actions workflow fails:"
echo "1. Check that Docker Hub secrets are set correctly"
echo "2. Verify the image was actually pushed to Docker Hub"
echo "3. Check the job logs for the exact tag being generated"
