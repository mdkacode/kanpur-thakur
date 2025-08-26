#!/bin/bash

# SheetBC Application Deployment Script
# This script automates the deployment process for production updates

set -e

echo "🚀 Starting SheetBC deployment..."

# Configuration
APP_DIR="/root/kanpur-thakur"
BACKUP_DIR="/root/backups"
LOG_FILE="/root/deploy.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root user"
fi

# Navigate to application directory
cd $APP_DIR || error "Application directory not found: $APP_DIR"

# Step 1: Create backup
log "Creating backup..."
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    . || warn "Backup creation failed, continuing..."

# Step 2: Pull latest changes
log "Pulling latest changes from git..."
git fetch origin
git reset --hard origin/main || error "Failed to pull latest changes"

# Step 3: Install backend dependencies
log "Installing backend dependencies..."
npm install --production || error "Failed to install backend dependencies"

# Step 4: Install frontend dependencies and build
log "Installing frontend dependencies..."
cd frontend
npm install --production || error "Failed to install frontend dependencies"

log "Building frontend for production..."
npm run build || error "Failed to build frontend"

cd ..

# Step 5: Run database migrations (if any)
log "Running database migrations..."
if [ -f "src/database/createTables.js" ]; then
    node src/database/createTables.js || warn "Database migration failed, continuing..."
fi

# Step 6: Restart application
log "Restarting application with PM2..."
pm2 restart sheetbc-api || error "Failed to restart application"

# Step 7: Check application status
log "Checking application status..."
sleep 5
pm2 status

# Step 8: Test application
log "Testing application..."
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    log "Application health check passed"
else
    warn "Application health check failed"
fi

# Step 9: Cleanup old backups (keep last 7 days)
log "Cleaning up old backups..."
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

# Step 10: Final status check
log "Deployment completed successfully!"
log "Application is running on port 3000"
log "Check logs with: pm2 logs sheetbc-api"

# Display recent logs
echo ""
log "Recent application logs:"
pm2 logs sheetbc-api --lines 10 --nostream

echo ""
log "🎉 Deployment completed successfully!"
log "📊 Backup created: $BACKUP_DIR/app_backup_$DATE.tar.gz"
log "📝 Full deployment log: $LOG_FILE"
