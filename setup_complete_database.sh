#!/bin/bash

# SheetBC Complete Database Setup Script
# This script creates the entire database structure from scratch

set -e

echo "🗄️ SheetBC Complete Database Setup"
echo "=================================="

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
DB_PASSWORD=""
APP_DIR="/root/kanpur-thakur"

echo "🔧 Database Configuration:"
echo "========================="
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Application Directory: $APP_DIR"
echo ""

# Check 1: Verify we're running as root
echo "1️⃣ Checking User Permissions:"
echo "----------------------------"
if [ "$EUID" -eq 0 ]; then
    log "✅ Running as root user"
else
    error "❌ This script must be run as root user"
fi

# Check 2: Check if PostgreSQL is installed and running
echo ""
echo "2️⃣ Checking PostgreSQL Installation:"
echo "-----------------------------------"
if command -v psql &> /dev/null; then
    log "✅ PostgreSQL client is installed"
else
    error "❌ PostgreSQL client is not installed"
fi

if systemctl is-active --quiet postgresql; then
    log "✅ PostgreSQL service is running"
else
    error "❌ PostgreSQL service is not running"
fi

# Check 3: Check if database exists
echo ""
echo "3️⃣ Checking Database Existence:"
echo "------------------------------"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    warn "⚠️ Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Dropping existing database..."
        PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        log "✅ Database dropped"
    else
        warn "⚠️ Using existing database"
    fi
else
    log "✅ Database '$DB_NAME' does not exist (will be created)"
fi

# Step 4: Create database if it doesn't exist
echo ""
echo "4️⃣ Creating Database:"
echo "-------------------"
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "Creating database '$DB_NAME'..."
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    log "✅ Database created successfully"
else
    log "✅ Database already exists"
fi

# Step 5: Test database connection
echo ""
echo "5️⃣ Testing Database Connection:"
echo "------------------------------"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" >/dev/null 2>&1; then
    log "✅ Database connection successful"
else
    error "❌ Database connection failed"
fi

# Step 6: Check if application directory exists
echo ""
echo "6️⃣ Checking Application Directory:"
echo "--------------------------------"
if [ -d "$APP_DIR" ]; then
    log "✅ Application directory exists: $APP_DIR"
else
    error "❌ Application directory not found: $APP_DIR"
fi

# Step 7: Check if Node.js is installed
echo ""
echo "7️⃣ Checking Node.js Installation:"
echo "--------------------------------"
if command -v node &> /dev/null; then
    log "✅ Node.js is installed: $(node --version)"
else
    error "❌ Node.js is not installed"
fi

# Step 8: Check if npm is installed
echo ""
echo "8️⃣ Checking npm Installation:"
echo "----------------------------"
if command -v npm &> /dev/null; then
    log "✅ npm is installed: $(npm --version)"
else
    error "❌ npm is not installed"
fi

# Step 9: Check if seeding script exists
echo ""
echo "9️⃣ Checking Seeding Script:"
echo "--------------------------"
SEED_SCRIPT="$APP_DIR/src/database/seedDatabase.js"
if [ -f "$SEED_SCRIPT" ]; then
    log "✅ Seeding script found: $SEED_SCRIPT"
else
    error "❌ Seeding script not found: $SEED_SCRIPT"
fi

# Step 10: Run the complete database seeding
echo ""
echo "🔟 Running Complete Database Seeding:"
echo "-----------------------------------"
log "Starting complete database seeding..."

cd "$APP_DIR"

# Run the seeding script
if npm run seed:complete; then
    log "✅ Database seeding completed successfully"
else
    error "❌ Database seeding failed"
fi

# Step 11: Verify all tables were created
echo ""
echo "1️⃣1️⃣ Verifying Database Structure:"
echo "--------------------------------"
log "Checking all tables were created..."

TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
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

# Step 12: Check for required tables
echo ""
echo "1️⃣2️⃣ Checking Required Tables:"
echo "----------------------------"
REQUIRED_TABLES=(
    "timezones"
    "records"
    "demographic_records"
    "user_filters"
    "file_uploads"
    "telecare_runs"
    "telecare_output_rows"
    "phone_number_jobs"
    "phone_numbers"
    "phone_number_generations"
    "phone_number_downloads"
    "download_tracking"
)

MISSING_TABLES=()
for table in "${REQUIRED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
        log "✅ $table table exists"
    else
        warn "⚠️ $table table missing"
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    log "✅ All required tables exist"
else
    warn "⚠️ Missing tables: ${MISSING_TABLES[*]}"
fi

# Step 13: Check timezone data
echo ""
echo "1️⃣3️⃣ Checking Timezone Data:"
echo "---------------------------"
TIMEZONE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM timezones;")
log "Timezone records: $TIMEZONE_COUNT"

if [ "$TIMEZONE_COUNT" -gt 0 ]; then
    log "✅ Timezone data populated"
else
    warn "⚠️ No timezone data found"
fi

# Step 14: Check indexes
echo ""
echo "1️⃣4️⃣ Checking Database Indexes:"
echo "-----------------------------"
INDEX_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public';
")
log "Database indexes: $INDEX_COUNT"

# Step 15: Check extensions
echo ""
echo "1️⃣5️⃣ Checking PostgreSQL Extensions:"
echo "----------------------------------"
EXTENSIONS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT extname 
FROM pg_extension 
WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
")

log "Installed extensions:"
echo "$EXTENSIONS"

# Step 16: Test application connection
echo ""
echo "1️⃣6️⃣ Testing Application Connection:"
echo "----------------------------------"
log "Testing if the application can connect to the database..."

# Create a simple test script
cat > /tmp/test_db_connection.js << 'EOF'
const db = require('/root/kanpur-thakur/src/config/database');

async function testConnection() {
    try {
        const result = await db.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
        console.log('✅ Application database connection successful');
        console.log(`📊 Total tables: ${result.rows[0].table_count}`);
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

echo ""
echo "🎉 Complete Database Setup Finished!"
echo "==================================="
echo ""
echo "📋 Summary:"
echo "=========="
echo "✅ Database: $DB_NAME"
echo "✅ User: $DB_USER"
echo "✅ Tables: $TABLE_COUNT"
echo "✅ Timezones: $TIMEZONE_COUNT"
echo "✅ Indexes: $INDEX_COUNT"
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
echo "Connect: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME"
echo "List tables: \\dt"
echo "Check table: \\d table_name"
echo "Count records: SELECT COUNT(*) FROM table_name;"
echo ""
echo "🚀 Your database is ready for production!"
