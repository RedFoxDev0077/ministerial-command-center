#!/bin/bash
# Update Deployment Script
# Run this on the VPS to update the application with latest changes

set -e

echo "=========================================="
echo "  Updating Ministerial Command Center"
echo "=========================================="

cd /var/www/ministerial-command-center

echo ""
echo "[1/8] Pulling latest changes from Git..."
git pull origin main

echo ""
echo "[2/8] Installing backend dependencies..."
cd backend
npm install

echo ""
echo "[3/8] Generating Prisma Client..."
npx prisma generate

echo ""
echo "[4/8] Running database migrations..."
npx prisma migrate deploy

echo ""
echo "[5/8] Seeding government structure data..."
npx prisma db seed

echo ""
echo "[6/8] Building backend..."
npm run build

echo ""
echo "[7/8] Restarting backend with PM2..."
pm2 restart ministerial-api
pm2 save

echo ""
echo "[8/8] Building and deploying frontend..."
cd ../
npm install
npm run build

echo ""
echo "=========================================="
echo "  ✅ DEPLOYMENT UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Status:"
pm2 status

echo ""
echo "🔍 Test the application:"
echo "   Frontend: http://72.61.41.94"
echo "   Backend API: http://72.61.41.94:3000/api"
echo "   API Docs: http://72.61.41.94:3000/api"
echo ""
echo "📝 View logs:"
echo "   Backend: pm2 logs ministerial-api"
echo ""
