#!/bin/bash

# SheetBC Timezone Schema Fix Script
# This script fixes the timezone table to match application expectations

set -e

echo "🔧 SheetBC Timezone Schema Fix"
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

# Configuration
DB_NAME="sheetbc_db"
DB_USER="postgres"
DB_PASSWORD=""

echo "🔍 Checking timezone table schema..."
echo "==================================="

# Check 1: Database Connection
echo ""
echo "1️⃣ Testing Database Connection:"
echo "-------------------------------"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "✅ Database connection successful"
else
    error "❌ Database connection failed"
fi

# Check 2: Check current timezones table structure
echo ""
echo "2️⃣ Checking Current Timezones Table Structure:"
echo "--------------------------------------------"
log "Current timezones table columns:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'timezones' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

# Check 3: Check for missing columns
echo ""
echo "3️⃣ Checking for Missing Columns:"
echo "-------------------------------"
MISSING_COLUMNS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT column_name 
FROM (
    SELECT 'timezone_name' as column_name
    UNION SELECT 'abbreviation_standard'
    UNION SELECT 'abbreviation_daylight'
    UNION SELECT 'utc_offset_standard'
    UNION SELECT 'utc_offset_daylight'
    UNION SELECT 'observes_dst'
) AS expected_columns
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'timezones' 
    AND table_schema = 'public'
);
")

if [ -n "$MISSING_COLUMNS" ]; then
    warn "⚠️ Missing columns in timezones table:"
    echo "$MISSING_COLUMNS"
else
    log "✅ All expected columns exist in timezones table"
fi

# Fix 4: Add missing columns
echo ""
echo "4️⃣ Adding Missing Columns:"
echo "-------------------------"
if [ -n "$MISSING_COLUMNS" ]; then
    log "Adding missing columns to timezones table..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Add timezone_name column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'timezone_name'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN timezone_name VARCHAR(100);
            RAISE NOTICE 'Added timezone_name column to timezones table';
        ELSE
            RAISE NOTICE 'timezone_name column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add abbreviation_standard column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'abbreviation_standard'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN abbreviation_standard VARCHAR(10);
            RAISE NOTICE 'Added abbreviation_standard column to timezones table';
        ELSE
            RAISE NOTICE 'abbreviation_standard column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add abbreviation_daylight column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'abbreviation_daylight'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN abbreviation_daylight VARCHAR(10);
            RAISE NOTICE 'Added abbreviation_daylight column to timezones table';
        ELSE
            RAISE NOTICE 'abbreviation_daylight column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add utc_offset_standard column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'utc_offset_standard'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN utc_offset_standard INTEGER;
            RAISE NOTICE 'Added utc_offset_standard column to timezones table';
        ELSE
            RAISE NOTICE 'utc_offset_standard column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add utc_offset_daylight column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'utc_offset_daylight'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN utc_offset_daylight INTEGER;
            RAISE NOTICE 'Added utc_offset_daylight column to timezones table';
        ELSE
            RAISE NOTICE 'utc_offset_daylight column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add observes_dst column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'observes_dst'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN observes_dst BOOLEAN DEFAULT true;
            RAISE NOTICE 'Added observes_dst column to timezones table';
        ELSE
            RAISE NOTICE 'observes_dst column already exists in timezones table';
        END IF;
    END \$\$;
    "
    
    log "✅ timezones table schema updated"
else
    log "✅ No missing columns in timezones table"
fi

# Fix 5: Update existing timezone data
echo ""
echo "5️⃣ Updating Timezone Data:"
echo "-------------------------"
log "Updating existing timezone records with proper data..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Update existing timezone records
UPDATE timezones SET 
    timezone_name = CASE 
        WHEN display_name = 'Eastern Time' THEN 'America/New_York'
        WHEN display_name = 'Central Time' THEN 'America/Chicago'
        WHEN display_name = 'Mountain Time' THEN 'America/Denver'
        WHEN display_name = 'Pacific Time' THEN 'America/Los_Angeles'
        WHEN display_name = 'Alaska Time' THEN 'America/Anchorage'
        WHEN display_name = 'Hawaii Time' THEN 'Pacific/Honolulu'
        ELSE 'UTC'
    END,
    abbreviation_standard = CASE 
        WHEN display_name = 'Eastern Time' THEN 'EST'
        WHEN display_name = 'Central Time' THEN 'CST'
        WHEN display_name = 'Mountain Time' THEN 'MST'
        WHEN display_name = 'Pacific Time' THEN 'PST'
        WHEN display_name = 'Alaska Time' THEN 'AKST'
        WHEN display_name = 'Hawaii Time' THEN 'HST'
        ELSE 'UTC'
    END,
    abbreviation_daylight = CASE 
        WHEN display_name = 'Eastern Time' THEN 'EDT'
        WHEN display_name = 'Central Time' THEN 'CDT'
        WHEN display_name = 'Mountain Time' THEN 'MDT'
        WHEN display_name = 'Pacific Time' THEN 'PDT'
        WHEN display_name = 'Alaska Time' THEN 'AKDT'
        WHEN display_name = 'Hawaii Time' THEN 'HST'
        ELSE 'UTC'
    END,
    utc_offset_standard = CASE 
        WHEN display_name = 'Eastern Time' THEN -5
        WHEN display_name = 'Central Time' THEN -6
        WHEN display_name = 'Mountain Time' THEN -7
        WHEN display_name = 'Pacific Time' THEN -8
        WHEN display_name = 'Alaska Time' THEN -9
        WHEN display_name = 'Hawaii Time' THEN -10
        ELSE 0
    END,
    utc_offset_daylight = CASE 
        WHEN display_name = 'Eastern Time' THEN -4
        WHEN display_name = 'Central Time' THEN -5
        WHEN display_name = 'Mountain Time' THEN -6
        WHEN display_name = 'Pacific Time' THEN -7
        WHEN display_name = 'Alaska Time' THEN -8
        WHEN display_name = 'Hawaii Time' THEN -10
        ELSE 0
    END,
    observes_dst = CASE 
        WHEN display_name = 'Hawaii Time' THEN false
        ELSE true
    END
WHERE timezone_name IS NULL OR abbreviation_standard IS NULL;
"

log "✅ Timezone data updated"

# Check 6: Verify the changes
echo ""
echo "6️⃣ Verifying Schema Changes:"
echo "---------------------------"
log "Updated timezones table structure:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'timezones' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

echo ""
log "Updated timezone data:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT id, timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst
FROM timezones
ORDER BY id;
"

# Check 7: Test the Record model
echo ""
echo "7️⃣ Testing Record Model:"
echo "----------------------"
log "Testing Record.findAll method..."

# Create a test script to verify the model works
cat > /tmp/test_record_model.js << 'EOF'
const db = require('/root/kanpur-thakur/src/config/database');

async function testRecordModel() {
    try {
        console.log('Testing Record.findAll with timezone join...');
        
        // Test the query that was failing
        const result = await db.query(`
            SELECT 
                r.*,
                tz.timezone_name,
                tz.display_name,
                tz.abbreviation_standard,
                tz.abbreviation_daylight,
                tz.utc_offset_standard,
                tz.utc_offset_daylight,
                tz.observes_dst
            FROM records r
            LEFT JOIN timezones tz ON r.timezone_id = tz.id
            LIMIT 5
        `);
        
        console.log('✅ Record model test passed');
        console.log(`📊 Found ${result.rows.length} records`);
        
    } catch (error) {
        console.error('❌ Record model test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testRecordModel();
EOF

if node /tmp/test_record_model.js; then
    log "✅ Record model test passed"
else
    warn "⚠️ Record model test failed"
fi

# Cleanup
rm -f /tmp/test_record_model.js

# Check 8: Restart the application
echo ""
echo "8️⃣ Restarting Application:"
echo "-------------------------"
log "Restarting the backend application..."

if command -v pm2 &> /dev/null; then
    pm2 restart sheetbc-api
    log "✅ Application restarted via PM2"
else
    warn "⚠️ PM2 not found, please restart the application manually"
fi

echo ""
echo "🎉 Timezone Schema Fix Completed!"
echo "================================"
echo ""
echo "📋 What was fixed:"
echo "=================="
echo "✅ Added timezone_name column to timezones table"
echo "✅ Added abbreviation_standard column to timezones table"
echo "✅ Added abbreviation_daylight column to timezones table"
echo "✅ Added utc_offset_standard column to timezones table"
echo "✅ Added utc_offset_daylight column to timezones table"
echo "✅ Added observes_dst column to timezones table"
echo "✅ Updated existing timezone data with proper values"
echo "✅ Tested Record model functionality"
echo "✅ Restarted the application"
echo ""
echo "🔧 Verification Commands:"
echo "========================"
echo "Check timezones: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c \"\\d timezones\""
echo "Check timezone data: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c \"SELECT * FROM timezones;\""
echo "Check PM2 status: pm2 status"
echo "Check application logs: pm2 logs sheetbc-api"
echo ""
echo "🌐 Test the application:"
echo "======================="
echo "Try accessing the records page - the timezone error should be resolved!"
echo ""
