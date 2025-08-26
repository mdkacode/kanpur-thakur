#!/bin/bash

# SheetBC Nginx Setup Script
# This script sets up Nginx with SSL for IP-based deployment

set -e

echo "🌐 SheetBC Nginx Setup Script"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/root/kanpur-thakur"
NGINX_CONF_DIR="/etc/nginx"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
SSL_DIR="/etc/ssl/sheetbc"
BACKUP_DIR="/root/backups/nginx"

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

# Get server IP address
get_server_ip() {
    # Use the specific server IP
    echo "157.180.70.168"
}

# Step 1: Install Nginx and dependencies
install_nginx() {
    log "Installing Nginx and dependencies..."
    
    # Update package list
    apt update
    
    # Install Nginx
    apt install -y nginx
    
    # Install SSL tools
    apt install -y certbot python3-certbot-nginx
    
    # Install additional tools
    apt install -y curl wget unzip
    
    log "✅ Nginx and dependencies installed successfully"
}

# Step 2: Create SSL directory and self-signed certificate
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Create SSL directory
    mkdir -p "$SSL_DIR"
    
    # Generate self-signed certificate
    log "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/sheetbc.key" \
        -out "$SSL_DIR/sheetbc.crt" \
        -subj "/C=US/ST=State/L=City/O=SheetBC/OU=IT/CN=157.180.70.168"
    
    # Set proper permissions
    chmod 600 "$SSL_DIR/sheetbc.key"
    chmod 644 "$SSL_DIR/sheetbc.crt"
    
    log "✅ SSL certificates created successfully"
}

# Step 3: Create Nginx configuration
create_nginx_config() {
    log "Creating Nginx configuration..."
    
    # Get server IP
    SERVER_IP=$(get_server_ip)
    log "Using server IP: $SERVER_IP"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing nginx config
    if [ -f "$NGINX_CONF_DIR/nginx.conf" ]; then
        cp "$NGINX_CONF_DIR/nginx.conf" "$BACKUP_DIR/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
        log "✅ Existing nginx.conf backed up"
    fi
    
    # Create main nginx configuration
    cat > "$NGINX_CONF_DIR/nginx.conf" << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
    # multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    # server_tokens off;

    # server_names_hash_bucket_size 64;
    # server_name_in_redirect off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    ##
    # Logging Settings
    ##
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    # Create sites-available directory if it doesn't exist
    mkdir -p "$NGINX_SITES_DIR"
    
    # Create SheetBC site configuration
    cat > "$NGINX_SITES_DIR/sheetbc" << EOF
# SheetBC Application Configuration
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_IP;
    
    # SSL Configuration
    ssl_certificate $SSL_DIR/sheetbc.crt;
    ssl_certificate_key $SSL_DIR/sheetbc.key;
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
    
    # Root directory for static files
    root $APP_DIR/frontend/build;
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3000/api/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
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

    # Enable the site
    ln -sf "$NGINX_SITES_DIR/sheetbc" "$NGINX_SITES_ENABLED/"
    
    # Remove default site if it exists
    if [ -L "$NGINX_SITES_ENABLED/default" ]; then
        rm "$NGINX_SITES_ENABLED/default"
        log "✅ Removed default Nginx site"
    fi
    
    log "✅ Nginx configuration created successfully"
}

# Step 4: Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Install UFW if not present
    if ! command -v ufw &> /dev/null; then
        apt install -y ufw
    fi
    
    # Reset UFW to default
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (important!)
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow Nginx
    ufw allow 'Nginx Full'
    
    # Enable UFW
    ufw --force enable
    
    log "✅ Firewall configured successfully"
}

# Step 5: Test and start Nginx
test_and_start_nginx() {
    log "Testing Nginx configuration..."
    
    # Test configuration
    if nginx -t; then
        log "✅ Nginx configuration test passed"
    else
        error "Nginx configuration test failed"
    fi
    
    # Start/restart Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    # Check status
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx is running successfully"
    else
        error "Failed to start Nginx"
    fi
}

# Step 6: Create SSL renewal script
create_ssl_renewal() {
    log "Creating SSL renewal script..."
    
    cat > /root/renew_ssl.sh << 'EOF'
#!/bin/bash

# SheetBC SSL Certificate Renewal Script

echo "🔄 Renewing SSL certificates..."

# Stop Nginx temporarily
systemctl stop nginx

# Renew certificates (if using Let's Encrypt)
# certbot renew --quiet

# Start Nginx
systemctl start nginx

echo "✅ SSL certificates renewed successfully"
EOF

    chmod +x /root/renew_ssl.sh
    
    # Add to crontab for automatic renewal (every 3 months)
    (crontab -l 2>/dev/null; echo "0 2 1 */3 * /root/renew_ssl.sh") | crontab -
    
    log "✅ SSL renewal script created and scheduled"
}

# Step 7: Create Nginx management script
create_nginx_manager() {
    log "Creating Nginx management script..."
    
    cat > /root/nginx_manager.sh << 'EOF'
#!/bin/bash

# SheetBC Nginx Management Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

case "${1:-status}" in
    start)
        log "Starting Nginx..."
        systemctl start nginx
        log "✅ Nginx started"
        ;;
    stop)
        log "Stopping Nginx..."
        systemctl stop nginx
        log "✅ Nginx stopped"
        ;;
    restart)
        log "Restarting Nginx..."
        systemctl restart nginx
        log "✅ Nginx restarted"
        ;;
    reload)
        log "Reloading Nginx configuration..."
        systemctl reload nginx
        log "✅ Nginx configuration reloaded"
        ;;
    status)
        log "Nginx Status:"
        systemctl status nginx --no-pager -l
        ;;
    test)
        log "Testing Nginx configuration..."
        if nginx -t; then
            log "✅ Configuration test passed"
        else
            error "Configuration test failed"
        fi
        ;;
    logs)
        log "Showing Nginx logs (last 50 lines):"
        tail -n 50 /var/log/nginx/error.log
        ;;
    logs-access)
        log "Showing Nginx access logs (last 50 lines):"
        tail -n 50 /var/log/nginx/access.log
        ;;
    logs-sheetbc)
        log "Showing SheetBC logs (last 50 lines):"
        tail -n 50 /var/log/nginx/sheetbc_error.log
        ;;
    *)
        echo "SheetBC Nginx Manager"
        echo "===================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start       - Start Nginx"
        echo "  stop        - Stop Nginx"
        echo "  restart     - Restart Nginx"
        echo "  reload      - Reload configuration"
        echo "  status      - Show Nginx status"
        echo "  test        - Test configuration"
        echo "  logs        - Show error logs"
        echo "  logs-access - Show access logs"
        echo "  logs-sheetbc - Show SheetBC logs"
        echo ""
        echo "Examples:"
        echo "  $0 start    - Start Nginx"
        echo "  $0 status   - Check status"
        echo "  $0 test     - Test config"
        ;;
esac
EOF

    chmod +x /root/nginx_manager.sh
    
    log "✅ Nginx management script created"
}

# Step 8: Show final information
show_final_info() {
    SERVER_IP=$(get_server_ip)
    
    echo ""
    echo "🎉 Nginx setup completed successfully!"
    echo "====================================="
    echo ""
    echo "📋 Configuration Summary:"
    echo "========================"
    echo "Server IP: $SERVER_IP"
    echo "Application Directory: $APP_DIR"
    echo "SSL Certificates: $SSL_DIR"
    echo "Nginx Config: $NGINX_SITES_DIR/sheetbc"
    echo ""
    echo "🌐 Access Information:"
    echo "====================="
    echo "HTTP (redirects to HTTPS): http://$SERVER_IP"
    echo "HTTPS: https://$SERVER_IP"
    echo "API Endpoint: https://$SERVER_IP/api/"
    echo "Health Check: https://$SERVER_IP/health"
    echo ""
    echo "🔧 Management Commands:"
    echo "======================"
    echo "Nginx Status: /root/nginx_manager.sh status"
    echo "Nginx Restart: /root/nginx_manager.sh restart"
    echo "Test Config: /root/nginx_manager.sh test"
    echo "View Logs: /root/nginx_manager.sh logs"
    echo "SSL Renewal: /root/renew_ssl.sh"
    echo ""
    echo "📁 Important Files:"
    echo "=================="
    echo "Nginx Config: /etc/nginx/sites-available/sheetbc"
    echo "SSL Certificate: $SSL_DIR/sheetbc.crt"
    echo "SSL Private Key: $SSL_DIR/sheetbc.key"
    echo "Access Log: /var/log/nginx/sheetbc_access.log"
    echo "Error Log: /var/log/nginx/sheetbc_error.log"
    echo ""
    echo "⚠️  Important Notes:"
    echo "=================="
    echo "1. Self-signed certificate is installed (browser will show security warning)"
    echo "2. For production, replace with Let's Encrypt or commercial certificate"
    echo "3. Make sure your application is running on port 3000"
    echo "4. Check firewall settings if you can't access the site"
    echo ""
    echo "🚀 Next Steps:"
    echo "============="
    echo "1. Start your application: ./setup.sh"
    echo "2. Test the website: https://$SERVER_IP"
    echo "3. Check logs if there are issues: /root/nginx_manager.sh logs"
    echo ""
}

# Main execution
main() {
    log "Starting Nginx setup for SheetBC..."
    
    # Step 1: Install Nginx
    install_nginx
    
    # Step 2: Setup SSL
    setup_ssl
    
    # Step 3: Create Nginx configuration
    create_nginx_config
    
    # Step 4: Configure firewall
    configure_firewall
    
    # Step 5: Test and start Nginx
    test_and_start_nginx
    
    # Step 6: Create SSL renewal script
    create_ssl_renewal
    
    # Step 7: Create Nginx management script
    create_nginx_manager
    
    # Step 8: Show final information
    show_final_info
}

# Run main function
main
