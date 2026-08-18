# Automation Scripts
## Ministerial Command Center - República de Guinea Ecuatorial

This directory contains automation scripts for deployment, monitoring, and maintenance.

---

## 📋 Available Scripts

### Deployment Scripts

#### 1. `deploy-full.sh`
**Purpose**: Complete deployment of frontend + backend to production VPS

**Usage**:
```bash
./deploy-full.sh [environment]
```

**What it does**:
- Deploys backend (build, install deps, restart PM2)
- Deploys frontend (build, upload, extract)
- Creates backups before deployment
- Verifies deployment success

**Duration**: ~5-10 minutes

---

#### 2. `deploy-backend.sh`
**Purpose**: Deploy only the backend API

**Usage**:
```bash
./deploy-backend.sh [environment]
```

**What it does**:
- Creates deployment archive (excludes node_modules, .env)
- Uploads to VPS
- Installs dependencies
- Runs Prisma migrations
- Builds application
- Reloads PM2 with zero downtime
- Creates backup before deployment

**Duration**: ~3-5 minutes

---

#### 3. `deploy-frontend.sh`
**Purpose**: Deploy only the frontend

**Usage**:
```bash
./deploy-frontend.sh [environment]
```

**What it does**:
- Builds production frontend
- Creates deployment archive
- Uploads to VPS
- Extracts to web directory
- Reloads Nginx
- Creates backup before deployment

**Duration**: ~2-3 minutes

---

### Monitoring Scripts

#### 4. `health-check.sh`
**Purpose**: Comprehensive health check of all system components

**Usage**:
```bash
# Local check
./health-check.sh

# Remote check via SSH
./health-check.sh --remote
```

**What it checks**:
- ✅ System resources (disk, memory, CPU)
- ✅ Service status (PostgreSQL, Nginx, PM2)
- ✅ Application health (API, Frontend)
- ✅ Database connection and size
- ✅ Backup age and status
- ✅ Error logs (PM2, Nginx)

**Exit Codes**:
- `0` = All checks passed (HEALTHY)
- `1` = Passed with warnings
- `2` = Failed checks (UNHEALTHY)

**Duration**: ~10-30 seconds

---

### Backup Scripts

#### 5. `verify-backups.sh`
**Purpose**: Verify backup integrity and restoration capability

**Usage**:
```bash
# Basic verification
./verify-backups.sh

# Full restore test (creates temporary DB)
./verify-backups.sh --restore-test
```

**What it checks**:
- ✅ Database backup exists and is recent
- ✅ Backup file integrity (gzip test)
- ✅ Backup size is valid
- ✅ Retention policy (7+ days)
- ✅ Frontend/backend backups
- ✅ Cron schedule configured
- ✅ Restore test (optional)

**Duration**: ~5-30 seconds (5 min with --restore-test)

---

## 🚀 Quick Start

### First Time Setup

```bash
# Navigate to scripts directory
cd ministerial-command-center/scripts

# Make scripts executable
chmod +x *.sh

# Install sshpass (optional, for easier remote access)
# Ubuntu/Debian:
sudo apt install sshpass

# macOS:
brew install hudochenkov/sshpass/sshpass
```

---

## 📖 Common Workflows

### Full Production Deployment

```bash
# From project root
cd ministerial-command-center

# Run full deployment
./scripts/deploy-full.sh production

# Verify deployment
./scripts/health-check.sh --remote

# Test application
curl http://72.61.41.94/api/health
```

---

### Update Only Backend

```bash
# Make backend changes
cd backend
# ... edit files ...

# Deploy backend only
cd ..
./scripts/deploy-backend.sh production

# Verify
./scripts/health-check.sh --remote
```

---

### Update Only Frontend

```bash
# Make frontend changes
cd src
# ... edit files ...

# Deploy frontend only
cd ..
./scripts/deploy-frontend.sh production

# Verify in browser
open http://72.61.41.94
```

---

### Daily Health Check

```bash
# Run health check
./scripts/health-check.sh --remote

# If issues found, check logs
ssh root@72.61.41.94
pm2 logs ministerial-api --lines 100
tail -f /var/log/nginx/error.log
```

---

### Weekly Backup Verification

```bash
# Basic verification
./scripts/verify-backups.sh

# Full restore test (recommended monthly)
./scripts/verify-backups.sh --restore-test
```

---

## 🔐 Credentials

**Never hardcode credentials in these scripts or in this file** — this directory
is committed to git, so anything written here is permanently disclosed to
everyone with repository access.

All scripts read connection details from the environment:

```bash
export VPS_IP="<server ip>"
export VPS_USER="<deploy user>"
# Optional. Omit entirely when using SSH keys (recommended).
export VPS_PASSWORD="<password>"
```

Keep these in a **gitignored** file (e.g. `.env.deploy`) and `source` it:

```bash
source .env.deploy && ./scripts/deploy-backend.sh
```

**Recommended hardening**:
1. Use SSH keys instead of a password — `ssh-copy-id $VPS_USER@$VPS_IP`, then
   leave `VPS_PASSWORD` unset. The scripts fall back to key auth automatically.
2. Create a dedicated deployment user instead of deploying as `root`.
3. Rotate any credential that has ever been committed to git — removing it from
   the working tree does not remove it from history.

---

## 📊 Script Dependencies

### Required Tools

All scripts require:
- `bash` (version 4.0+)
- `ssh` (OpenSSH client)
- `curl` (for health checks)

### Optional Tools

For better experience:
- `sshpass` - Automates password entry for SSH/SCP
  - Without it, you'll need to enter password manually
  - Scripts work either way

### Remote VPS Requirements

The VPS must have:
- Ubuntu 22.04 LTS
- Node.js 20+
- PostgreSQL 15+
- Nginx
- PM2
- systemd (for service checks)

---

## 🐛 Troubleshooting

### "Permission denied" when running scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### "sshpass: command not found"

**Option 1**: Install sshpass
```bash
# Ubuntu/Debian
sudo apt install sshpass

# macOS
brew install hudochenkov/sshpass/sshpass
```

**Option 2**: Scripts will work without sshpass (password prompt will appear)

### Deployment fails with "tar: ... : Cannot open: Permission denied"

```bash
# Ensure you have write permissions in project directory
ls -la

# If needed, fix permissions
sudo chown -R $USER:$USER .
```

### Health check shows "Connection refused"

1. Verify VPS is accessible:
```bash
ping 72.61.41.94
```

2. Check SSH access:
```bash
ssh root@72.61.41.94
```

3. Verify services on VPS:
```bash
ssh root@72.61.41.94
systemctl status postgresql
systemctl status nginx
pm2 status
```

---

## 📝 Script Output

### Success Example

```
╔════════════════════════════════════════╗
║   FULL SYSTEM DEPLOYMENT               ║
║   Ministerial Command Center           ║
╚════════════════════════════════════════╝

[1/2] BACKEND DEPLOYMENT
  ✓ Archive created
  ✓ Upload complete
  ✓ Dependencies installed
  ✓ Prisma client generated
  ✓ Database schema updated
  ✓ Application built
  ✓ PM2 reloaded

[2/2] FRONTEND DEPLOYMENT
  ✓ Build complete
  ✓ Upload complete
  ✓ Files extracted
  ✓ Nginx reloaded

╔════════════════════════════════════════╗
║   DEPLOYMENT COMPLETED SUCCESSFULLY    ║
╚════════════════════════════════════════╝

Environment:  production
VPS:          72.61.41.94
Duration:     3m 45s
```

---

## 🔄 Rollback Procedures

Each deployment script creates a backup before deploying. If deployment fails or causes issues:

### Rollback Backend

```bash
ssh root@72.61.41.94

# Find latest backup
ls -lh /var/backups/backend/

# Restore backup (replace TIMESTAMP)
cd /var/www/ministerial-command-center/backend
tar -xzf /var/backups/backend/backend-backup-TIMESTAMP.tar.gz

# Reinstall and rebuild
npm install
npx prisma generate
npm run build
pm2 reload ministerial-api
```

### Rollback Frontend

```bash
ssh root@72.61.41.94

# Find latest backup
ls -lh /var/backups/frontend/

# Restore backup (replace TIMESTAMP)
cd /var/www/ministerial-command-center
tar -xzf /var/backups/frontend/frontend-backup-TIMESTAMP.tar.gz

# Reload Nginx
systemctl reload nginx
```

---

## 📚 Related Documentation

- [PRODUCTION_DEPLOYMENT_GUIDE.md](../PRODUCTION_DEPLOYMENT_GUIDE.md) - Complete deployment manual
- [SYSTEM_MAINTENANCE_GUIDE.md](../SYSTEM_MAINTENANCE_GUIDE.md) - Maintenance procedures
- [DEPLOYMENT_READINESS_CHECKLIST.md](../DEPLOYMENT_READINESS_CHECKLIST.md) - Go-live checklist

---

## 💡 Tips

1. **Always run health check after deployment**
   ```bash
   ./deploy-full.sh && ./health-check.sh --remote
   ```

2. **Test in staging first** (when staging environment is set up)
   ```bash
   ./deploy-full.sh staging
   ```

3. **Monitor during deployment**
   ```bash
   # In another terminal
   ssh root@72.61.41.94
   pm2 logs ministerial-api --lines 0
   ```

4. **Verify backups weekly**
   ```bash
   # Add to crontab
   0 9 * * 1 /path/to/verify-backups.sh
   ```

---

**Last Updated**: February 5, 2026
**Version**: 1.0
**Maintained by**: Development Team
