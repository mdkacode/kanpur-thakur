#!/bin/bash

# SheetBC Frontend Production Build Script
# This script builds the React app for production and configures Nginx

set -e

echo "🏗️ SheetBC Frontend Production Build"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/root/kanpur-thakur"
FRONTEND_DIR="$APP_DIR/frontend"
BUILD_DIR="$FRONTEND_DIR/build"
BACKUP_DIR="/root/backups/frontend"

# Get host from environment or use default
HOST="${HOST:-157.180.70.168}"
PROTOCOL="${PROTOCOL:-https}"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root user"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm first."
fi

# Step 1: Navigate to frontend directory
log "Navigating to frontend directory..."
if [ ! -d "$FRONTEND_DIR" ]; then
    error "Frontend directory not found: $FRONTEND_DIR"
fi

cd "$FRONTEND_DIR"

# Step 2: Install dependencies
log "Installing frontend dependencies..."
if [ ! -f "package.json" ]; then
    error "package.json not found in frontend directory"
fi

npm install --production=false
log "✅ Dependencies installed successfully"

# Step 3: Create production environment file
log "Creating production environment configuration..."
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
REACT_APP_API_URL=${PROTOCOL}://${HOST}/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
EOF

log "✅ Production environment file created with API URL: ${PROTOCOL}://${HOST}/api"

log "✅ Production environment file created"

# Step 4: Build the React app
log "Building React app for production..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    error "Build failed - build directory not created"
fi

log "✅ React app built successfully"

# Step 5: Backup existing build
log "Backing up existing build..."
mkdir -p "$BACKUP_DIR"
if [ -d "$BUILD_DIR" ]; then
    if [ -d "$BACKUP_DIR/previous_build" ]; then
        rm -rf "$BACKUP_DIR/previous_build"
    fi
    mv "$BUILD_DIR" "$BACKUP_DIR/previous_build.$(date +%Y%m%d_%H%M%S)"
fi

# Step 6: Optimize build for production
log "Optimizing build for production..."

# The build directory is already created by npm run build
# Just set proper permissions
chown -R www-data:www-data "$BUILD_DIR"
chmod -R 755 "$BUILD_DIR"

# Set proper permissions
chown -R www-data:www-data "$BUILD_DIR"
chmod -R 755 "$BUILD_DIR"

log "✅ Build optimized and permissions set"

# Step 7: Create .htaccess for SPA routing (if needed)
log "Creating SPA routing configuration..."
cat > "$BUILD_DIR/.htaccess" << 'EOF'
# React Router SPA Configuration
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options nosniff
  Header always set X-Frame-Options DENY
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Cache Control
<IfModule mod_expires.c>
  ExpiresActive on
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
EOF

log "✅ SPA routing configuration created"

# Step 8: Update Nginx configuration for React
log "Updating Nginx configuration for React SPA..."

    # Create optimized Nginx configuration for React
    cat > /etc/nginx/sites-available/sheetbc << EOF
# SheetBC Application Configuration
server {
    listen 80;
    listen [::]:80;
    server_name ${HOST};
    
    # Redirect HTTP to HTTPS
    return 301 ${PROTOCOL}://\$server_name\$request_uri;
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
    root /root/kanpur-thakur/frontend/build;
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # React SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        
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

log "✅ Nginx configuration updated for React SPA"

# Step 9: Test and reload Nginx
log "Testing Nginx configuration..."
if nginx -t; then
    log "✅ Nginx configuration test passed"
else
    error "Nginx configuration test failed"
fi

log "Reloading Nginx..."
systemctl reload nginx

if systemctl is-active --quiet nginx; then
    log "✅ Nginx reloaded successfully"
else
    error "Failed to reload Nginx"
fi

# Step 10: Show build information
log "Build completed successfully!"
echo ""
echo "📊 Build Information:"
echo "===================="
echo "Build Directory: $BUILD_DIR"
echo "Build Size: $(du -sh $BUILD_DIR | cut -f1)"
echo "Files Count: $(find $BUILD_DIR -type f | wc -l)"
echo ""

# Step 11: Show final information
echo "🎉 React Production Build Completed!"
echo "===================================="
echo ""
echo "📋 Configuration Summary:"
echo "========================"
echo "Frontend Build: $BUILD_DIR"
echo "Nginx Config: /etc/nginx/sites-available/sheetbc"
echo "Environment: Production"
echo "Host: $HOST"
echo "Protocol: $PROTOCOL"
echo "API URL: ${PROTOCOL}://${HOST}/api"
echo ""
echo "🌐 Access Information:"
echo "====================="
echo "Main Application: ${PROTOCOL}://${HOST}"
echo "API Endpoint: ${PROTOCOL}://${HOST}/api/"
echo "Health Check: ${PROTOCOL}://${HOST}/health"
echo ""
echo "🔧 Management Commands:"
echo "======================"
echo "Nginx Status: /root/nginx_manager.sh status"
echo "Nginx Restart: /root/nginx_manager.sh restart"
echo "View Logs: /root/nginx_manager.sh logs"
echo "Rebuild Frontend: ./build_frontend.sh"
echo ""
echo "📁 Important Files:"
echo "=================="
echo "Build Directory: $BUILD_DIR"
echo "Environment File: $FRONTEND_DIR/.env.production"
echo "Nginx Config: /etc/nginx/sites-available/sheetbc"
echo "Access Log: /var/log/nginx/sheetbc_access.log"
echo "Error Log: /var/log/nginx/sheetbc_error.log"
echo ""
echo "⚠️  Important Notes:"
echo "=================="
echo "1. React app is now built for production"
echo "2. Static files are served by Nginx"
echo "3. API requests are proxied to Node.js backend"
echo "4. SPA routing is configured for React Router"
echo "5. Static assets are cached for 1 year"
echo "6. Source maps are disabled for security"
echo ""
echo "🚀 Next Steps:"
echo "============="
echo "1. Start your backend: ./setup.sh"
echo "2. Test the application: ${PROTOCOL}://${HOST}"
echo "3. Check logs if needed: /root/nginx_manager.sh logs"
echo ""
