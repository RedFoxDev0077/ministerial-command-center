#!/bin/bash

##############################################################################
# Backup Verification Script
# Ministerial Command Center - República de Guinea Ecuatorial
#
# Purpose: Verify database and file backups are working correctly
# Usage: ./verify-backups.sh [--restore-test]
# Options: --restore-test  Perform actual restore test (caution!)
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/postgresql"
FRONTEND_BACKUP_DIR="/var/backups/frontend"
BACKEND_BACKUP_DIR="/var/backups/backend"
RESTORE_TEST=false

if [ "$1" = "--restore-test" ]; then
    RESTORE_TEST=true
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BACKUP VERIFICATION                  ║${NC}"
echo -e "${BLUE}║   Ministerial Command Center           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

print_check() {
    local name="$1"
    local status="$2"
    local message="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    case $status in
        "PASS")
            echo -e "  ${GREEN}✓${NC} ${name}: ${message}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            echo -e "  ${RED}✗${NC} ${name}: ${message}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
    esac
}

# 1. Database Backups
echo -e "${BLUE}[1] Database Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check backup directory exists
if [ -d "$BACKUP_DIR" ]; then
    print_check "Backup Directory" "PASS" "Exists at ${BACKUP_DIR}"
else
    print_check "Backup Directory" "FAIL" "Not found at ${BACKUP_DIR}"
fi

# Check for recent backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/*.sql.gz 2>/dev/null | head -1 || echo "")
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_FILE=$(basename "$LATEST_BACKUP")
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | awk '{print $1}')
    BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
    CURRENT_TIME=$(date +%s)
    AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))

    print_check "Latest Backup" "PASS" "${BACKUP_FILE} (${BACKUP_SIZE}, ${AGE_HOURS}h ago)"

    # Check backup size
    BACKUP_SIZE_BYTES=$(stat -c %s "$LATEST_BACKUP")
    if [ "$BACKUP_SIZE_BYTES" -gt 1000 ]; then
        print_check "Backup Size" "PASS" "${BACKUP_SIZE} (valid size)"
    else
        print_check "Backup Size" "FAIL" "${BACKUP_SIZE} (too small, possibly corrupt)"
    fi

    # Check backup is not corrupted (gzip integrity)
    if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
        print_check "Backup Integrity" "PASS" "Gzip file is valid"
    else
        print_check "Backup Integrity" "FAIL" "Gzip file may be corrupted"
    fi

    # Count backups
    BACKUP_COUNT=$(ls ${BACKUP_DIR}/*.sql.gz 2>/dev/null | wc -l || echo 0)
    if [ "$BACKUP_COUNT" -ge 7 ]; then
        print_check "Backup Retention" "PASS" "${BACKUP_COUNT} backups (7+ days)"
    elif [ "$BACKUP_COUNT" -ge 3 ]; then
        print_check "Backup Retention" "PASS" "${BACKUP_COUNT} backups"
    else
        print_check "Backup Retention" "FAIL" "Only ${BACKUP_COUNT} backups (need 7+)"
    fi
else
    print_check "Latest Backup" "FAIL" "No backups found"
fi

echo ""

# 2. Restore Test (if enabled)
if [ "$RESTORE_TEST" = true ]; then
    echo -e "${BLUE}[2] Restore Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠  WARNING: This will create a temporary test database${NC}"
    echo -e "${YELLOW}   Original database will NOT be affected${NC}"
    echo ""

    if [ -n "$LATEST_BACKUP" ]; then
        TEST_DB="ministerial_db_restore_test"

        echo "Creating test database..."
        psql -U ministerial_user -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null || true
        psql -U ministerial_user -c "CREATE DATABASE ${TEST_DB};" 2>/dev/null

        echo "Restoring backup to test database..."
        gunzip -c "$LATEST_BACKUP" | psql -U ministerial_user -d ${TEST_DB} > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            print_check "Restore Test" "PASS" "Successfully restored to ${TEST_DB}"

            # Verify tables exist
            TABLE_COUNT=$(psql -U ministerial_user -d ${TEST_DB} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
            print_check "Table Count" "PASS" "${TABLE_COUNT} tables restored"

            # Check sample data
            USER_COUNT=$(psql -U ministerial_user -d ${TEST_DB} -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs || echo 0)
            DOC_COUNT=$(psql -U ministerial_user -d ${TEST_DB} -t -c "SELECT COUNT(*) FROM \"Document\";" 2>/dev/null | xargs || echo 0)
            echo -e "  ${BLUE}ℹ${NC} Sample Data: ${USER_COUNT} users, ${DOC_COUNT} documents"
        else
            print_check "Restore Test" "FAIL" "Restore failed"
        fi

        # Cleanup
        echo "Cleaning up test database..."
        psql -U ministerial_user -c "DROP DATABASE ${TEST_DB};" 2>/dev/null
        echo -e "${GREEN}✓ Test database removed${NC}"
    else
        print_check "Restore Test" "FAIL" "No backup to test"
    fi

    echo ""
fi

# 3. Frontend Backups
echo -e "${BLUE}[3] Frontend Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "$FRONTEND_BACKUP_DIR" ]; then
    FRONTEND_BACKUPS=$(ls -t ${FRONTEND_BACKUP_DIR}/frontend-backup-*.tar.gz 2>/dev/null | wc -l || echo 0)
    if [ "$FRONTEND_BACKUPS" -gt 0 ]; then
        LATEST_FRONTEND=$(ls -t ${FRONTEND_BACKUP_DIR}/frontend-backup-*.tar.gz 2>/dev/null | head -1)
        FRONTEND_SIZE=$(du -h "$LATEST_FRONTEND" | awk '{print $1}')
        print_check "Frontend Backups" "PASS" "${FRONTEND_BACKUPS} backups (latest: ${FRONTEND_SIZE})"
    else
        print_check "Frontend Backups" "FAIL" "No frontend backups found"
    fi
else
    print_check "Frontend Backups" "FAIL" "Backup directory not found"
fi

echo ""

# 4. Backend Backups
echo -e "${BLUE}[4] Backend Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "$BACKEND_BACKUP_DIR" ]; then
    BACKEND_BACKUPS=$(ls -t ${BACKEND_BACKUP_DIR}/backend-backup-*.tar.gz 2>/dev/null | wc -l || echo 0)
    if [ "$BACKEND_BACKUPS" -gt 0 ]; then
        LATEST_BACKEND=$(ls -t ${BACKEND_BACKUP_DIR}/backend-backup-*.tar.gz 2>/dev/null | head -1)
        BACKEND_SIZE=$(du -h "$LATEST_BACKEND" | awk '{print $1}')
        print_check "Backend Backups" "PASS" "${BACKEND_BACKUPS} backups (latest: ${BACKEND_SIZE})"
    else
        print_check "Backend Backups" "FAIL" "No backend backups found"
    fi
else
    print_check "Backend Backups" "FAIL" "Backup directory not found"
fi

echo ""

# 5. Backup Schedule
echo -e "${BLUE}[5] Backup Schedule${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check cron job exists
if crontab -l 2>/dev/null | grep -q "backup.*postgresql"; then
    CRON_SCHEDULE=$(crontab -l | grep "backup.*postgresql" | grep -v '^#' | head -1 | awk '{print $1,$2,$3,$4,$5}')
    print_check "Cron Schedule" "PASS" "Configured (${CRON_SCHEDULE})"
else
    print_check "Cron Schedule" "FAIL" "No cron job found for database backup"
fi

echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   VERIFICATION SUMMARY                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Checks:    ${TOTAL_CHECKS}"
echo -e "  ${GREEN}Passed:          ${PASSED_CHECKS}${NC}"
echo -e "  ${RED}Failed:          ${FAILED_CHECKS}${NC}"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✓ Backup System: HEALTHY${NC}"
    echo ""
    echo -e "${BLUE}Backup Summary:${NC}"
    echo -e "  Database Backups:  ${BACKUP_COUNT:-0} files"
    echo -e "  Frontend Backups:  ${FRONTEND_BACKUPS:-0} files"
    echo -e "  Backend Backups:   ${BACKEND_BACKUPS:-0} files"
    echo -e "  Latest DB Backup:  ${AGE_HOURS:-N/A} hours ago"
    EXIT_CODE=0
else
    echo -e "${RED}✗ Backup System: ISSUES DETECTED${NC}"
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "  • Configure automated database backups"
        echo -e "    See: SYSTEM_MAINTENANCE_GUIDE.md § Backup Configuration"
    fi
    if [ "$BACKUP_COUNT" -lt 7 ]; then
        echo -e "  • Ensure backups run daily to maintain 7-day retention"
    fi
    if ! crontab -l 2>/dev/null | grep -q "backup.*postgresql"; then
        echo -e "  • Set up cron job for automated backups"
    fi
    EXIT_CODE=1
fi

echo ""

if [ "$RESTORE_TEST" = false ]; then
    echo -e "${YELLOW}Tip: Run with --restore-test to verify backup restore capability${NC}"
    echo ""
fi

exit $EXIT_CODE
