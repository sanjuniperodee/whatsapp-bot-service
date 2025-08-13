#!/bin/bash

# Deploy script for clustered NestJS application
set -e

echo "🚀 Deploying NestJS application with clustering..."

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
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "✅ Deployment complete! Your clustered application is running on port 3000"
echo "🌐 Access your API at: http://localhost:3000"
echo "📚 API Documentation at: http://localhost:3000/api"
echo ""
echo "🔍 To monitor clustering:"
echo "   docker-compose -f docker-compose.prod.yml logs -f backend"
