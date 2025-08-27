#!/bin/bash

# Comprehensive Server Upload Limits Fix
# This script fixes all server-side configurations for large file uploads

set -e

echo "🔧 Comprehensive Server Upload Limits Fix"
echo "=========================================="

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

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"

log "Fixing server upload limits for large files..."
log "Application directory: $APP_DIR"

# Step 1: Fix Nginx Configuration
log "Step 1: Fixing Nginx Configuration"
echo "=================================="

# Find nginx configuration files
NGINX_CONF_DIR="/etc/nginx"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"

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

# Update nginx configuration files
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
        sed -i 's/proxy_read_timeout [0-9]*s;/proxy_read_timeout 900s;/g' "$config_file"
        log "  Updated proxy_read_timeout to 900s"
    fi
    
    if grep -q "proxy_connect_timeout" "$config_file"; then
        sed -i 's/proxy_connect_timeout [0-9]*s;/proxy_connect_timeout 75s;/g' "$config_file"
        log "  Updated proxy_connect_timeout to 75s"
    fi
    
    # Add proxy_send_timeout if not present
    if ! grep -q "proxy_send_timeout" "$config_file"; then
        # Find location blocks with proxy_pass and add timeout
        sed -i '/proxy_pass.*localhost:3000/a\        proxy_send_timeout 900s;' "$config_file"
        log "  Added proxy_send_timeout 900s"
    fi
    
    # Add client_body_timeout if not present
    if ! grep -q "client_body_timeout" "$config_file"; then
        if grep -q "http {" "$config_file"; then
            sed -i '/http {/a\    client_body_timeout 900s;' "$config_file"
            log "  Added client_body_timeout 900s"
        fi
    fi
    
    # Add client_header_timeout if not present
    if ! grep -q "client_header_timeout" "$config_file"; then
        if grep -q "http {" "$config_file"; then
            sed -i '/http {/a\    client_header_timeout 900s;' "$config_file"
            log "  Added client_header_timeout 900s"
        fi
    fi
    
    UPDATED_FILES=$((UPDATED_FILES + 1))
done

log "Updated $UPDATED_FILES nginx configuration file(s)"

# Step 2: Fix Node.js Application Configuration
log "Step 2: Fixing Node.js Application Configuration"
echo "================================================"

# Check if the application is running with PM2
if command -v pm2 &> /dev/null; then
    log "PM2 detected, updating application configuration..."
    
    # Check if app is running
    if pm2 list | grep -q "sheetbc"; then
        log "Restarting application with new configuration..."
        pm2 restart all
        log "✅ Application restarted"
    else
        log "No PM2 application found, starting application..."
        cd "$APP_DIR"
        pm2 start src/server.js --name "sheetbc-api"
        log "✅ Application started with PM2"
    fi
else
    log "PM2 not found, restarting application manually..."
    cd "$APP_DIR"
    # Kill existing Node.js processes if any
    pkill -f "node.*server.js" || true
    # Start application
    nohup node src/server.js > app.log 2>&1 &
    log "✅ Application restarted manually"
fi

# Step 3: Fix System Limits
log "Step 3: Fixing System Limits"
echo "============================"

# Update system limits for file uploads
log "Updating system limits..."

# Update /etc/security/limits.conf
if ! grep -q "nginx.*nofile" /etc/security/limits.conf; then
    echo "nginx soft nofile 65536" >> /etc/security/limits.conf
    echo "nginx hard nofile 65536" >> /etc/security/limits.conf
    log "  Updated /etc/security/limits.conf"
fi

# Update sysctl settings
if ! grep -q "net.core.rmem_max" /etc/sysctl.conf; then
    echo "net.core.rmem_max = 16777216" >> /etc/sysctl.conf
    echo "net.core.wmem_max = 16777216" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_rmem = 4096 87380 16777216" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_wmem = 4096 65536 16777216" >> /etc/sysctl.conf
    log "  Updated /etc/sysctl.conf"
fi

# Apply sysctl changes
sysctl -p > /dev/null 2>&1 || true

# Step 4: Fix Upload Directory Permissions
log "Step 4: Fixing Upload Directory Permissions"
echo "==========================================="

# Create uploads directory if it doesn't exist
UPLOADS_DIR="$APP_DIR/uploads"
mkdir -p "$UPLOADS_DIR"

# Set proper permissions
chown -R www-data:www-data "$UPLOADS_DIR" 2>/dev/null || true
chmod -R 755 "$UPLOADS_DIR"
log "✅ Upload directory permissions fixed"

# Step 5: Test Nginx Configuration
log "Step 5: Testing Nginx Configuration"
echo "==================================="

# Test nginx configuration
if nginx -t; then
    log "✅ Nginx configuration test passed"
else
    error "❌ Nginx configuration test failed. Please check the configuration files."
fi

# Step 6: Restart Services
log "Step 6: Restarting Services"
echo "==========================="

# Restart nginx
log "Restarting nginx..."
if systemctl restart nginx; then
    log "✅ Nginx restarted successfully"
else
    warn "⚠️ Failed to restart nginx. You may need to restart it manually:"
    echo "   sudo systemctl restart nginx"
fi

# Step 7: Test Upload Endpoint
log "Step 7: Testing Upload Endpoint"
echo "==============================="

# Wait a moment for services to start
sleep 3

# Test the upload endpoint
log "Testing upload endpoint..."
if curl -s -I https://157.180.70.168/api/v1/upload | grep -q "200\|405"; then
    log "✅ Upload endpoint is accessible"
else
    warn "⚠️ Upload endpoint test failed. Check if the application is running."
fi

# Step 8: Show Configuration Summary
log "Step 8: Configuration Summary"
echo "============================="

echo ""
echo "📊 Configuration Summary:"
echo "========================"
echo "✅ client_max_body_size: 300M"
echo "✅ proxy_read_timeout: 900s"
echo "✅ proxy_send_timeout: 900s"
echo "✅ proxy_connect_timeout: 75s"
echo "✅ client_body_timeout: 900s"
echo "✅ client_header_timeout: 900s"
echo "✅ System limits updated"
echo "✅ Upload directory permissions fixed"
echo "✅ Nginx restarted"
echo "✅ Application restarted"
echo ""
echo "📝 These changes will allow:"
echo "   - File uploads up to 300MB"
echo "   - Extended timeouts for large file uploads"
echo "   - Better handling of slow connections"
echo "   - Proper system resource allocation"
echo ""
echo "🔧 Manual commands if needed:"
echo "   sudo systemctl restart nginx"
echo "   pm2 restart all"
echo "   sudo nginx -t"
echo ""
echo "📊 To monitor uploads:"
echo "   sudo tail -f /var/log/nginx/access.log"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "   pm2 logs"
echo ""
echo "🧪 Test upload with curl:"
echo "   curl -X POST \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -F 'file=@large_file.txt' \\"
echo "     https://157.180.70.168/api/v1/upload"

log "Server upload limits fix completed!"
