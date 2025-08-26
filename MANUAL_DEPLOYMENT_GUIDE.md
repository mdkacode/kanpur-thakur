# SheetBC Manual Production Deployment Guide

This guide provides step-by-step instructions to deploy the application to production and fix all database issues.

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
# Make the script executable
chmod +x deploy_to_production.sh

# Run the deployment
./deploy_to_production.sh
```

### Option 2: Manual Deployment
Follow the steps below if you prefer to run commands manually.

## 📋 Manual Deployment Steps

### Step 1: Connect to Production Server
```bash
ssh root@157.180.70.168
```

### Step 2: Navigate to Application Directory
```bash
cd /root/kanpur-thakur
```

### Step 3: Check Current Status
```bash
# Check PM2 status
pm2 status

# Check database
psql -h localhost -U postgres -d sheetbc_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 4: Stop Application
```bash
pm2 stop all
pm2 delete all
```

### Step 5: Backup Database (Optional)
```bash
# Create backup directory
mkdir -p /root/backups

# Create backup
pg_dump -h localhost -U postgres sheetbc_db > /root/backups/sheetbc_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 6: Update Code (if using git)
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install
```

### Step 7: Fix Database Schema Issues
```bash
# Fix column name references in Record.js
sed -i 's/r\.rc/r.county/g' src/models/Record.js
sed -i 's/filters\.rc/filters.county/g' src/models/Record.js

# Fix column name references in DemographicRecord.js
sed -i 's/dr\.zipcode/dr.zip_code/g' src/models/DemographicRecord.js
sed -i 's/row\.zipcode/row.zip_code/g' src/models/DemographicRecord.js

# Fix column name references in demographicFileProcessor.js
sed -i 's/record\.zipcode/record.zip_code/g' src/services/demographicFileProcessor.js

# Remove states table references
sed -i '/states WHERE state_code/d' src/models/Record.js
sed -i '/state_id/d' src/models/Record.js

# Note: Integer column handling (timezone_id, population) has been fixed in DemographicRecord.js
# The extractValues method now properly handles empty strings for integer columns
```

### Step 8: Run Database Seeding
```bash
# Run complete database seeding
npm run seed:complete

# Populate US timezones
npm run seed:timezones

# Verify timezones
psql -h localhost -U postgres -d sheetbc_db -c "SELECT id, display_name, abbreviation_standard, utc_offset_standard FROM timezones ORDER BY utc_offset_standard DESC;"
```

### Step 9: Test Models
```bash
# Test Record model
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

# Test DemographicRecord model
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
```

### Step 10: Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production --only sheetbc-api

# Check status
pm2 status

# Check logs
pm2 logs sheetbc-api
```

### Step 11: Test Application
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test API endpoint
curl http://localhost:3000/api/v1/health

# Test Nginx proxy
curl -k https://157.180.70.168/health
```

## 🔧 Verification Commands

### Check Database Structure
```bash
# List all tables
psql -h localhost -U postgres -d sheetbc_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Check timezone data
psql -h localhost -U postgres -d sheetbc_db -c "SELECT id, timezone_name, display_name FROM timezones ORDER BY id;"

# Check table counts
psql -h localhost -U postgres -d sheetbc_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
```

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs sheetbc-api

# Recent logs
pm2 logs sheetbc-api --lines 20
```

### Test Endpoints
```bash
# Health check
curl -s http://localhost:3000/health

# API health
curl -s http://localhost:3000/api/v1/health

# Production URL
curl -s -k https://157.180.70.168/health
```

## 🚨 Troubleshooting

### If Database Seeding Fails
```bash
# Check database connection
psql -h localhost -U postgres -d sheetbc_db -c "SELECT 1;"

# Check if database exists
psql -h localhost -U postgres -c "\l" | grep sheetbc_db

# Create database if it doesn't exist
createdb -h localhost -U postgres sheetbc_db
```

### If Application Won't Start
```bash
# Check PM2 logs
pm2 logs sheetbc-api

# Check if port is in use
netstat -tlnp | grep :3000

# Kill process if needed
pkill -f node
```

### If Models Still Have Errors
```bash
# Check specific model
node -e "const Record = require('./src/models/Record'); console.log('Record model loaded successfully');"

# Check database schema
psql -h localhost -U postgres -d sheetbc_db -c "\d records"
psql -h localhost -U postgres -d sheetbc_db -c "\d demographic_records"
```

## 📊 Useful Commands

### Database Management
```bash
# Connect to database
psql -h localhost -U postgres -d sheetbc_db

# List tables
\dt

# Check table structure
\d table_name

# Count records
SELECT COUNT(*) FROM table_name;
```

### Application Management
```bash
# Restart application
pm2 restart sheetbc-api

# Stop application
pm2 stop sheetbc-api

# Delete application
pm2 delete sheetbc-api

# Monitor logs
pm2 logs sheetbc-api --lines 50
```

### File Management
```bash
# Check application directory
ls -la /root/kanpur-thakur/

# Check logs directory
ls -la /root/kanpur-thakur/logs/

# Check backups
ls -la /root/backups/
```

## 🎯 Expected Results

After successful deployment:

- ✅ **12 database tables** created
- ✅ **6 timezone records** populated
- ✅ **PM2 application** running
- ✅ **Health endpoints** responding
- ✅ **No database errors** in logs
- ✅ **Application accessible** at https://157.180.70.168

## 🌐 Application URLs

- **Production**: https://157.180.70.168
- **API Health**: https://157.180.70.168/api/v1/health
- **Backend**: http://localhost:3000 (internal)

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs sheetbc-api`
2. Check database: `psql -h localhost -U postgres -d sheetbc_db`
3. Check Nginx: `systemctl status nginx`
4. Check firewall: `ufw status`
