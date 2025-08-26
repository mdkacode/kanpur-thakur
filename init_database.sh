#!/bin/bash

# SheetBC Database Initialization Script
# This script creates all required tables and imports initial data

set -e

echo "🗄️ SheetBC Database Initialization Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="sheetbc_db"
DB_USER="anrag"
DB_PASSWORD="Anrag@betU1"
APP_DIR="/root/kanpur-thakur"

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

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    error "PostgreSQL is not installed. Please install PostgreSQL first."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
fi

# Test database connection
log "Testing database connection..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    error "Database connection failed. Please run create_database.sh first."
fi

log "✅ Database connection successful!"

# Navigate to application directory
if [ ! -d "$APP_DIR" ]; then
    error "Application directory not found: $APP_DIR"
fi

cd "$APP_DIR"

# Step 1: Create all tables
log "Creating database tables..."

if [ -f "src/database/createTables.js" ]; then
    log "Running createTables.js..."
    node src/database/createTables.js
else
    warn "createTables.js not found, creating tables manually..."
    
    # Create tables manually using SQL
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Create timezones table
    CREATE TABLE IF NOT EXISTS timezones (
        id SERIAL PRIMARY KEY,
        timezone_name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        abbreviation_standard VARCHAR(10),
        abbreviation_daylight VARCHAR(10),
        utc_offset_standard VARCHAR(10),
        utc_offset_daylight VARCHAR(10),
        observes_dst BOOLEAN DEFAULT false,
        description TEXT,
        states TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create records table
    CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        npa VARCHAR(3) NOT NULL,
        nxx VARCHAR(3) NOT NULL,
        zip VARCHAR(5) NOT NULL,
        state_code VARCHAR(2) NOT NULL,
        city VARCHAR(100),
        rc VARCHAR(100),
        timezone_id INTEGER REFERENCES timezones(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create demographic_records table
    CREATE TABLE IF NOT EXISTS demographic_records (
        id SERIAL PRIMARY KEY,
        zipcode VARCHAR(5) NOT NULL,
        state VARCHAR(2) NOT NULL,
        county VARCHAR(100),
        city VARCHAR(100),
        mhhi DECIMAL(12,2),
        avg_hhi DECIMAL(12,2),
        median_age DECIMAL(5,2),
        households INTEGER,
        race_ethnicity_white DECIMAL(5,2),
        race_ethnicity_black DECIMAL(5,2),
        race_ethnicity_hispanic DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create user_filters table
    CREATE TABLE IF NOT EXISTS user_filters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filter_type VARCHAR(50) NOT NULL,
        filter_config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create telecare_runs table
    CREATE TABLE IF NOT EXISTS telecare_runs (
        run_id VARCHAR(255) PRIMARY KEY,
        zip VARCHAR(5) NOT NULL,
        input_csv_name VARCHAR(255),
        output_csv_name VARCHAR(255),
        script_version VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        row_count INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        error_message TEXT,
        file_refs JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create telecare_output_rows table
    CREATE TABLE IF NOT EXISTS telecare_output_rows (
        id SERIAL PRIMARY KEY,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create file_uploads table
    CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_size BIGINT,
        file_path VARCHAR(500),
        file_type VARCHAR(50) DEFAULT 'standard',
        status VARCHAR(20) DEFAULT 'processing',
        records_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create download_tracking table
    CREATE TABLE IF NOT EXISTS download_tracking (
        id SERIAL PRIMARY KEY,
        filter_criteria JSONB NOT NULL,
        download_count INTEGER DEFAULT 1,
        first_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    "
fi

# Step 2: Create phone number tables
log "Creating phone number tables..."

if [ -f "src/database/migratePhoneNumbers.js" ]; then
    log "Running migratePhoneNumbers.js..."
    node src/database/migratePhoneNumbers.js
else
    warn "migratePhoneNumbers.js not found, creating phone number tables manually..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Create phone_number_jobs table
    CREATE TABLE IF NOT EXISTS phone_number_jobs (
        job_id VARCHAR(255) PRIMARY KEY,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        filter_id INTEGER REFERENCES user_filters(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        total_numbers INTEGER DEFAULT 0,
        generated_numbers INTEGER DEFAULT 0,
        failed_numbers INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
    );

    -- Create phone_numbers table
    CREATE TABLE IF NOT EXISTS phone_numbers (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) NOT NULL REFERENCES phone_number_jobs(job_id) ON DELETE CASCADE,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        npa VARCHAR(3) NOT NULL,
        nxx VARCHAR(3) NOT NULL,
        thousands VARCHAR(3) NOT NULL,
        last_three VARCHAR(3) NOT NULL,
        full_phone_number VARCHAR(13) NOT NULL,
        state VARCHAR(2) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        company_type VARCHAR(50),
        company VARCHAR(255),
        ratecenter VARCHAR(100),
        filter_id INTEGER REFERENCES user_filters(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(full_phone_number, job_id)
    );

    -- Create phone_number_generations table
    CREATE TABLE IF NOT EXISTS phone_number_generations (
        id SERIAL PRIMARY KEY,
        generation_name VARCHAR(255) NOT NULL,
        user_id VARCHAR(100) DEFAULT 'anonymous',
        user_name VARCHAR(255),
        filter_criteria JSONB,
        source_zipcodes TEXT,
        source_timezone_ids TEXT,
        total_records INTEGER DEFAULT 0,
        file_size BIGINT,
        csv_filename VARCHAR(255),
        csv_path VARCHAR(500),
        status VARCHAR(20) DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create phone_number_downloads table
    CREATE TABLE IF NOT EXISTS phone_number_downloads (
        id SERIAL PRIMARY KEY,
        generation_id INTEGER REFERENCES phone_number_generations(id) ON DELETE CASCADE,
        downloaded_by VARCHAR(255),
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
    );
    "
fi

# Step 3: Update phone number schema
log "Updating phone number schema..."

if [ -f "src/database/updatePhoneNumberSchema.js" ]; then
    log "Running updatePhoneNumberSchema.js..."
    if node src/database/updatePhoneNumberSchema.js; then
        log "✅ Phone number schema updated successfully"
    else
        warn "Phone number schema update had issues, but continuing..."
    fi
else
    warn "updatePhoneNumberSchema.js not found, updating schema manually..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Add last_three column if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'phone_numbers' AND column_name = 'last_three') THEN
            ALTER TABLE phone_numbers ADD COLUMN last_three VARCHAR(3);
        END IF;
    END \$\$;

    -- Update full_phone_number column to support 10-digit numbers
    ALTER TABLE phone_numbers ALTER COLUMN full_phone_number TYPE VARCHAR(13);

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip);
    CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx);
    CREATE INDEX IF NOT EXISTS idx_records_timezone ON records(timezone_id);
    CREATE INDEX IF NOT EXISTS idx_demographic_records_zipcode ON demographic_records(zipcode);
    CREATE INDEX IF NOT EXISTS idx_telecare_runs_zip ON telecare_runs(zip);
    CREATE INDEX IF NOT EXISTS idx_telecare_runs_status ON telecare_runs(status);
    CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
    CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_run_id ON phone_number_jobs(run_id);
    CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_zip ON phone_number_jobs(zip);
    CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_status ON phone_number_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_job_id ON phone_numbers(job_id);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_run_id ON phone_numbers(run_id);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_zip ON phone_numbers(zip);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_full_phone ON phone_numbers(full_phone_number);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_state ON phone_numbers(state);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_last_three ON phone_numbers(last_three);
    CREATE INDEX IF NOT EXISTS idx_phone_numbers_zip_filter ON phone_numbers(zip, filter_id);
    "
fi

# Step 4: Import initial data
log "Importing initial data..."

if [ -f "src/database/initial_data.sql" ]; then
    log "Running initial_data.sql..."
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f src/database/initial_data.sql
else
    warn "initial_data.sql not found, importing basic timezone data..."
    
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
    -- Insert basic timezone data
    INSERT INTO timezones (timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst, description, states) VALUES
    ('America/New_York', 'Eastern Time', 'EST', 'EDT', '-05:00', '-04:00', true, 'Eastern Standard/Daylight Time', 'NY,PA,NJ,DE,MD,DC,VA,NC,SC,GA,FL,OH,IN,KY,TN,AL,MS,WV'),
    ('America/Chicago', 'Central Time', 'CST', 'CDT', '-06:00', '-05:00', true, 'Central Standard/Daylight Time', 'IL,WI,MI,IN,KY,TN,AL,MS,AR,LA,OK,TX,KS,NE,IA,MO,MN,ND,SD'),
    ('America/Denver', 'Mountain Time', 'MST', 'MDT', '-07:00', '-06:00', true, 'Mountain Standard/Daylight Time', 'CO,WY,MT,ID,UT,AZ,NM,TX,KS,NE,SD,ND'),
    ('America/Los_Angeles', 'Pacific Time', 'PST', 'PDT', '-08:00', '-07:00', true, 'Pacific Standard/Daylight Time', 'CA,WA,OR,NV,ID'),
    ('America/Anchorage', 'Alaska Time', 'AKST', 'AKDT', '-09:00', '-08:00', true, 'Alaska Standard/Daylight Time', 'AK'),
    ('Pacific/Honolulu', 'Hawaii Time', 'HST', 'HDT', '-10:00', '-09:00', true, 'Hawaii Standard/Daylight Time', 'HI'),
    ('America/Phoenix', 'Arizona Time', 'MST', 'MST', '-07:00', '-07:00', false, 'Arizona Mountain Standard Time (No DST)', 'AZ')
    ON CONFLICT (timezone_name) DO NOTHING;
    "
fi

# Step 5: Verify database setup
log "Verifying database setup..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Show all tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show table counts
SELECT 
    'timezones' as table_name, COUNT(*) as count FROM timezones
UNION ALL
SELECT 
    'records' as table_name, COUNT(*) as count FROM records
UNION ALL
SELECT 
    'demographic_records' as table_name, COUNT(*) as count FROM demographic_records
UNION ALL
SELECT 
    'user_filters' as table_name, COUNT(*) as count FROM user_filters
UNION ALL
SELECT 
    'telecare_runs' as table_name, COUNT(*) as count FROM telecare_runs
UNION ALL
SELECT 
    'telecare_output_rows' as table_name, COUNT(*) as count FROM telecare_output_rows
UNION ALL
SELECT 
    'file_uploads' as table_name, COUNT(*) as count FROM file_uploads
UNION ALL
SELECT 
    'download_tracking' as table_name, COUNT(*) as count FROM download_tracking
UNION ALL
SELECT 
    'phone_number_jobs' as table_name, COUNT(*) as count FROM phone_number_jobs
UNION ALL
SELECT 
    'phone_numbers' as table_name, COUNT(*) as count FROM phone_numbers
UNION ALL
SELECT 
    'phone_number_generations' as table_name, COUNT(*) as count FROM phone_number_generations
UNION ALL
SELECT 
    'phone_number_downloads' as table_name, COUNT(*) as count FROM phone_number_downloads;
"

# Step 6: Show database information
log "Database initialization completed successfully!"
echo ""
echo "📊 Database Summary:"
echo "==================="
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Total Tables: $(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")"
echo "Database Size: $(PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -tAc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")"
echo ""

# Step 7: Show next steps
echo "🎉 Database initialization completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the application: ./setup.sh"
echo "2. Or start manually: pm2 start ecosystem.config.js"
echo "3. Check application status: pm2 status"
echo ""
echo "Useful commands:"
echo "- Connect to database: psql -h localhost -U $DB_USER -d $DB_NAME"
echo "- List tables: \dt"
echo "- Show table structure: \d table_name"
echo "- Exit psql: \q"
echo ""
echo "For application setup, run: ./setup.sh"
