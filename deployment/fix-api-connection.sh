#!/bin/bash
# Fix API Connection Issue - Complete Deployment
# This script sets up Nginx reverse proxy and deploys the updated frontend

set -e

echo "=========================================="
echo "  Fixing API Connection Issue"
echo "=========================================="
echo ""
echo "Problem: Port 3000 not accessible from outside"
echo "Solution: Use Nginx reverse proxy on port 80"
echo ""

cd /var/www/ministerial-command-center

# Step 1: Setup Nginx
echo "[1/4] Setting up Nginx reverse proxy..."
chmod +x deployment/setup-nginx-proxy.sh
./deployment/setup-nginx-proxy.sh

# Step 2: Deploy frontend
echo ""
echo "[2/4] Deploying frontend..."
if [ -d "dist" ]; then
    rm -rf dist.old
    mv dist dist.old
fi
# Frontend files should already be uploaded to /tmp/dist-nginx.tar.gz
if [ -f "/tmp/dist-nginx.tar.gz" ]; then
    tar -xzf /tmp/dist-nginx.tar.gz
    echo "Frontend deployed successfully"
else
    echo "Warning: /tmp/dist-nginx.tar.gz not found. Please upload frontend build."
fi

# Step 3: Verify backend is running
echo ""
echo "[3/4] Verifying backend..."
if pm2 list | grep -q "ministerial-api.*online"; then
    echo "✅ Backend is running"
    pm2 list | grep ministerial-api
else
    echo "❌ Backend is not running. Starting..."
    cd backend
    pm2 start dist/main.js --name ministerial-api
    pm2 save
    cd ..
fi

# Step 4: Test the setup
echo ""
echo "[4/4] Testing the setup..."
sleep 2

echo "Testing backend (localhost)..."
curl -s http://localhost:3000/api/health | head -5 && echo "✅ Backend OK" || echo "❌ Backend failed"

echo ""
echo "Testing API proxy..."
curl -s http://localhost/api/health | head -5 && echo "✅ API proxy OK" || echo "❌ API proxy failed"

echo ""
echo "=========================================="
echo "  ✅ API Connection Fix Complete!"
echo "=========================================="
echo ""
echo "Access the application:"
echo "  Frontend: http://72.61.41.94"
echo "  API: http://72.61.41.94/api"
echo ""
echo "Test login:"
echo "  http://72.61.41.94/login"
echo "  Email: admin@mttsia.gob.gq"
echo "  Password: Admin123!"
echo ""
