#!/bin/bash
# Setup Nginx Reverse Proxy for Ministerial Command Center
# This script configures Nginx to proxy API requests to the backend on port 3000

set -e

echo "=========================================="
echo "  Setting Up Nginx Reverse Proxy"
echo "=========================================="

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    apt-get update
    apt-get install -y nginx
fi

echo ""
echo "[1/5] Backing up existing Nginx configuration..."
if [ -f /etc/nginx/sites-enabled/default ]; then
    cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup.$(date +%Y%m%d_%H%M%S)
fi

echo ""
echo "[2/5] Copying new Nginx configuration..."
cp /var/www/ministerial-command-center/deployment/nginx-config.conf /etc/nginx/sites-available/ministerial-command-center

echo ""
echo "[3/5] Enabling the site..."
ln -sf /etc/nginx/sites-available/ministerial-command-center /etc/nginx/sites-enabled/default

echo ""
echo "[4/5] Testing Nginx configuration..."
nginx -t

echo ""
echo "[5/5] Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "=========================================="
echo "  ✅ Nginx Proxy Setup Complete!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  - Frontend: http://72.61.41.94/"
echo "  - API Proxy: http://72.61.41.94/api -> http://localhost:3000"
echo "  - WebSocket: http://72.61.41.94/socket.io"
echo ""
echo "Test the setup:"
echo "  curl http://72.61.41.94/api/health"
echo ""
echo "View Nginx status:"
echo "  systemctl status nginx"
echo ""
echo "View Nginx logs:"
echo "  tail -f /var/log/nginx/access.log"
echo "  tail -f /var/log/nginx/error.log"
echo ""
