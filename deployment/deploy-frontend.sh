#!/bin/bash
# Frontend Deployment Script
# Run this in /var/www/ministerial-command-center

set -e

echo "=========================================="
echo "  Deploying Frontend"
echo "=========================================="

# Build frontend (if not already built locally)
if [ ! -d "dist" ]; then
    echo "[1/4] Building frontend..."
    npm install
    npm run build
else
    echo "[1/4] Using existing build..."
fi

# Copy to Nginx directory
echo "[2/4] Copying build to Nginx..."
mkdir -p /var/www/html/ministerial
cp -r dist/* /var/www/html/ministerial/

# Configure Nginx
echo "[3/4] Configuring Nginx..."
cat > /etc/nginx/sites-available/ministerial <<'EOF'
server {
    listen 80;
    server_name 72.61.41.94;

    # Frontend (React app)
    location / {
        root /var/www/html/ministerial;
        try_files $uri $uri/ /index.html;

        # Caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ministerial /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "[4/4] Testing Nginx configuration..."
nginx -t

# Restart Nginx
systemctl restart nginx

echo ""
echo "✓ Frontend deployed successfully!"
echo ""
echo "Access application: http://72.61.41.94"
echo "Login with: admin@mttsia.gob.gq / Admin123!"
echo ""
