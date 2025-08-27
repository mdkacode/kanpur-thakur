#!/bin/bash

# SheetBC Timezone Cron Setup Script
# This script helps set up automatic timezone processing via cron

set -e

echo "🕐 SheetBC Timezone Cron Setup"
echo "=============================="

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

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"

log "Setting up timezone cron job for SheetBC..."
log "Application directory: $APP_DIR"

# Check if the timezone processor script exists
if [ ! -f "$APP_DIR/src/scripts/cronTimezoneProcessor.js" ]; then
    error "Timezone processor script not found at $APP_DIR/src/scripts/cronTimezoneProcessor.js"
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    error "Node.js is not installed or not in PATH"
fi

# Test the timezone processor
log "Testing timezone processor..."
if node "$APP_DIR/src/scripts/cronTimezoneProcessor.js" --test; then
    log "✅ Timezone processor test passed"
else
    warn "⚠️ Timezone processor test failed, but continuing with setup"
fi

# Create logs directory
LOGS_DIR="$APP_DIR/logs"
mkdir -p "$LOGS_DIR"
log "✅ Created logs directory: $LOGS_DIR"

# Set up cron job
echo ""
echo "📋 Cron Job Options:"
echo "1. Every 5 minutes (recommended for active systems)"
echo "2. Every hour (good for moderate usage)"
echo "3. Daily at 2 AM (minimal resource usage)"
echo "4. Custom schedule"
echo "5. Skip cron setup (manual execution only)"
echo ""

read -p "Select option (1-5): " cron_option

case $cron_option in
    1)
        CRON_SCHEDULE="*/5 * * * *"
        DESCRIPTION="Every 5 minutes"
        ;;
    2)
        CRON_SCHEDULE="0 * * * *"
        DESCRIPTION="Every hour"
        ;;
    3)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2 AM"
        ;;
    4)
        echo ""
        echo "Enter custom cron schedule (e.g., '*/10 * * * *' for every 10 minutes):"
        read -p "Cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom schedule: $CRON_SCHEDULE"
        ;;
    5)
        log "Skipping cron setup. You can run manually with: npm run cron:timezones"
        echo ""
        echo "📝 Manual execution commands:"
        echo "  npm run process:timezones    # Process timezones once"
        echo "  npm run cron:timezones       # Run cron processor manually"
        echo "  node src/scripts/cronTimezoneProcessor.js  # Direct execution"
        exit 0
        ;;
    *)
        error "Invalid option selected"
        ;;
esac

# Create cron entry
CRON_ENTRY="$CRON_SCHEDULE cd $APP_DIR && node src/scripts/cronTimezoneProcessor.js >> $LOGS_DIR/timezone-processor.log 2>&1"

echo ""
log "Selected schedule: $DESCRIPTION"
log "Cron entry: $CRON_ENTRY"
echo ""

read -p "Add this cron job? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "cronTimezoneProcessor.js"; then
        warn "Found existing timezone processor cron job. Removing old entry..."
        (crontab -l 2>/dev/null | grep -v "cronTimezoneProcessor.js") | crontab -
    fi
    
    # Add new cron entry
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    
    log "✅ Cron job added successfully!"
    log "📋 Schedule: $DESCRIPTION"
    log "📁 Log file: $LOGS_DIR/timezone-processor.log"
    
    echo ""
    echo "📝 Cron job details:"
    echo "  Schedule: $CRON_SCHEDULE"
    echo "  Command: cd $APP_DIR && node src/scripts/cronTimezoneProcessor.js"
    echo "  Log file: $LOGS_DIR/timezone-processor.log"
    echo ""
    echo "🔧 To manage cron jobs:"
    echo "  crontab -l          # List all cron jobs"
    echo "  crontab -e          # Edit cron jobs"
    echo "  crontab -r          # Remove all cron jobs"
    echo ""
    echo "📊 To monitor timezone processing:"
    echo "  tail -f $LOGS_DIR/timezone-processor.log"
    echo "  npm run process:timezones"
    
else
    log "Cron job setup cancelled"
    echo ""
    echo "📝 You can still run timezone processing manually:"
    echo "  npm run process:timezones"
    echo "  npm run cron:timezones"
fi

echo ""
log "Timezone cron setup completed!"
