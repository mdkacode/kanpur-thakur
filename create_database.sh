#!/bin/bash

# SheetBC Database Setup Script
# This script creates the database and user for the SheetBC application

set -e

echo "🗄️ SheetBC Database Setup Script"
echo "=================================="

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

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    log "Starting PostgreSQL service..."
    systemctl start postgresql
    systemctl enable postgresql
fi

log "PostgreSQL service is running."

# Step 1: Create database user
log "Creating database user '$DB_USER'..."

# Check if user already exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")

if [ "$USER_EXISTS" = "1" ]; then
    warn "User '$DB_USER' already exists. Updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    log "Creating new user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Step 2: Create database
log "Creating database '$DB_NAME'..."

# Check if database already exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    warn "Database '$DB_NAME' already exists."
else
    log "Creating new database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
fi

# Step 3: Grant privileges
log "Granting privileges to user '$DB_USER'..."

# Grant all privileges on the database
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Grant CREATE privilege (needed for creating tables)
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

# Step 4: Test connection
log "Testing database connection..."

# Test connection with the new user
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "✅ Database connection successful!"
else
    error "❌ Database connection failed. Please check your configuration."
fi

# Step 5: Create required extensions (if needed)
log "Setting up database extensions..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- Enable JSONB for storing JSON data
CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";

-- Show current extensions
SELECT extname, extversion FROM pg_extension;
"

# Step 6: Show database information
log "Database setup completed successfully!"
echo ""
echo "📊 Database Information:"
echo "========================"
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Database Password: $DB_PASSWORD"
echo "Host: localhost"
echo "Port: 5432"
echo ""

# Step 7: Show connection string
echo "🔗 Connection String:"
echo "====================="
echo "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""

# Step 8: Test with sample query
log "Running sample query to verify setup..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Show current user and database
SELECT current_user as \"Current User\", current_database() as \"Current Database\";

-- Show database size
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as \"Database Size\";

-- Show tables (will be empty initially)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
"

# Step 9: Create a test table to verify permissions
log "Creating test table to verify permissions..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
-- Create a test table
CREATE TABLE IF NOT EXISTS test_setup (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO test_setup (message) VALUES ('Database setup completed successfully!');

-- Query test data
SELECT * FROM test_setup;

-- Clean up test table
DROP TABLE test_setup;
"

log "✅ Test table created and dropped successfully!"

# Step 10: Show next steps
echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run the application setup script: ./setup.sh"
echo "2. The application will automatically create all required tables"
echo "3. Import initial data if needed"
echo ""
echo "Useful commands:"
echo "- Connect to database: psql -h localhost -U $DB_USER -d $DB_NAME"
echo "- List tables: \dt"
echo "- Show table structure: \d table_name"
echo "- Exit psql: \q"
echo ""
echo "For application setup, run: ./setup.sh"
