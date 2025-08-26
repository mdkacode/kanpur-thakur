#!/bin/bash

# SheetBC Nginx Configuration Fix Script
# This script fixes the existing Nginx configuration

set -e

echo "🔧 SheetBC Nginx Configuration Fix"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root user"
fi

# Fix the Nginx configuration
log "Fixing Nginx configuration..."

# Backup the current configuration
cp /etc/nginx/sites-available/sheetbc /etc/nginx/sites-available/sheetbc.backup.$(date +%Y%m%d_%H%M%S)
log "✅ Configuration backed up"

# Fix the gzip_proxied line
sed -i 's/gzip_proxied expired no-cache no-store private must-revalidate auth;/gzip_proxied expired no-cache no-store private auth;/' /etc/nginx/sites-available/sheetbc

log "✅ Fixed gzip_proxied configuration"

# Test the configuration
log "Testing Nginx configuration..."
if nginx -t; then
    log "✅ Nginx configuration test passed"
else
    error "Nginx configuration test still failed"
fi

# Reload Nginx
log "Reloading Nginx..."
systemctl reload nginx

if systemctl is-active --quiet nginx; then
    log "✅ Nginx is running successfully"
else
    error "Failed to reload Nginx"
fi

echo ""
echo "🎉 Nginx configuration fixed successfully!"
echo "=========================================="
echo ""
echo "Your application should now be accessible at:"
echo "https://157.180.70.168"
echo ""
echo "To check Nginx status:"
echo "/root/nginx_manager.sh status"
echo ""
