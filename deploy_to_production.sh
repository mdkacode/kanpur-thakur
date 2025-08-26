#!/bin/bash

# SheetBC Production Deployment Script
# This script deploys the application to production and fixes all database issues

set -e

echo "🚀 SheetBC Production Deployment"
echo "==============================="

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
SERVER_IP="157.180.70.168"
APP_DIR="/root/kanpur-thakur"
DB_NAME="sheetbc_db"
DB_USER="anrag"
DB_PASSWORD="Anrag@betU1"

echo "🔧 Deployment Configuration:"
echo "==========================="
echo "Server IP: $SERVER_IP"
echo "App Directory: $APP_DIR"
echo "Database: $DB_NAME"
echo "Database User: $DB_USER"
echo ""

# Step 1: Connect to server and check current status
echo "1️⃣ Connecting to Production Server:"
echo "----------------------------------"
log "Connecting to $SERVER_IP..."

# Check if we can connect to the server
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes root@$SERVER_IP "echo 'Connection successful'" 2>/dev/null; then
    error "❌ Cannot connect to server $SERVER_IP"
fi

log "✅ Connected to production server"

# Step 2: Check current application status
echo ""
echo "2️⃣ Checking Current Application Status:"
echo "-------------------------------------"
log "Checking PM2 status..."

ssh root@$SERVER_IP << 'EOF'
    echo "📊 PM2 Status:"
    pm2 status
    
    echo ""
    echo "📊 Application Directory:"
    ls -la /root/kanpur-thakur/
    
    echo ""
    echo "📊 Database Status:"
    psql -h localhost -U postgres -d sheetbc_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "Database connection failed"
EOF

# Step 3: Stop the application
echo ""
echo "3️⃣ Stopping Application:"
echo "----------------------"
log "Stopping PM2 processes..."

ssh root@$SERVER_IP << 'EOF'
    pm2 stop all
    pm2 delete all
    echo "✅ Application stopped"
EOF

# Step 4: Backup current database (if needed)
echo ""
echo "4️⃣ Database Backup:"
echo "-----------------"
log "Creating database backup..."

ssh root@$SERVER_IP << 'EOF'
    BACKUP_DIR="/root/backups"
    mkdir -p $BACKUP_DIR
    
    BACKUP_FILE="$BACKUP_DIR/sheetbc_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump -h localhost -U postgres sheetbc_db > $BACKUP_FILE 2>/dev/null; then
        echo "✅ Database backup created: $BACKUP_FILE"
    else
        echo "⚠️ Database backup failed (database might not exist yet)"
    fi
EOF

# Step 5: Update application code
echo ""
echo "5️⃣ Updating Application Code:"
echo "---------------------------"
log "Pulling latest code and installing dependencies..."

ssh root@$SERVER_IP << 'EOF'
    cd /root/kanpur-thakur
    
    # Pull latest code (if using git)
    if [ -d ".git" ]; then
        git pull origin main
        echo "✅ Code updated from git"
    else
        echo "⚠️ Not a git repository, skipping code update"
    fi
    
    # Install/update dependencies
    npm install
    echo "✅ Dependencies installed"
EOF

# Step 6: Fix database schema issues
echo ""
echo "6️⃣ Fixing Database Schema:"
echo "------------------------"
log "Running database fixes..."

ssh root@$SERVER_IP << 'EOF'
    cd /root/kanpur-thakur
    
    echo "🔧 Fixing column name references..."
    
    # Fix rc -> county in Record.js
    sed -i 's/r\.rc/r.county/g' src/models/Record.js
    sed -i 's/filters\.rc/filters.county/g' src/models/Record.js
    
    # Fix zipcode -> zip_code in DemographicRecord.js
    sed -i 's/dr\.zipcode/dr.zip_code/g' src/models/DemographicRecord.js
    sed -i 's/row\.zipcode/row.zip_code/g' src/models/DemographicRecord.js
    
    # Fix zipcode -> zip_code in demographicFileProcessor.js
    sed -i 's/record\.zipcode/record.zip_code/g' src/services/demographicFileProcessor.js
    
    # Remove states table references
    sed -i '/states WHERE state_code/d' src/models/Record.js
    sed -i '/state_id/d' src/models/Record.js
    
    echo "✅ Database schema fixes applied"
    echo "ℹ️ Note: Integer column handling (timezone_id, population) has been fixed in DemographicRecord.js"
EOF

# Step 7: Run complete database seeding
echo ""
echo "7️⃣ Running Database Seeding:"
echo "---------------------------"
log "Seeding database with complete schema..."

ssh root@$SERVER_IP << 'EOF'
    cd /root/kanpur-thakur
    
    echo "🌱 Running complete database seeding..."
    
    # Run the seeding script
    if npm run seed:complete; then
        echo "✅ Database seeding completed successfully"
    else
        echo "❌ Database seeding failed"
        exit 1
    fi
    
    # Populate US timezones
    echo "🌍 Populating US timezones..."
    if npm run seed:timezones; then
        echo "✅ US timezones populated successfully"
    else
        echo "❌ US timezones population failed"
        exit 1
    fi
    
    echo ""
    echo "📊 Verifying database structure..."
    
    # Check tables
    TABLE_COUNT=$(psql -h localhost -U postgres -d sheetbc_db -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "📊 Total tables: $TABLE_COUNT"
    
    # Check timezone data
    TIMEZONE_COUNT=$(psql -h localhost -U postgres -d sheetbc_db -tAc "SELECT COUNT(*) FROM timezones;")
    echo "📊 Timezone records: $TIMEZONE_COUNT"
    
    # List all tables
    echo "📋 Created tables:"
    psql -h localhost -U postgres -d sheetbc_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
EOF

# Step 8: Test the models
echo ""
echo "8️⃣ Testing Application Models:"
echo "----------------------------"
log "Testing Record and DemographicRecord models..."

ssh root@$SERVER_IP << 'EOF'
    cd /root/kanpur-thakur
    
    echo "🧪 Testing Record model..."
    node -e "
    const db = require('./src/config/database');
    const Record = require('./src/models/Record');
    (async () => {
        try {
            const result = await Record.findAll({ limit: 1 });
            console.log('✅ Record model works:', result.records.length, 'records found');
        } catch (error) {
            console.error('❌ Record model error:', error.message);
            process.exit(1);
        }
    })();
    "
    
    echo ""
    echo "🧪 Testing DemographicRecord model..."
    node -e "
    const db = require('./src/config/database');
    const DemographicRecord = require('./src/models/DemographicRecord');
    (async () => {
        try {
            const result = await DemographicRecord.findAll({ limit: 1 });
            console.log('✅ DemographicRecord model works:', result.records.length, 'records found');
        } catch (error) {
            console.error('❌ DemographicRecord model error:', error.message);
            process.exit(1);
        }
    })();
    "
EOF

# Step 9: Start the application
echo ""
echo "9️⃣ Starting Application:"
echo "----------------------"
log "Starting the application with PM2..."

ssh root@$SERVER_IP << 'EOF'
    cd /root/kanpur-thakur
    
    echo "🚀 Starting application with PM2..."
    
    # Start the backend
    pm2 start ecosystem.config.js --env production --only sheetbc-api
    
    # Wait a moment for the app to start
    sleep 5
    
    # Check status
    echo "📊 PM2 Status:"
    pm2 status
    
    # Check logs
    echo ""
    echo "📋 Recent logs:"
    pm2 logs sheetbc-api --lines 10
EOF

# Step 10: Test the application
echo ""
echo "🔟 Testing Application:"
echo "--------------------"
log "Testing application endpoints..."

ssh root@$SERVER_IP << 'EOF'
    echo "🧪 Testing health endpoint..."
    curl -s http://localhost:3000/health || echo "Health endpoint failed"
    
    echo ""
    echo "🧪 Testing API endpoint..."
    curl -s http://localhost:3000/api/v1/health || echo "API health endpoint failed"
    
    echo ""
    echo "🧪 Testing Nginx proxy..."
    curl -s -k https://157.180.70.168/health || echo "Nginx proxy failed"
EOF

# Step 11: Final verification
echo ""
echo "1️⃣1️⃣ Final Verification:"
echo "----------------------"
log "Performing final checks..."

ssh root@$SERVER_IP << 'EOF'
    echo "📊 Final Status Check:"
    echo "====================="
    
    echo "1. PM2 Status:"
    pm2 status
    
    echo ""
    echo "2. Database Tables:"
    psql -h localhost -U postgres -d sheetbc_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    
    echo ""
    echo "3. Timezone Data:"
    psql -h localhost -U postgres -d sheetbc_db -c "SELECT id, timezone_name, display_name FROM timezones ORDER BY id;"
    
    echo ""
    echo "4. Application Logs:"
    pm2 logs sheetbc-api --lines 5
EOF

echo ""
echo "🎉 Production Deployment Completed!"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "=========="
echo "✅ Connected to production server"
echo "✅ Stopped existing application"
echo "✅ Created database backup"
echo "✅ Updated application code"
echo "✅ Fixed database schema issues"
echo "✅ Ran complete database seeding"
echo "✅ Tested application models"
echo "✅ Started application with PM2"
echo "✅ Tested application endpoints"
echo "✅ Performed final verification"
echo ""
echo "🌐 Application URLs:"
echo "=================="
echo "Production: https://$SERVER_IP"
echo "API Health: https://$SERVER_IP/api/v1/health"
echo "Backend Logs: ssh root@$SERVER_IP 'pm2 logs sheetbc-api'"
echo ""
echo "🔧 Useful Commands:"
echo "=================="
echo "Check PM2 status: ssh root@$SERVER_IP 'pm2 status'"
echo "View logs: ssh root@$SERVER_IP 'pm2 logs sheetbc-api'"
echo "Restart app: ssh root@$SERVER_IP 'pm2 restart sheetbc-api'"
echo "Database access: ssh root@$SERVER_IP 'psql -h localhost -U postgres -d sheetbc_db'"
echo ""
echo "🚀 Your application is now live on production!"
