#!/bin/bash

# Deploy script for clustered NestJS application
set -e

echo "🚀 Deploying NestJS application with clustering..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build and start the clustered application
echo "🔨 Building and starting clustered application..."
docker-compose down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 20

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "⏳ Attempt $attempt/$max_attempts - Backend not ready yet..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start within expected time"
    echo "📋 Checking logs..."
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

# Performance test
echo "🧪 Running quick performance test..."
if command -v node &> /dev/null; then
    node performance-test.js
else
    echo "⚠️  Node.js not found, skipping performance test"
fi

echo "✅ Deployment complete! Your clustered application is running on port 3000"
echo "🌐 Access your API at: http://localhost:3000"
echo "📚 API Documentation at: http://localhost:3000/api"
echo "🏥 Health Check at: http://localhost:3000/health"
echo ""
echo "🔍 To monitor clustering:"
echo "   docker-compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "📊 To run performance tests:"
echo "   node performance-test.js"
echo "   node quick-test.js"
echo "   node load-test.js"
