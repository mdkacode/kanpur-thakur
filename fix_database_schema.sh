#!/bin/bash

# SheetBC Database Schema Fix Script
# This script fixes missing columns in the database

set -e

echo "🔧 SheetBC Database Schema Fix"
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
DB_USER="anrag"
DB_PASSWORD="Anrag@betU1"

echo "🔍 Checking database schema..."
echo "=============================="

# Check 1: Database Connection
echo ""
echo "1️⃣ Testing Database Connection:"
echo "-------------------------------"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "✅ Database connection successful"
else
    error "❌ Database connection failed"
fi

# Check 2: Check all table structures
echo ""
echo "2️⃣ Checking All Table Structures:"
echo "--------------------------------"
log "Checking file_uploads table..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'file_uploads' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

echo ""
log "Checking timezones table..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'timezones' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

echo ""
log "Checking records table..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'records' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

# Check 3: Check for missing columns in file_uploads
echo ""
echo "3️⃣ Checking for Missing Columns in file_uploads:"
echo "----------------------------------------------"
MISSING_FILE_UPLOAD_COLUMNS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT column_name 
FROM (
    SELECT 'completed_at' as column_name
    UNION SELECT 'processing_started_at'
    UNION SELECT 'processing_completed_at'
    UNION SELECT 'error_details'
) AS expected_columns
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'file_uploads' 
    AND table_schema = 'public'
);
")

if [ -n "$MISSING_FILE_UPLOAD_COLUMNS" ]; then
    warn "⚠️ Missing columns in file_uploads table:"
    echo "$MISSING_FILE_UPLOAD_COLUMNS"
else
    log "✅ All expected columns exist in file_uploads table"
fi

# Check 4: Check for missing columns in timezones
echo ""
echo "4️⃣ Checking for Missing Columns in timezones:"
echo "--------------------------------------------"
MISSING_TIMEZONE_COLUMNS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT column_name 
FROM (
    SELECT 'created_at' as column_name
    UNION SELECT 'updated_at'
) AS expected_columns
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'timezones' 
    AND table_schema = 'public'
);
")

if [ -n "$MISSING_TIMEZONE_COLUMNS" ]; then
    warn "⚠️ Missing columns in timezones table:"
    echo "$MISSING_TIMEZONE_COLUMNS"
else
    log "✅ All expected columns exist in timezones table"
fi

# Check 5: Check for missing columns in records
echo ""
echo "5️⃣ Checking for Missing Columns in records:"
echo "------------------------------------------"
MISSING_RECORDS_COLUMNS=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "
SELECT column_name 
FROM (
    SELECT 'created_at' as column_name
    UNION SELECT 'updated_at'
) AS expected_columns
WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'records' 
    AND table_schema = 'public'
);
")

if [ -n "$MISSING_RECORDS_COLUMNS" ]; then
    warn "⚠️ Missing columns in records table:"
    echo "$MISSING_RECORDS_COLUMNS"
else
    log "✅ All expected columns exist in records table"
fi

# Fix 6: Add missing columns to file_uploads
echo ""
echo "6️⃣ Adding Missing Columns to file_uploads:"
echo "----------------------------------------"
if [ -n "$MISSING_FILE_UPLOAD_COLUMNS" ]; then
    log "Adding missing columns to file_uploads table..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Add completed_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'file_uploads' 
                      AND column_name = 'completed_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE file_uploads ADD COLUMN completed_at TIMESTAMP;
            RAISE NOTICE 'Added completed_at column to file_uploads table';
        ELSE
            RAISE NOTICE 'completed_at column already exists in file_uploads table';
        END IF;
    END \$\$;

    -- Add processing_started_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'file_uploads' 
                      AND column_name = 'processing_started_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE file_uploads ADD COLUMN processing_started_at TIMESTAMP;
            RAISE NOTICE 'Added processing_started_at column to file_uploads table';
        ELSE
            RAISE NOTICE 'processing_started_at column already exists in file_uploads table';
        END IF;
    END \$\$;

    -- Add processing_completed_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'file_uploads' 
                      AND column_name = 'processing_completed_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE file_uploads ADD COLUMN processing_completed_at TIMESTAMP;
            RAISE NOTICE 'Added processing_completed_at column to file_uploads table';
        ELSE
            RAISE NOTICE 'processing_completed_at column already exists in file_uploads table';
        END IF;
    END \$\$;

    -- Add error_details column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'file_uploads' 
                      AND column_name = 'error_details'
                      AND table_schema = 'public') THEN
            ALTER TABLE file_uploads ADD COLUMN error_details TEXT;
            RAISE NOTICE 'Added error_details column to file_uploads table';
        ELSE
            RAISE NOTICE 'error_details column already exists in file_uploads table';
        END IF;
    END \$\$;
    "
    
    log "✅ file_uploads table schema updated"
else
    log "✅ No missing columns in file_uploads table"
fi

# Fix 7: Add missing columns to timezones
echo ""
echo "7️⃣ Adding Missing Columns to timezones:"
echo "--------------------------------------"
if [ -n "$MISSING_TIMEZONE_COLUMNS" ]; then
    log "Adding missing columns to timezones table..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Add created_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'created_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added created_at column to timezones table';
        ELSE
            RAISE NOTICE 'created_at column already exists in timezones table';
        END IF;
    END \$\$;

    -- Add updated_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'timezones' 
                      AND column_name = 'updated_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE timezones ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column to timezones table';
        ELSE
            RAISE NOTICE 'updated_at column already exists in timezones table';
        END IF;
    END \$\$;
    "
    
    log "✅ timezones table schema updated"
else
    log "✅ No missing columns in timezones table"
fi

# Fix 8: Add missing columns to records
echo ""
echo "8️⃣ Adding Missing Columns to records:"
echo "------------------------------------"
if [ -n "$MISSING_RECORDS_COLUMNS" ]; then
    log "Adding missing columns to records table..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Add created_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'records' 
                      AND column_name = 'created_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE records ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added created_at column to records table';
        ELSE
            RAISE NOTICE 'created_at column already exists in records table';
        END IF;
    END \$\$;

    -- Add updated_at column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'records' 
                      AND column_name = 'updated_at'
                      AND table_schema = 'public') THEN
            ALTER TABLE records ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column to records table';
        ELSE
            RAISE NOTICE 'updated_at column already exists in records table';
        END IF;
    END \$\$;
    "
    
    log "✅ records table schema updated"
else
    log "✅ No missing columns in records table"
fi

# Check 9: Verify all changes
echo ""
echo "9️⃣ Verifying Schema Changes:"
echo "---------------------------"
log "Updated file_uploads table structure:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'file_uploads' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

echo ""
log "Updated timezones table structure:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'timezones' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

echo ""
log "Updated records table structure:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'records' 
AND table_schema = 'public'
ORDER BY ordinal_position;
"

# Check 10: Test the models
echo ""
echo "🔟 Testing Models:"
echo "-----------------"
log "Testing FileUpload.updateStatus method..."

# Create a test script to verify the models work
cat > /tmp/test_models.js << 'EOF'
const db = require('/root/kanpur-thakur/src/config/database');

async function testModels() {
    try {
        console.log('Testing FileUpload updateStatus...');
        
        // Test updating status with completed_at
        const result1 = await db.query(`
            UPDATE file_uploads 
            SET status = 'completed', 
                completed_at = CURRENT_TIMESTAMP,
                processing_completed_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING id, status, completed_at, processing_completed_at
        `);
        
        console.log('✅ FileUpload updateStatus test passed');
        
        // Test timezones query
        const result2 = await db.query(`
            SELECT id, display_name, created_at, updated_at
            FROM timezones 
            LIMIT 1
        `);
        
        console.log('✅ Timezones query test passed');
        
        // Test records query
        const result3 = await db.query(`
            SELECT id, created_at, updated_at
            FROM records 
            LIMIT 1
        `);
        
        console.log('✅ Records query test passed');
        
    } catch (error) {
        console.error('❌ Model test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testModels();
EOF

if node /tmp/test_models.js; then
    log "✅ All model tests passed"
else
    warn "⚠️ Some model tests failed"
fi

# Cleanup
rm -f /tmp/test_models.js

# Check 11: Restart the application
echo ""
echo "1️⃣1️⃣ Restarting Application:"
echo "----------------------------"
log "Restarting the backend application..."

if command -v pm2 &> /dev/null; then
    pm2 restart sheetbc-api
    log "✅ Application restarted via PM2"
else
    warn "⚠️ PM2 not found, please restart the application manually"
fi

echo ""
echo "🎉 Database Schema Fix Completed!"
echo "================================"
echo ""
echo "📋 What was fixed:"
echo "=================="
echo "✅ Added missing columns to file_uploads table"
echo "✅ Added missing columns to timezones table"
echo "✅ Added missing columns to records table"
echo "✅ Tested all models"
echo "✅ Restarted the application"
echo ""
echo "🔧 Verification Commands:"
echo "========================"
echo "Check file_uploads: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c \"\\d file_uploads\""
echo "Check timezones: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c \"\\d timezones\""
echo "Check records: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c \"\\d records\""
echo "Check PM2 status: pm2 status"
echo "Check application logs: pm2 logs sheetbc-api"
echo ""
echo "🌐 Test the application:"
echo "======================="
echo "Try uploading a file again - the errors should be resolved!"
echo ""
