#!/bin/bash
# VPS Setup Script for Ministerial Command Center
# Run this script on your VPS (72.61.41.94) as root

set -e  # Exit on error

echo "=========================================="
echo "  Ministerial Command Center - VPS Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update System
echo -e "${YELLOW}[1/15] Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install UFW Firewall
echo -e "${YELLOW}[2/15] Installing and configuring firewall...${NC}"
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
echo "y" | ufw enable
ufw status verbose

# Step 3: Install Fail2Ban
echo -e "${YELLOW}[3/15] Installing Fail2Ban...${NC}"
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Step 4: Install Node.js 20 LTS
echo -e "${YELLOW}[4/15] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

# Step 5: Install PM2
echo -e "${YELLOW}[5/15] Installing PM2 Process Manager...${NC}"
npm install -g pm2
pm2 --version

# Step 6: Install PostgreSQL 15
echo -e "${YELLOW}[6/15] Installing PostgreSQL 15...${NC}"
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-15 postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Step 7: Install Nginx
echo -e "${YELLOW}[7/15] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Step 8: Install Git
echo -e "${YELLOW}[8/15] Installing Git...${NC}"
apt install -y git

# Step 9: Create Project Directory
echo -e "${YELLOW}[9/15] Creating project directory...${NC}"
mkdir -p /var/www/ministerial-command-center
cd /var/www/ministerial-command-center

# Step 10: Configure PostgreSQL
echo -e "${YELLOW}[10/15] Configuring PostgreSQL database...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE ministerial_command_center;
CREATE USER ministerial_user WITH ENCRYPTED PASSWORD 'Ministerial_Strong_Pass_2024!';
GRANT ALL PRIVILEGES ON DATABASE ministerial_command_center TO ministerial_user;
\q
EOF

echo -e "${GREEN}✓ PostgreSQL database created${NC}"

# Step 11: Clone or prepare for code upload
echo -e "${YELLOW}[11/15] Project directory ready at: /var/www/ministerial-command-center${NC}"
echo -e "${YELLOW}Please upload your backend and frontend code to this directory${NC}"

# Step 12: Generate JWT Secrets
echo -e "${YELLOW}[12/15] Generating JWT secrets...${NC}"
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)

echo ""
echo -e "${GREEN}=========================================="
echo -e "  GENERATED SECRETS (SAVE THESE!)"
echo -e "==========================================${NC}"
echo ""
echo "JWT_SECRET=\"$JWT_SECRET\""
echo ""
echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\""
echo ""
echo -e "${GREEN}==========================================${NC}"

# Step 13: Create systemd service for auto-start
echo -e "${YELLOW}[13/15] Configuring PM2 startup...${NC}"
pm2 startup systemd -u root --hp /root

# Step 14: Install certbot for SSL (optional)
echo -e "${YELLOW}[14/15] Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx

# Step 15: Summary
echo ""
echo -e "${GREEN}=========================================="
echo -e "  VPS SETUP COMPLETE!"
echo -e "==========================================${NC}"
echo ""
echo "✓ System updated"
echo "✓ Firewall configured (UFW)"
echo "✓ Fail2Ban installed"
echo "✓ Node.js $(node --version) installed"
echo "✓ PM2 installed"
echo "✓ PostgreSQL 15 installed"
echo "✓ Nginx installed"
echo "✓ Git installed"
echo "✓ Database created: ministerial_command_center"
echo "✓ Database user: ministerial_user"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Upload backend code to: /var/www/ministerial-command-center/backend"
echo "2. Upload frontend build to: /var/www/ministerial-command-center/dist"
echo "3. Run: cd /var/www/ministerial-command-center && ./deploy-backend.sh"
echo "4. Run: ./deploy-frontend.sh"
echo "5. Test: http://72.61.41.94"
echo ""
echo -e "${GREEN}Database Credentials:${NC}"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: ministerial_command_center"
echo "  User: ministerial_user"
echo "  Password: Ministerial_Strong_Pass_2024!"
echo ""
