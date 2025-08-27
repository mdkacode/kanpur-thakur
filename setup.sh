#!/bin/bash

# SheetBC Quick Setup Script
# This script helps with initial server setup and configuration

set -e

echo "🔧 SheetBC Quick Setup Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/root/kanpur-thakur"
DB_NAME="sheetbc_db"
DB_USER="anrag"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for input
prompt() {
    echo -e "${BLUE}$1${NC}"
    read -p "Enter your choice: " choice
    echo "$choice"
}

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

echo "This script will help you set up the SheetBC application."
echo "Please make sure you have completed the initial server setup from the deployment guide."
echo ""

# Step 1: Check prerequisites
log "Checking prerequisites..."

# Check if Node.js is installed
if ! command_exists node; then
    error "Node.js is not installed. Please install Node.js 18.x first."
fi

# Check if npm is installed
if ! command_exists npm; then
    error "npm is not installed. Please install npm first."
fi

# Check if PostgreSQL is installed
if ! command_exists psql; then
    error "PostgreSQL is not installed. Please install PostgreSQL first."
fi

# Check if PM2 is installed
if ! command_exists pm2; then
    log "Installing PM2..."
    npm install -g pm2
fi

# Check if Python is installed
if ! command_exists python3; then
    warn "Python 3 is not installed. Telecare processing may not work."
fi

log "Prerequisites check completed."

# Step 2: Database setup
echo ""
log "Setting up database..."

# Set database password
DB_PASSWORD="Anrag@betU1"

# Test database connection
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
    log "Database connection successful."
else
    error "Database connection failed. Please check your database configuration."
fi

# Step 3: Environment configuration
echo ""
log "Setting up environment configuration..."

# Check if .env.production exists
if [ ! -f "$APP_DIR/.env.production" ]; then
    warn ".env.production file not found. Creating from template..."
    
    # Create .env.production from template
    cat > "$APP_DIR/.env.production" << EOF
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_DIR=$APP_DIR/uploads
MAX_FILE_SIZE=200MB

# Python Environment
PYTHON_PATH=/root/venv/bin/python
PYTHON_SCRIPT_PATH=$APP_DIR/scrap.py

# SSL Configuration (update with your domain)
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
EOF
    
    log "Created .env.production file."
else
    log ".env.production file already exists."
fi

# Step 4: Create required directories
echo ""
log "Creating required directories..."

mkdir -p "$APP_DIR/uploads"
mkdir -p "$APP_DIR/uploads/phone_numbers"
mkdir -p "$APP_DIR/telecare_files"
mkdir -p "$APP_DIR/logs"
mkdir -p "/root/backups"

chmod 755 "$APP_DIR/uploads"
chmod 755 "$APP_DIR/telecare_files"
chmod 755 "$APP_DIR/logs"

log "Directories created successfully."

# Step 5: Install dependencies
echo ""
log "Installing dependencies..."

cd "$APP_DIR"

# Install backend dependencies
log "Installing backend dependencies..."
npm install --production

# Install frontend dependencies
log "Installing frontend dependencies..."
cd frontend
npm install --production

# Build frontend
log "Building frontend..."
npm run build

cd ..

# Step 6: Database migration
echo ""
log "Running database migrations..."

if [ -f "src/database/createTables.js" ]; then
    node src/database/createTables.js
    log "Database tables created."
else
    warn "Database migration script not found."
fi

# Update phone number schema
if [ -f "src/database/updatePhoneNumberSchema.js" ]; then
    node src/database/updatePhoneNumberSchema.js
    log "Phone number schema updated."
else
    warn "Phone number schema update script not found."
fi

# Import initial data
if [ -f "src/database/initial_data.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f src/database/initial_data.sql
    log "Initial data imported."
else
    warn "Initial data script not found."
fi

# Step 7: Start application
echo ""
log "Starting application..."

# Start with PM2 (production mode - backend only)
pm2 start ecosystem.config.js --env production --only sheetbc-api

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

log "Application started with PM2."
log "Backend API running on port 3000"
log "Frontend will be served by Nginx"

# Step 8: Test application
echo ""
log "Testing application..."

sleep 5

# Check if application is running
if curl -f -s http://localhost:3000/api/health >/dev/null; then
    log "Application health check passed."
else
    warn "Application health check failed. Check logs with: pm2 logs sheetbc-api"
fi

# Step 9: Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx (see DEPLOYMENT_GUIDE.md)"
echo "2. Install SSL certificate with Let's Encrypt"
echo "3. Configure firewall"
echo "4. Set up monitoring and backups"
echo ""
echo "Useful commands:"
echo "- Check application status: pm2 status"
echo "- View logs: pm2 logs sheetbc-api"
echo "- Restart application: pm2 restart sheetbc-api"
echo "- Run backup: ./backup.sh"
echo "- Deploy updates: ./deploy.sh"
echo ""
echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
