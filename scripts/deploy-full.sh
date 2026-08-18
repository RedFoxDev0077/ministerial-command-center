#!/bin/bash

##############################################################################
# Full System Deployment Script
# Ministerial Command Center - República de Guinea Ecuatorial
#
# Purpose: Complete deployment of frontend + backend to VPS
# Usage: ./deploy-full.sh [environment]
# Environment: production (default) | staging
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   FULL SYSTEM DEPLOYMENT               ║${NC}"
echo -e "${CYAN}║   Ministerial Command Center           ║${NC}"
echo -e "${CYAN}║   Environment: ${ENVIRONMENT}                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${BLUE}>>> Pre-flight checks...${NC}"
if [ ! -f "${SCRIPT_DIR}/deploy-backend.sh" ]; then
    echo -e "${RED}Error: deploy-backend.sh not found${NC}"
    exit 1
fi
if [ ! -f "${SCRIPT_DIR}/deploy-frontend.sh" ]; then
    echo -e "${RED}Error: deploy-frontend.sh not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Deployment scripts found${NC}"
echo ""

# Make scripts executable
chmod +x "${SCRIPT_DIR}/deploy-backend.sh"
chmod +x "${SCRIPT_DIR}/deploy-frontend.sh"

# Confirmation prompt
echo -e "${YELLOW}⚠  WARNING: This will deploy to PRODUCTION VPS (72.61.41.94)${NC}"
echo -e "${YELLOW}   This will:${NC}"
echo -e "${YELLOW}   1. Build and deploy backend${NC}"
echo -e "${YELLOW}   2. Build and deploy frontend${NC}"
echo -e "${YELLOW}   3. Reload all services${NC}"
echo ""
read -p "Continue with deployment? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi
echo ""

# Start deployment
DEPLOYMENT_START=$(date +%s)

# Step 1: Deploy Backend
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 1/2: BACKEND DEPLOYMENT${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"
"${SCRIPT_DIR}/deploy-backend.sh" "$ENVIRONMENT"

if [ $? -ne 0 ]; then
    echo -e "${RED}Backend deployment failed!${NC}"
    echo -e "${RED}Aborting full deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend deployment successful${NC}"
echo ""
sleep 2

# Step 2: Deploy Frontend
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 2/2: FRONTEND DEPLOYMENT${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

"${SCRIPT_DIR}/deploy-frontend.sh" "$ENVIRONMENT"

if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend deployment failed!${NC}"
    echo -e "${YELLOW}Note: Backend was deployed successfully.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend deployment successful${NC}"
echo ""

# Calculate deployment time
DEPLOYMENT_END=$(date +%s)
DEPLOYMENT_DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))
MINUTES=$((DEPLOYMENT_DURATION / 60))
SECONDS=$((DEPLOYMENT_DURATION % 60))

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   DEPLOYMENT COMPLETED SUCCESSFULLY    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Deployment Summary:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Environment:  ${ENVIRONMENT}"
echo -e "  VPS:          72.61.41.94"
echo -e "  Duration:     ${MINUTES}m ${SECONDS}s"
echo -e "  Timestamp:    $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Access Points:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Frontend:     http://72.61.41.94"
echo -e "  API:          http://72.61.41.94/api"
echo -e "  Health:       http://72.61.41.94/api/health"
echo -e "  API Docs:     http://72.61.41.94/api/docs"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Verification Steps:${NC}"
echo -e "  1. Test health endpoint:"
echo -e "     ${YELLOW}curl http://72.61.41.94/api/health${NC}"
echo ""
echo -e "  2. Test login:"
echo -e "     ${YELLOW}curl -X POST http://72.61.41.94/api/auth/login \\${NC}"
echo -e "     ${YELLOW}  -H 'Content-Type: application/json' \\${NC}"
echo -e "     ${YELLOW}  -d '{\"email\":\"admin@ministerio.gq\",\"password\":\"Admin123!\"}'${NC}"
echo ""
echo -e "  3. Open in browser:"
echo -e "     ${YELLOW}http://72.61.41.94${NC}"
echo ""
echo -e "  4. Monitor logs:"
echo -e "     ${YELLOW}ssh root@72.61.41.94${NC}"
echo -e "     ${YELLOW}pm2 logs ministerial-api${NC}"
echo ""
echo -e "${GREEN}✓ Full system deployment complete!${NC}"
echo ""
