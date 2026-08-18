#!/bin/bash

##############################################################################
# System Health Check Script
# Ministerial Command Center - República de Guinea Ecuatorial
#
# Purpose: Comprehensive health check for all system components
# Usage: ./health-check.sh [--remote]
# Options: --remote  Run on remote VPS via SSH
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_IP="72.61.41.94"
VPS_USER="root"
VPS_PASSWORD="NDSw222arle#"
REMOTE_MODE=false

if [ "$1" = "--remote" ]; then
    REMOTE_MODE=true
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SYSTEM HEALTH CHECK                  ║${NC}"
echo -e "${BLUE}║   Ministerial Command Center           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

if [ "$REMOTE_MODE" = true ]; then
    echo -e "${YELLOW}Running remote health check on ${VPS_IP}...${NC}"
    echo ""
fi

# Function to run command locally or remotely
run_cmd() {
    local cmd="$1"
    if [ "$REMOTE_MODE" = true ]; then
        if command -v sshpass &> /dev/null; then
            sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} "${cmd}"
        else
            echo "${VPS_PASSWORD}" | ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} "${cmd}"
        fi
    else
        eval "$cmd"
    fi
}

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to print check result
print_check() {
    local name="$1"
    local status="$2"
    local message="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    case $status in
        "PASS")
            echo -e "  ${GREEN}✓${NC} ${name}: ${GREEN}${message}${NC}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            echo -e "  ${RED}✗${NC} ${name}: ${RED}${message}${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "WARN")
            echo -e "  ${YELLOW}⚠${NC} ${name}: ${YELLOW}${message}${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            ;;
    esac
}

# 1. System Resources
echo -e "${BLUE}[1] System Resources${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check disk space
DISK_USAGE=$(run_cmd "df -h / | tail -1 | awk '{print \$5}' | sed 's/%//'")
if [ "$DISK_USAGE" -lt 80 ]; then
    print_check "Disk Space" "PASS" "${DISK_USAGE}% used"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_check "Disk Space" "WARN" "${DISK_USAGE}% used (consider cleanup)"
else
    print_check "Disk Space" "FAIL" "${DISK_USAGE}% used (critical)"
fi

# Check memory
MEM_AVAILABLE=$(run_cmd "free -m | grep Mem: | awk '{print \$7}'")
if [ "$MEM_AVAILABLE" -gt 200 ]; then
    print_check "Memory" "PASS" "${MEM_AVAILABLE}MB available"
elif [ "$MEM_AVAILABLE" -gt 100 ]; then
    print_check "Memory" "WARN" "${MEM_AVAILABLE}MB available"
else
    print_check "Memory" "FAIL" "${MEM_AVAILABLE}MB available (low memory)"
fi

# Check CPU load
CPU_LOAD=$(run_cmd "uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//'")
print_check "CPU Load" "PASS" "${CPU_LOAD} (1-min average)"

echo ""

# 2. Service Status
echo -e "${BLUE}[2] Service Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# PostgreSQL
if run_cmd "systemctl is-active postgresql --quiet"; then
    print_check "PostgreSQL" "PASS" "Service running"
else
    print_check "PostgreSQL" "FAIL" "Service not running"
fi

# Nginx
if run_cmd "systemctl is-active nginx --quiet"; then
    print_check "Nginx" "PASS" "Service running"
else
    print_check "Nginx" "FAIL" "Service not running"
fi

# PM2
if run_cmd "pm2 list | grep -q ministerial-api"; then
    PM2_STATUS=$(run_cmd "pm2 list | grep ministerial-api | awk '{print \$10}'")
    if [ "$PM2_STATUS" = "online" ]; then
        print_check "PM2 Backend" "PASS" "Process online"
    else
        print_check "PM2 Backend" "FAIL" "Process status: ${PM2_STATUS}"
    fi
else
    print_check "PM2 Backend" "FAIL" "Process not found"
fi

echo ""

# 3. Application Health
echo -e "${BLUE}[3] Application Health${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# API Health endpoint
if [ "$REMOTE_MODE" = true ]; then
    API_URL="http://localhost:3000/api/health"
    HTTP_CODE=$(run_cmd "curl -s -o /dev/null -w '%{http_code}' ${API_URL}")
else
    API_URL="http://localhost:3000/api/health"
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${API_URL} 2>/dev/null || echo "000")
fi

if [ "$HTTP_CODE" = "200" ]; then
    print_check "API Health" "PASS" "HTTP ${HTTP_CODE}"
elif [ "$HTTP_CODE" = "000" ]; then
    print_check "API Health" "FAIL" "Connection refused"
else
    print_check "API Health" "FAIL" "HTTP ${HTTP_CODE}"
fi

# Frontend
if [ "$REMOTE_MODE" = true ]; then
    FRONTEND_URL="http://localhost"
    FRONTEND_CODE=$(run_cmd "curl -s -o /dev/null -w '%{http_code}' ${FRONTEND_URL}")
else
    FRONTEND_URL="http://localhost"
    FRONTEND_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${FRONTEND_URL} 2>/dev/null || echo "000")
fi

if [ "$FRONTEND_CODE" = "200" ]; then
    print_check "Frontend" "PASS" "HTTP ${FRONTEND_CODE}"
elif [ "$FRONTEND_CODE" = "000" ]; then
    print_check "Frontend" "FAIL" "Connection refused"
else
    print_check "Frontend" "WARN" "HTTP ${FRONTEND_CODE}"
fi

echo ""

# 4. Database
echo -e "${BLUE}[4] Database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Database connection
DB_STATUS=$(run_cmd "psql -U ministerial_user -d ministerial_db -c 'SELECT 1;' 2>/dev/null && echo 'OK' || echo 'FAIL'")
if [ "$DB_STATUS" = "OK" ]; then
    print_check "DB Connection" "PASS" "Connected"
else
    print_check "DB Connection" "FAIL" "Cannot connect"
fi

# Database size
DB_SIZE=$(run_cmd "psql -U ministerial_user -d ministerial_db -t -c \"SELECT pg_size_pretty(pg_database_size('ministerial_db'));\" 2>/dev/null | xargs || echo 'N/A'")
print_check "DB Size" "PASS" "${DB_SIZE}"

echo ""

# 5. Backups
echo -e "${BLUE}[5] Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check last backup
LAST_BACKUP=$(run_cmd "ls -t /var/backups/postgresql/*.sql.gz 2>/dev/null | head -1 || echo 'none'")
if [ "$LAST_BACKUP" != "none" ]; then
    BACKUP_AGE=$(run_cmd "stat -c %Y ${LAST_BACKUP}")
    CURRENT_TIME=$(run_cmd "date +%s")
    AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))

    if [ "$AGE_HOURS" -lt 24 ]; then
        print_check "DB Backup" "PASS" "Last backup ${AGE_HOURS}h ago"
    elif [ "$AGE_HOURS" -lt 48 ]; then
        print_check "DB Backup" "WARN" "Last backup ${AGE_HOURS}h ago"
    else
        print_check "DB Backup" "FAIL" "Last backup ${AGE_HOURS}h ago (too old)"
    fi
else
    print_check "DB Backup" "FAIL" "No backups found"
fi

echo ""

# 6. Logs
echo -e "${BLUE}[6] Logs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for errors in last 100 lines
PM2_ERRORS=$(run_cmd "pm2 logs ministerial-api --lines 100 --nostream 2>/dev/null | grep -i error | wc -l || echo 0")
if [ "$PM2_ERRORS" -eq 0 ]; then
    print_check "PM2 Errors" "PASS" "No errors in last 100 lines"
elif [ "$PM2_ERRORS" -lt 5 ]; then
    print_check "PM2 Errors" "WARN" "${PM2_ERRORS} errors in last 100 lines"
else
    print_check "PM2 Errors" "FAIL" "${PM2_ERRORS} errors in last 100 lines"
fi

# Nginx errors
NGINX_ERRORS=$(run_cmd "tail -100 /var/log/nginx/error.log 2>/dev/null | grep -i error | wc -l || echo 0")
if [ "$NGINX_ERRORS" -eq 0 ]; then
    print_check "Nginx Errors" "PASS" "No errors in last 100 lines"
elif [ "$NGINX_ERRORS" -lt 5 ]; then
    print_check "Nginx Errors" "WARN" "${NGINX_ERRORS} errors in last 100 lines"
else
    print_check "Nginx Errors" "FAIL" "${NGINX_ERRORS} errors in last 100 lines"
fi

echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   HEALTH CHECK SUMMARY                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Checks:    ${TOTAL_CHECKS}"
echo -e "  ${GREEN}Passed:          ${PASSED_CHECKS}${NC}"
echo -e "  ${YELLOW}Warnings:        ${WARNING_CHECKS}${NC}"
echo -e "  ${RED}Failed:          ${FAILED_CHECKS}${NC}"
echo ""

# Overall status
if [ "$FAILED_CHECKS" -eq 0 ] && [ "$WARNING_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✓ Overall Status: HEALTHY${NC}"
    EXIT_CODE=0
elif [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${YELLOW}⚠ Overall Status: HEALTHY WITH WARNINGS${NC}"
    EXIT_CODE=1
else
    echo -e "${RED}✗ Overall Status: UNHEALTHY${NC}"
    EXIT_CODE=2
fi
echo ""

# Recommendations
if [ "$FAILED_CHECKS" -gt 0 ] || [ "$WARNING_CHECKS" -gt 0 ]; then
    echo -e "${YELLOW}Recommendations:${NC}"
    if [ "$DISK_USAGE" -gt 80 ]; then
        echo -e "  • Clean up disk space (currently ${DISK_USAGE}%)"
    fi
    if [ "$MEM_AVAILABLE" -lt 200 ]; then
        echo -e "  • Monitor memory usage (${MEM_AVAILABLE}MB available)"
    fi
    if [ "$PM2_ERRORS" -gt 0 ]; then
        echo -e "  • Review PM2 logs: pm2 logs ministerial-api"
    fi
    if [ "$NGINX_ERRORS" -gt 0 ]; then
        echo -e "  • Review Nginx logs: tail /var/log/nginx/error.log"
    fi
    echo ""
fi

exit $EXIT_CODE
