#!/bin/bash

# SheetBC Database Reset Script
# This script drops all tables and recreates them fresh

set -e

echo "🗑️ SheetBC Database Reset Script"
echo "================================"

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

# Test database connection
log "Testing database connection..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    error "Database connection failed. Please run create_database.sh first."
fi

log "✅ Database connection successful!"

# Confirm reset
echo ""
warn "This will DROP ALL TABLES in the database. This action cannot be undone!"
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    log "Database reset cancelled."
    exit 0
fi

# Drop all tables
log "Dropping all existing tables..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS phone_number_downloads CASCADE;
DROP TABLE IF EXISTS phone_number_generations CASCADE;
DROP TABLE IF EXISTS phone_numbers CASCADE;
DROP TABLE IF EXISTS phone_number_jobs CASCADE;
DROP TABLE IF EXISTS telecare_output_rows CASCADE;
DROP TABLE IF EXISTS telecare_runs CASCADE;
DROP TABLE IF EXISTS download_tracking CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS user_filters CASCADE;
DROP TABLE IF EXISTS demographic_records CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS timezones CASCADE;
"

log "✅ All tables dropped successfully!"

# Show empty database
log "Verifying database is empty..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
"

log "✅ Database reset completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run database initialization: ./init_database.sh"
echo "2. Start the application: ./setup.sh"
echo ""
