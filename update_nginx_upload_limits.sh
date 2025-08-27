#!/bin/bash

# Update Nginx Configuration for Large File Uploads
# This script updates nginx configuration to handle 300MB file uploads

set -e

echo "🔧 Updating Nginx Configuration for Large File Uploads"
echo "======================================================"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root (use sudo)"
fi

# Find nginx configuration files
NGINX_CONF_DIR="/etc/nginx"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"

log "Searching for nginx configuration files..."

# Find all nginx configuration files
CONFIG_FILES=()

# Check main nginx.conf
if [ -f "$NGINX_CONF_DIR/nginx.conf" ]; then
    CONFIG_FILES+=("$NGINX_CONF_DIR/nginx.conf")
fi

# Check sites-available
if [ -d "$NGINX_SITES_DIR" ]; then
    for file in "$NGINX_SITES_DIR"/*; do
        if [ -f "$file" ]; then
            CONFIG_FILES+=("$file")
        fi
    done
fi

# Check sites-enabled
if [ -d "$NGINX_SITES_ENABLED" ]; then
    for file in "$NGINX_SITES_ENABLED"/*; do
        if [ -f "$file" ]; then
            CONFIG_FILES+=("$file")
        fi
    done
fi

if [ ${#CONFIG_FILES[@]} -eq 0 ]; then
    error "No nginx configuration files found"
fi

log "Found ${#CONFIG_FILES[@]} configuration file(s):"
for file in "${CONFIG_FILES[@]}"; do
    echo "  - $file"
done

echo ""
log "Updating nginx configuration files..."

UPDATED_FILES=0

for config_file in "${CONFIG_FILES[@]}"; do
    log "Processing: $config_file"
    
    # Create backup
    backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$config_file" "$backup_file"
    log "  Created backup: $backup_file"
    
    # Update client_max_body_size
    if grep -q "client_max_body_size" "$config_file"; then
        # Replace existing client_max_body_size
        sed -i 's/client_max_body_size [0-9]*[mM];/client_max_body_size 300M;/g' "$config_file"
        sed -i 's/client_max_body_size [0-9]*[kK];/client_max_body_size 300M;/g' "$config_file"
        log "  Updated existing client_max_body_size to 300M"
    else
        # Add client_max_body_size to http block
        if grep -q "http {" "$config_file"; then
            sed -i '/http {/a\    client_max_body_size 300M;' "$config_file"
            log "  Added client_max_body_size 300M to http block"
        fi
    fi
    
    # Update proxy timeouts for large uploads
    if grep -q "proxy_read_timeout" "$config_file"; then
        sed -i 's/proxy_read_timeout [0-9]*s;/proxy_read_timeout 600s;/g' "$config_file"
        log "  Updated proxy_read_timeout to 600s"
    fi
    
    if grep -q "proxy_connect_timeout" "$config_file"; then
        sed -i 's/proxy_connect_timeout [0-9]*s;/proxy_connect_timeout 75s;/g' "$config_file"
        log "  Updated proxy_connect_timeout to 75s"
    fi
    
    # Add proxy_send_timeout if not present
    if ! grep -q "proxy_send_timeout" "$config_file"; then
        # Find location blocks with proxy_pass and add timeout
        sed -i '/proxy_pass.*localhost:3000/a\        proxy_send_timeout 600s;' "$config_file"
        log "  Added proxy_send_timeout 600s"
    fi
    
    UPDATED_FILES=$((UPDATED_FILES + 1))
done

log "Updated $UPDATED_FILES configuration file(s)"

echo ""
log "Testing nginx configuration..."

# Test nginx configuration
if nginx -t; then
    log "✅ Nginx configuration test passed"
else
    error "❌ Nginx configuration test failed. Please check the configuration files."
fi

echo ""
log "Reloading nginx..."

# Reload nginx
if systemctl reload nginx; then
    log "✅ Nginx reloaded successfully"
else
    warn "⚠️ Failed to reload nginx. You may need to restart it manually:"
    echo "   sudo systemctl restart nginx"
fi

echo ""
log "Configuration Summary:"
echo "====================="
echo "✅ client_max_body_size: 300M"
echo "✅ proxy_read_timeout: 600s"
echo "✅ proxy_connect_timeout: 75s"
echo "✅ proxy_send_timeout: 600s"
echo ""
echo "📝 These changes will allow:"
echo "   - File uploads up to 300MB"
echo "   - Longer timeout for large file uploads"
echo "   - Better handling of slow connections"
echo ""
echo "🔧 To apply changes manually:"
echo "   sudo systemctl restart nginx"
echo ""
echo "📊 To monitor uploads:"
echo "   sudo tail -f /var/log/nginx/access.log"
echo "   sudo tail -f /var/log/nginx/error.log"

log "Nginx configuration update completed!"
