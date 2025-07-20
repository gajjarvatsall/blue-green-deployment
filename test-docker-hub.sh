#!/bin/bash

# test-docker-hub.sh - Test Docker Hub integration locally

set -e

echo "🐋 Testing Docker Hub Integration"

# Configuration
DOCKER_USERNAME="${1:-gajjarvatsall}"  # Replace with your Docker Hub username
IMAGE_NAME="$DOCKER_USERNAME/blue-green-demo-app"
VERSION="test-$(date +%s)"

echo "📋 Configuration:"
echo "  Docker Hub Username: $DOCKER_USERNAME"
echo "  Image: $IMAGE_NAME:$VERSION"

# Step 1: Build the image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:$VERSION .
docker tag $IMAGE_NAME:$VERSION $IMAGE_NAME:latest

echo "✅ Image built successfully"

# Step 2: Test the image locally
echo "🧪 Testing image locally..."
docker run -d -p 3001:3000 --name test-container $IMAGE_NAME:$VERSION

# Wait for container to start
sleep 5

# Test the health endpoint
if curl -f http://localhost:3001/health; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker logs test-container
    docker rm -f test-container
    exit 1
fi

# Cleanup test container
docker rm -f test-container

# Step 3: Check if user is logged in to Docker Hub
echo "🔐 Checking Docker Hub authentication..."
if docker info | grep -q "Username"; then
    echo "✅ Already logged in to Docker Hub"
else
    echo "ℹ️  Not logged in to Docker Hub"
    echo "To push to Docker Hub, run: docker login"
    echo "Then run this script again to test pushing"
fi

# Step 4: Ask if user wants to push (only if logged in)
if docker info | grep -q "Username"; then
    echo ""
    echo "🚀 Do you want to push to Docker Hub? (y/n)"
    read -r PUSH_CHOICE
    
    if [ "$PUSH_CHOICE" = "y" ] || [ "$PUSH_CHOICE" = "Y" ]; then
        echo "📤 Pushing to Docker Hub..."
        
        # Push both versioned and latest tags
        docker push $IMAGE_NAME:$VERSION
        docker push $IMAGE_NAME:latest
        
        echo "✅ Successfully pushed to Docker Hub!"
        echo "🔗 Image available at: https://hub.docker.com/r/$DOCKER_USERNAME/blue-green-demo-app"
        
        # Test pulling the image
        echo "🔄 Testing pull from Docker Hub..."
        docker rmi $IMAGE_NAME:$VERSION $IMAGE_NAME:latest
        docker pull $IMAGE_NAME:latest
        
        echo "✅ Pull test successful!"
    else
        echo "⏭️  Skipping push to Docker Hub"
    fi
fi

echo ""
echo "🎉 Docker Hub integration test completed!"
echo ""
echo "📋 Summary:"
echo "  ✅ Image builds successfully"
echo "  ✅ Container runs and responds to health checks"
if docker info | grep -q "Username"; then
    echo "  ✅ Docker Hub authentication working"
    if [ "$PUSH_CHOICE" = "y" ] || [ "$PUSH_CHOICE" = "Y" ]; then
        echo "  ✅ Push and pull operations successful"
    fi
else
    echo "  ⚠️  Docker Hub authentication needed for push/pull"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Set up GitHub secrets (see DOCKER_HUB_SETUP.md)"
echo "2. Push to main branch to trigger GitHub Actions"
echo "3. Check Actions tab for workflow execution"

# Cleanup
docker rmi -f $IMAGE_NAME:$VERSION $IMAGE_NAME:latest 2>/dev/null || true
