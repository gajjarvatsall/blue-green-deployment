# Docker Hub Setup for GitHub Actions

## 🐋 Setting up Docker Hub Integration

To use Docker Hub as your container registry, you need to set up the following secrets in your GitHub repository.

### Step 1: Create Docker Hub Account & Access Token

1. **Go to [Docker Hub](https://hub.docker.com/)**
2. **Sign in or create an account**
3. **Go to Account Settings → Security**
4. **Click "New Access Token"**
5. **Create a token with name**: `github-actions`
6. **Copy the access token** (you won't see it again!)

### Step 2: Add Secrets to GitHub Repository

1. **Go to your GitHub repository**
2. **Settings → Secrets and variables → Actions**
3. **Click "New repository secret"**
4. **Add these two secrets:**

#### Secret 1: DOCKER_USERNAME

- **Name**: `DOCKER_USERNAME`
- **Value**: Your Docker Hub username (e.g., `gajjarvatsall`)

#### Secret 2: DOCKER_PASSWORD

- **Name**: `DOCKER_PASSWORD`
- **Value**: The access token you created in Step 1

### Step 3: Repository Naming

Your Docker images will be pushed to:

```
docker.io/gajjarvatsall/blue-green-demo-app:latest
docker.io/gajjarvatsall/blue-green-demo-app:main
docker.io/gajjarvatsall/blue-green-demo-app:sha-abc1234
```

### Step 4: Verify Setup

You can test the setup by:

1. **Push to main branch** - this will trigger the workflow
2. **Check Actions tab** in your GitHub repository
3. **Verify image appears** in your Docker Hub repository

### Alternative: Use GitHub Username

If you want to use a different Docker Hub username, update the workflow file:

```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-dockerhub-username/blue-green-demo-app # Change this
  CLUSTER_NAME: blue-green-cluster
```

### Testing Locally

You can also test the Docker build locally:

```bash
# Build the image
docker build -t gajjarvatsall/blue-green-demo-app:test .

# Test the image
docker run -p 3000:3000 gajjarvatsall/blue-green-demo-app:test

# Push to Docker Hub (after docker login)
docker login
docker push gajjarvatsall/blue-green-demo-app:test
```

## 🔧 Troubleshooting

### Issue: "unauthorized: authentication required"

- **Solution**: Check that your Docker Hub secrets are set correctly
- **Verify**: Username and access token are valid

### Issue: "repository does not exist"

- **Solution**: The repository will be created automatically on first push
- **Note**: Make sure your Docker Hub username is correct

### Issue: "denied: requested access to the resource is denied"

- **Solution**: Ensure the access token has write permissions
- **Check**: Token was created with appropriate scope

## 🎯 Benefits of Docker Hub

✅ **Public registry** - no permission issues like GHCR  
✅ **Reliable** - industry standard registry  
✅ **Free tier** - sufficient for most projects  
✅ **Easy integration** - works seamlessly with GitHub Actions  
✅ **Global CDN** - fast image pulls worldwide

Your blue-green deployment workflow is now configured to use Docker Hub! 🚀
