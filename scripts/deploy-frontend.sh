#!/bin/bash

##############################################################################
# Frontend Deployment Script
# Ministerial Command Center - República de Guinea Ecuatorial
#
# Purpose: Automated frontend build and deployment to VPS
# Usage: ./deploy-frontend.sh [environment]
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
FRONTEND_DIR="/var/www/ministerial-command-center"
BACKUP_DIR="/var/backups/frontend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Frontend Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/7]${NC} Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}Warning: sshpass not installed. Install with: apt install sshpass${NC}"
    echo -e "${YELLOW}Using password echo method instead...${NC}"
fi
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Step 2: Clean previous build
echo -e "${YELLOW}[2/7]${NC} Cleaning previous build..."
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}✓ Cleaned dist directory${NC}"
else
    echo -e "${GREEN}✓ No previous build to clean${NC}"
fi
echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}[3/7]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Build frontend
echo -e "${YELLOW}[4/7]${NC} Building frontend (${ENVIRONMENT})..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build
else
    npm run build -- --mode staging
fi
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 5: Create deployment archive
echo -e "${YELLOW}[5/7]${NC} Creating deployment archive..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="frontend-${ENVIRONMENT}-${TIMESTAMP}.tar.gz"
tar -czf "${ARCHIVE_NAME}" -C dist .
echo -e "${GREEN}✓ Archive created: ${ARCHIVE_NAME}${NC}"
echo ""

# Step 6: Upload to VPS
echo -e "${YELLOW}[6/7]${NC} Uploading to VPS (${VPS_IP})..."
if command -v sshpass &> /dev/null; then
    sshpass -p "${VPS_PASSWORD}" scp -o StrictHostKeyChecking=no "${ARCHIVE_NAME}" ${VPS_USER}@${VPS_IP}:/tmp/
else
    echo "${VPS_PASSWORD}" | scp -o StrictHostKeyChecking=no "${ARCHIVE_NAME}" ${VPS_USER}@${VPS_IP}:/tmp/
fi
echo -e "${GREEN}✓ Upload complete${NC}"
echo ""

# Step 7: Deploy on VPS
echo -e "${YELLOW}[7/7]${NC} Deploying on VPS..."

DEPLOY_SCRIPT="
set -e
echo '>>> Creating backup of current deployment...'
mkdir -p ${BACKUP_DIR}
if [ -d ${FRONTEND_DIR} ]; then
    tar -czf ${BACKUP_DIR}/frontend-backup-${TIMESTAMP}.tar.gz -C ${FRONTEND_DIR} . 2>/dev/null || echo 'No existing files to backup'
    echo '✓ Backup created: ${BACKUP_DIR}/frontend-backup-${TIMESTAMP}.tar.gz'
fi

echo '>>> Extracting new deployment...'
mkdir -p ${FRONTEND_DIR}
tar -xzf /tmp/${ARCHIVE_NAME} -C ${FRONTEND_DIR}
echo '✓ Files extracted to ${FRONTEND_DIR}'

echo '>>> Setting permissions...'
chown -R www-data:www-data ${FRONTEND_DIR}
chmod -R 755 ${FRONTEND_DIR}
echo '✓ Permissions set'

echo '>>> Cleaning up...'
rm /tmp/${ARCHIVE_NAME}
echo '✓ Temporary files removed'

echo '>>> Testing Nginx configuration...'
nginx -t
echo '✓ Nginx configuration valid'

echo '>>> Reloading Nginx...'
systemctl reload nginx
echo '✓ Nginx reloaded'

echo '>>> Verifying deployment...'
curl -s -o /dev/null -w '%{http_code}' http://localhost | grep -q '200' && echo '✓ Frontend is responding (HTTP 200)' || echo '⚠ Frontend health check failed'

echo '>>> Cleaning old backups (keeping last 5)...'
cd ${BACKUP_DIR}
ls -t frontend-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
echo '✓ Old backups cleaned'

echo ''
echo '========================================='
echo 'DEPLOYMENT COMPLETE'
echo '========================================='
echo 'Frontend URL: http://${VPS_IP}'
echo 'Deployment time: ${TIMESTAMP}'
echo 'Backup location: ${BACKUP_DIR}/frontend-backup-${TIMESTAMP}.tar.gz'
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
echo -e "${GREEN}FRONTEND DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}VPS: ${VPS_IP}${NC}"
echo -e "${GREEN}Timestamp: ${TIMESTAMP}${NC}"
echo -e "${GREEN}URL: http://${VPS_IP}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Visit http://${VPS_IP} to verify deployment"
echo -e "  2. Test login functionality"
echo -e "  3. Check browser console for errors (F12)"
echo -e "  4. Monitor logs: ssh ${VPS_USER}@${VPS_IP} 'tail -f /var/log/nginx/error.log'"
echo ""
echo -e "${YELLOW}Rollback instructions (if needed):${NC}"
echo -e "  ssh ${VPS_USER}@${VPS_IP}"
echo -e "  cd ${FRONTEND_DIR}"
echo -e "  tar -xzf ${BACKUP_DIR}/frontend-backup-${TIMESTAMP}.tar.gz"
echo -e "  systemctl reload nginx"
echo ""
