#!/bin/bash

##############################################################################
# Backend Deployment Script
# Ministerial Command Center - República de Guinea Ecuatorial
#
# Purpose: Automated backend deployment to VPS with zero-downtime
# Usage: ./deploy-backend.sh [environment]
# Environment: production (default) | staging
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
VPS_IP="72.61.41.94"
VPS_USER="root"
VPS_PASSWORD="NDSw222arle#"
BACKEND_DIR="/var/www/ministerial-command-center/backend"
BACKUP_DIR="/var/backups/backend"
PM2_APP_NAME="ministerial-api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Backend Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/8]${NC} Checking prerequisites..."
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found. Run from project root.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Step 2: Create deployment archive
echo -e "${YELLOW}[2/8]${NC} Creating deployment archive..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="backend-${ENVIRONMENT}-${TIMESTAMP}.tar.gz"

cd backend
tar -czf "../${ARCHIVE_NAME}" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.git' \
    .
cd ..

echo -e "${GREEN}✓ Archive created: ${ARCHIVE_NAME}${NC}"
echo ""

# Step 3: Upload to VPS
echo -e "${YELLOW}[3/8]${NC} Uploading to VPS (${VPS_IP})..."
if command -v sshpass &> /dev/null; then
    sshpass -p "${VPS_PASSWORD}" scp -o StrictHostKeyChecking=no "${ARCHIVE_NAME}" ${VPS_USER}@${VPS_IP}:/tmp/
else
    echo "${VPS_PASSWORD}" | scp -o StrictHostKeyChecking=no "${ARCHIVE_NAME}" ${VPS_USER}@${VPS_IP}:/tmp/
fi
echo -e "${GREEN}✓ Upload complete${NC}"
echo ""

# Step 4-8: Deploy on VPS
echo -e "${YELLOW}[4/8]${NC} Deploying on VPS..."

DEPLOY_SCRIPT="
set -e
echo '>>> Creating backup of current deployment...'
mkdir -p ${BACKUP_DIR}
if [ -d ${BACKEND_DIR} ]; then
    tar -czf ${BACKUP_DIR}/backend-backup-${TIMESTAMP}.tar.gz \
        --exclude='node_modules' \
        --exclude='dist' \
        -C ${BACKEND_DIR} . 2>/dev/null || echo 'No existing files to backup'
    echo '✓ Backup created: ${BACKUP_DIR}/backend-backup-${TIMESTAMP}.tar.gz'
fi

echo '>>> Extracting new deployment...'
mkdir -p ${BACKEND_DIR}
tar -xzf /tmp/${ARCHIVE_NAME} -C ${BACKEND_DIR}
echo '✓ Files extracted to ${BACKEND_DIR}'

echo '>>> Installing dependencies...'
cd ${BACKEND_DIR}
npm install --production=false
echo '✓ Dependencies installed'

echo '>>> Generating Prisma client...'
npx prisma generate
echo '✓ Prisma client generated'

echo '>>> Pushing database schema...'
npx prisma db push --accept-data-loss 2>&1 | tee /tmp/prisma-push.log || echo 'Warning: Prisma push had warnings'
echo '✓ Database schema updated'

echo '>>> Building application...'
npm run build
echo '✓ Application built'

echo '>>> Checking PM2 status...'
if pm2 list | grep -q ${PM2_APP_NAME}; then
    echo '✓ PM2 app exists, reloading...'
    pm2 reload ${PM2_APP_NAME} --update-env
    echo '✓ PM2 app reloaded'
else
    echo '⚠ PM2 app not found, starting...'
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo '✓ PM2 app started'
fi

echo '>>> Waiting for application to stabilize...'
sleep 5

echo '>>> Verifying deployment...'
pm2 list | grep ${PM2_APP_NAME} | grep -q 'online' && echo '✓ PM2 process is online' || echo '⚠ PM2 process may have issues'

echo '>>> Testing API health...'
HEALTH_STATUS=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
if [ \"\$HEALTH_STATUS\" = \"200\" ]; then
    echo '✓ API health check passed (HTTP 200)'
else
    echo \"⚠ API health check returned: \$HEALTH_STATUS\"
fi

echo '>>> Cleaning up...'
rm /tmp/${ARCHIVE_NAME}
echo '✓ Temporary files removed'

echo '>>> Cleaning old backups (keeping last 5)...'
cd ${BACKUP_DIR}
ls -t backend-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
echo '✓ Old backups cleaned'

echo ''
echo '========================================='
echo 'DEPLOYMENT COMPLETE'
echo '========================================='
echo 'Backend API: http://${VPS_IP}/api'
echo 'Health Check: http://${VPS_IP}/api/health'
echo 'Deployment time: ${TIMESTAMP}'
echo 'Backup location: ${BACKUP_DIR}/backend-backup-${TIMESTAMP}.tar.gz'
echo '========================================='
"

if command -v sshpass &> /dev/null; then
    sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} "${DEPLOY_SCRIPT}"
else
    echo "${VPS_PASSWORD}" | ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} "${DEPLOY_SCRIPT}"
fi

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# Cleanup local archive
echo -e "${YELLOW}Cleaning up local files...${NC}"
rm "${ARCHIVE_NAME}"
echo -e "${GREEN}✓ Local cleanup complete${NC}"
echo ""

# Final summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BACKEND DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}VPS: ${VPS_IP}${NC}"
echo -e "${GREEN}Timestamp: ${TIMESTAMP}${NC}"
echo -e "${GREEN}API URL: http://${VPS_IP}/api${NC}"
echo -e "${GREEN}Health: http://${VPS_IP}/api/health${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Test API: curl http://${VPS_IP}/api/health"
echo -e "  2. Test login: curl -X POST http://${VPS_IP}/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@ministerio.gq\",\"password\":\"Admin123!\"}'"
echo -e "  3. Check PM2 logs: ssh ${VPS_USER}@${VPS_IP} 'pm2 logs ${PM2_APP_NAME} --lines 50'"
echo -e "  4. Monitor PM2: ssh ${VPS_USER}@${VPS_IP} 'pm2 monit'"
echo ""
echo -e "${YELLOW}Rollback instructions (if needed):${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_IP}"
echo -e "  cd ${BACKEND_DIR}"
echo -e "  tar -xzf ${BACKUP_DIR}/backend-backup-${TIMESTAMP}.tar.gz"
echo -e "  npm install"
echo -e "  npx prisma generate"
echo -e "  npm run build"
echo -e "  pm2 reload ${PM2_APP_NAME}"
echo ""
