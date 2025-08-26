#!/bin/bash

# SheetBC Production 404 Fix Script
# This script fixes the 404 issue by updating Nginx configuration

set -e

echo "🔧 SheetBC Production 404 Fix"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Configuration
HOST="157.180.70.168"
BUILD_DIR="/root/kanpur-thakur/frontend/build"

echo "🔍 Diagnosing the 404 issue..."
echo "=============================="

# Check 1: Backend Status
echo ""
echo "1️⃣ Checking Backend Status:"
echo "---------------------------"
if curl -s -f "http://localhost:3000/health" > /dev/null; then
    log "✅ Backend is running and accessible"
    echo "Health check response:"
    curl -s "http://localhost:3000/health"
else
    error "❌ Backend is not accessible on port 3000"
    echo "Please start the backend first: ./setup.sh"
fi

# Check 2: API Routes
echo ""
echo "2️⃣ Testing API Routes:"
echo "---------------------"
echo "Testing /api/v1/ (correct path):"
if curl -s -f "http://localhost:3000/api/v1/timezones" > /dev/null; then
    log "✅ API routes are working on /api/v1/"
else
    error "❌ API routes not working on /api/v1/"
fi

echo "Testing /api/ (incorrect path):"
if curl -s -f "http://localhost:3000/api/timezones" > /dev/null; then
    warn "⚠️ API routes also work on /api/ (this is unexpected)"
else
    log "✅ /api/ returns 404 as expected (this is correct)"
fi

# Check 3: Current Nginx Configuration
echo ""
echo "3️⃣ Current Nginx Configuration:"
echo "-------------------------------"
if [ -f "/etc/nginx/sites-available/sheetbc" ]; then
    log "✅ Nginx configuration found"
    
    # Check current API proxy configuration
    if grep -q "location /api/" "/etc/nginx/sites-available/sheetbc"; then
        echo "Current API proxy configuration:"
        grep -A 15 "location /api/" "/etc/nginx/sites-available/sheetbc"
    else
        error "❌ API proxy configuration not found"
    fi
else
    error "❌ Nginx configuration not found"
fi

# Fix 4: Update Nginx Configuration
echo ""
echo "4️⃣ Fixing Nginx Configuration:"
echo "------------------------------"
log "Updating Nginx configuration to use correct API path..."

# Create backup
cp /etc/nginx/sites-available/sheetbc /etc/nginx/sites-available/sheetbc.backup.$(date +%Y%m%d_%H%M%S)
log "✅ Configuration backed up"

# Update the configuration
cat > /etc/nginx/sites-available/sheetbc << EOF
# SheetBC Application Configuration
server {
    listen 80;
    listen [::]:80;
    server_name ${HOST};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${HOST};
    
    # SSL Configuration
    ssl_certificate /etc/ssl/sheetbc/sheetbc.crt;
    ssl_certificate_key /etc/ssl/sheetbc/sheetbc.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory for React build
    root ${BUILD_DIR};
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # API proxy to Node.js backend - FIXED PATH
    location /api/ {
        proxy_pass http://localhost:3000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # React SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # Cache HTML files for a shorter time
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # Security: Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Security: Deny access to backup files
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Logging
    access_log /var/log/nginx/sheetbc_access.log;
    error_log /var/log/nginx/sheetbc_error.log;
}
EOF

log "✅ Nginx configuration updated"

# Check 5: Test Nginx Configuration
echo ""
echo "5️⃣ Testing Nginx Configuration:"
echo "-------------------------------"
if nginx -t; then
    log "✅ Nginx configuration is valid"
else
    error "❌ Nginx configuration has errors"
fi

# Check 6: Reload Nginx
echo ""
echo "6️⃣ Reloading Nginx:"
echo "------------------"
systemctl reload nginx
if systemctl is-active --quiet nginx; then
    log "✅ Nginx reloaded successfully"
else
    error "❌ Failed to reload Nginx"
fi

# Check 7: Test API Through Nginx
echo ""
echo "7️⃣ Testing API Through Nginx:"
echo "-----------------------------"
API_URL="https://${HOST}/api"

echo "Testing API endpoint: $API_URL/timezones"
if curl -k -s -f "$API_URL/timezones" > /dev/null; then
    log "✅ API is now accessible through Nginx!"
    echo "Response:"
    curl -k -s "$API_URL/timezones" | head -5
else
    error "❌ API still not accessible through Nginx"
    echo "Checking Nginx error logs..."
    tail -5 /var/log/nginx/sheetbc_error.log
fi

echo ""
echo "🎉 404 Issue Fixed!"
echo "=================="
echo ""
echo "📋 What was fixed:"
echo "=================="
echo "✅ Updated Nginx proxy_pass from: http://localhost:3000"
echo "✅ Updated Nginx proxy_pass to: http://localhost:3000/api/v1/"
echo "✅ This matches your server.js API route configuration"
echo ""
echo "🌐 Test your API endpoints:"
echo "=========================="
echo "Login: curl -k -X POST https://${HOST}/api/login -H 'Content-Type: application/json' -d '{\"pin\":\"7676\"}'"
echo "Health: curl -k https://${HOST}/health"
echo "API: curl -k https://${HOST}/api/timezones"
echo ""
echo "🔧 Management Commands:"
echo "======================"
echo "Check Nginx status: systemctl status nginx"
echo "View logs: tail -f /var/log/nginx/sheetbc_error.log"
echo "Test config: nginx -t"
echo ""
