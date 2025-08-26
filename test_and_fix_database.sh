#!/bin/bash

# SheetBC Database Test and Fix Script
# This script tests the database connection and runs seeding

set -e

echo "🔧 SheetBC Database Test and Fix"
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
DB_NAME="sheetbc_db"
DB_USER="postgres"
APP_DIR="/root/kanpur-thakur"

echo "🔧 Database Configuration:"
echo "========================="
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Application Directory: $APP_DIR"
echo ""

# Check 1: Test database connection
echo "1️⃣ Testing Database Connection:"
echo "-------------------------------"
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "✅ Database connection successful"
else
    error "❌ Database connection failed"
fi

# Check 2: Check if database exists
echo ""
echo "2️⃣ Checking Database Existence:"
echo "------------------------------"
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "✅ Database '$DB_NAME' exists"
else
    warn "⚠️ Database '$DB_NAME' does not exist"
    log "Creating database..."
    psql -h localhost -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    log "✅ Database created"
fi

# Check 3: Check application directory
echo ""
echo "3️⃣ Checking Application Directory:"
echo "--------------------------------"
if [ -d "$APP_DIR" ]; then
    log "✅ Application directory exists: $APP_DIR"
else
    error "❌ Application directory not found: $APP_DIR"
fi

# Check 4: Check if Node.js is installed
echo ""
echo "4️⃣ Checking Node.js Installation:"
echo "--------------------------------"
if command -v node &> /dev/null; then
    log "✅ Node.js is installed: $(node --version)"
else
    error "❌ Node.js is not installed"
fi

# Check 5: Check if seeding script exists
echo ""
echo "5️⃣ Checking Seeding Script:"
echo "--------------------------"
SEED_SCRIPT="$APP_DIR/src/database/seedDatabase.js"
if [ -f "$SEED_SCRIPT" ]; then
    log "✅ Seeding script found: $SEED_SCRIPT"
else
    error "❌ Seeding script not found: $SEED_SCRIPT"
fi

# Step 6: Run the database seeding
echo ""
echo "6️⃣ Running Database Seeding:"
echo "---------------------------"
log "Starting database seeding..."

cd "$APP_DIR"

# Run the seeding script
if npm run seed:complete; then
    log "✅ Database seeding completed successfully"
else
    warn "⚠️ Database seeding failed, trying alternative approach..."
    
    # Try running the script directly
    if node src/database/seedDatabase.js; then
        log "✅ Database seeding completed successfully (direct execution)"
    else
        error "❌ Database seeding failed completely"
    fi
fi

# Step 7: Verify the seeding
echo ""
echo "7️⃣ Verifying Database Seeding:"
echo "----------------------------"
log "Checking created tables..."

TABLES=$(psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
")

echo ""
log "Created tables:"
echo "$TABLES"

# Count tables
TABLE_COUNT=$(echo "$TABLES" | wc -l)
log "Total tables created: $TABLE_COUNT"

# Check timezone data
echo ""
log "Checking timezone data..."
TIMEZONE_COUNT=$(psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM timezones;")
log "Timezone records: $TIMEZONE_COUNT"

if [ "$TIMEZONE_COUNT" -gt 0 ]; then
    log "✅ Timezone data populated"
    
    echo ""
    log "Timezone data:"
    psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT id, timezone_name, display_name, abbreviation_standard, abbreviation_daylight FROM timezones ORDER BY id;"
else
    warn "⚠️ No timezone data found"
fi

# Step 8: Test application connection
echo ""
echo "8️⃣ Testing Application Connection:"
echo "--------------------------------"
log "Testing if the application can connect to the database..."

# Create a simple test script
cat > /tmp/test_db_connection.js << 'EOF'
const db = require('/root/kanpur-thakur/src/config/database');

async function testConnection() {
    try {
        const result = await db.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
        console.log('✅ Application database connection successful');
        console.log(`📊 Total tables: ${result.rows[0].table_count}`);
        
        // Test timezone query
        const timezoneResult = await db.query('SELECT COUNT(*) as timezone_count FROM timezones');
        console.log(`📊 Timezone records: ${timezoneResult.rows[0].timezone_count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Application database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

if node /tmp/test_db_connection.js; then
    log "✅ Application can connect to database"
else
    warn "⚠️ Application database connection test failed"
fi

# Cleanup
rm -f /tmp/test_db_connection.js

# Step 9: Restart the application
echo ""
echo "9️⃣ Restarting Application:"
echo "-------------------------"
log "Restarting the backend application..."

if command -v pm2 &> /dev/null; then
    pm2 restart sheetbc-api
    log "✅ Application restarted via PM2"
else
    warn "⚠️ PM2 not found, please restart the application manually"
fi

echo ""
echo "🎉 Database Test and Fix Completed!"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "=========="
echo "✅ Database: $DB_NAME"
echo "✅ User: $DB_USER"
echo "✅ Tables: $TABLE_COUNT"
echo "✅ Timezones: $TIMEZONE_COUNT"
echo ""
echo "🔧 Next Steps:"
echo "============="
echo "1. Start the application: cd $APP_DIR && npm start"
echo "2. Or use PM2: pm2 start ecosystem.config.js --env production"
echo "3. Check logs: pm2 logs sheetbc-api"
echo ""
echo "🌐 Test the application:"
echo "======================="
echo "Visit: https://157.180.70.168"
echo ""
echo "📊 Database Commands:"
echo "===================="
echo "Connect: psql -h localhost -U $DB_USER -d $DB_NAME"
echo "List tables: \\dt"
echo "Check table: \\d table_name"
echo "Count records: SELECT COUNT(*) FROM table_name;"
echo ""
echo "🚀 Your database is ready!"
