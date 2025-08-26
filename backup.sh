#!/bin/bash

# SheetBC Backup Script
# This script creates backups of the database and application files

set -e

echo "💾 Starting SheetBC backup..."

# Configuration
BACKUP_DIR="/root/backups"
DB_NAME="sheetbc_db"
DB_USER="sheetbc_user"
APP_DIR="/root/sheetbc"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/root/backup.log"

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

# Create backup directory
mkdir -p $BACKUP_DIR

# Step 1: Database backup
log "Creating database backup..."
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"
pg_dump -h localhost -U $DB_USER $DB_NAME > $DB_BACKUP_FILE

if [ $? -eq 0 ]; then
    DB_SIZE=$(du -h $DB_BACKUP_FILE | cut -f1)
    log "Database backup completed: $DB_BACKUP_FILE ($DB_SIZE)"
else
    error "Database backup failed"
fi

# Step 2: Application files backup
log "Creating application files backup..."
APP_BACKUP_FILE="$BACKUP_DIR/app_backup_$DATE.tar.gz"
tar -czf $APP_BACKUP_FILE \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='*.log' \
    -C $APP_DIR . 2>/dev/null

if [ $? -eq 0 ]; then
    APP_SIZE=$(du -h $APP_BACKUP_FILE | cut -f1)
    log "Application backup completed: $APP_BACKUP_FILE ($APP_SIZE)"
else
    warn "Application backup failed"
fi

# Step 3: Uploads and telecare files backup
log "Creating uploads backup..."
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads_backup_$DATE.tar.gz"
if [ -d "$APP_DIR/uploads" ] || [ -d "$APP_DIR/telecare_files" ]; then
    tar -czf $UPLOADS_BACKUP_FILE \
        -C $APP_DIR uploads telecare_files 2>/dev/null
    
    if [ $? -eq 0 ]; then
        UPLOADS_SIZE=$(du -h $UPLOADS_BACKUP_FILE | cut -f1)
        log "Uploads backup completed: $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
    else
        warn "Uploads backup failed"
    fi
else
    log "No uploads directory found, skipping uploads backup"
fi

# Step 4: Create backup manifest
log "Creating backup manifest..."
MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$DATE.txt"
cat > $MANIFEST_FILE << EOF
SheetBC Backup Manifest
=======================
Date: $(date)
Server: $(hostname)
User: $USER

Backup Files:
- Database: $DB_BACKUP_FILE
- Application: $APP_BACKUP_FILE
- Uploads: $UPLOADS_BACKUP_FILE

Database Information:
- Database: $DB_NAME
- User: $DB_USER
- Backup Size: $DB_SIZE

Application Information:
- Directory: $APP_DIR
- Backup Size: $APP_SIZE

System Information:
- OS: $(lsb_release -d | cut -f2)
- Kernel: $(uname -r)
- Disk Usage: $(df -h /root | tail -1 | awk '{print $5}')

EOF

# Step 5: Cleanup old backups (keep last 7 days)
log "Cleaning up old backups..."
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "backup_manifest_*.txt" -mtime +7 -delete

# Step 6: Show backup summary
log "Backup summary:"
echo "======================="
echo "Database backup: $DB_BACKUP_FILE ($DB_SIZE)"
echo "Application backup: $APP_BACKUP_FILE ($APP_SIZE)"
if [ -f "$UPLOADS_BACKUP_FILE" ]; then
    echo "Uploads backup: $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
fi
echo "Manifest: $MANIFEST_FILE"
echo "======================="

# Step 7: Verify backup integrity
log "Verifying backup integrity..."
if [ -f "$DB_BACKUP_FILE" ] && [ -s "$DB_BACKUP_FILE" ]; then
    log "Database backup verification: OK"
else
    error "Database backup verification failed"
fi

if [ -f "$APP_BACKUP_FILE" ] && [ -s "$APP_BACKUP_FILE" ]; then
    log "Application backup verification: OK"
else
    warn "Application backup verification failed"
fi

# Step 8: Show disk usage
log "Current disk usage:"
df -h $BACKUP_DIR

# Step 9: List recent backups
log "Recent backups:"
ls -lah $BACKUP_DIR/*_$DATE.* 2>/dev/null || echo "No backup files found for today"

echo ""
log "🎉 Backup completed successfully!"
log "📊 Backup location: $BACKUP_DIR"
log "📝 Backup log: $LOG_FILE"

# Optional: Send notification (if configured)
if command -v mail &> /dev/null; then
    echo "Backup completed successfully on $(date)" | mail -s "SheetBC Backup Complete" admin@yourdomain.com
fi
