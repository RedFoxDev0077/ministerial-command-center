#!/bin/bash
# Backend Deployment Script
# Run this in /var/www/ministerial-command-center

set -e

echo "=========================================="
echo "  Deploying Backend API"
echo "=========================================="

cd /var/www/ministerial-command-center/backend

# Install dependencies
echo "[1/7] Installing dependencies..."
npm install

# Create .env file (you need to edit this with actual values)
echo "[2/7] Creating .env file..."
cat > .env <<'EOF'
DATABASE_URL="postgresql://ministerial_user:Ministerial_Strong_Pass_2024!@localhost:5432/ministerial_command_center?schema=public"

# Generate these with: openssl rand -hex 64
JWT_SECRET="REPLACE_WITH_GENERATED_JWT_SECRET_FROM_SETUP"
JWT_REFRESH_SECRET="REPLACE_WITH_GENERATED_JWT_REFRESH_SECRET_FROM_SETUP"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

NODE_ENV="production"
PORT=3000
CORS_ORIGIN="http://72.61.41.94,https://72.61.41.94"

BCRYPT_ROUNDS=10
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
EOF

echo ""
echo "⚠️  IMPORTANT: Edit /var/www/ministerial-command-center/backend/.env"
echo "   Replace JWT_SECRET and JWT_REFRESH_SECRET with values from setup-vps.sh"
echo ""
read -p "Press Enter after editing .env file..."

# Generate Prisma Client
echo "[3/7] Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "[4/7] Running database migrations..."
npx prisma migrate deploy

# Seed database
echo "[5/7] Seeding database with MTTSIA data..."
npx prisma db seed

# Build backend
echo "[6/7] Building backend..."
npm run build

# Start with PM2
echo "[7/7] Starting backend with PM2..."
pm2 stop ministerial-api 2>/dev/null || true
pm2 delete ministerial-api 2>/dev/null || true
pm2 start dist/main.js --name ministerial-api
pm2 save

echo ""
echo "✓ Backend deployed successfully!"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs ministerial-api"
echo "Test API: curl http://localhost:3000/api/health"
echo ""
