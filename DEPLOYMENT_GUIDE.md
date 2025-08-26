# 🚀 Production Deployment Guide

## Ubuntu Server Setup with Nginx, SSL, and Node.js Application

This guide will help you deploy the SheetBC application to production on an Ubuntu server with Nginx reverse proxy and SSL certificates.

---

## 📋 Prerequisites

- Ubuntu 20.04 LTS or 22.04 LTS server
- Root or sudo access
- Domain name pointing to your server IP
- SSH access to the server

---

## 🛠️ Step 1: Initial Server Setup

### 1.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Essential Packages
```bash
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.3 Verify Root Access
```bash
# Ensure you have root access
sudo whoami

# You should see 'root' as output
```

---

## 🐍 Step 2: Install Python and Dependencies

### 2.1 Install Python 3.9+
```bash
sudo apt install -y python3 python3-pip python3-venv

# Verify installation
python3 --version
pip3 --version
```

### 2.2 Install Python Dependencies for Telecare Processing
```bash
# Install system dependencies for Selenium
sudo apt install -y chromium-browser chromium-chromedriver

# Create Python virtual environment
python3 -m venv /root/venv
source /root/venv/bin/activate

# Install Python packages (if you have requirements.txt)
pip install selenium pandas requests beautifulsoup4
```

---

## 🗄️ Step 3: Install and Configure PostgreSQL

### 3.1 Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 3.2 Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE sheetbc_db;
CREATE USER sheetbc_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sheetbc_db TO sheetbc_user;
ALTER USER sheetbc_user CREATEDB;

# Exit PostgreSQL
\q
```

### 3.3 Configure PostgreSQL for Remote Access (Optional)
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Uncomment and modify:
# listen_addresses = 'localhost'

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add line for local connections:
# local   all             sheetbc_user                                md5
```

---

## 🟢 Step 4: Install Node.js and npm

### 4.1 Install Node.js 18.x LTS
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 4.2 Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

---

## 📁 Step 5: Deploy Application Code

### 5.1 Clone Application Repository
```bash
# Navigate to root directory
cd /root

# Clone your repository
git clone https://github.com/your-username/sheetbc.git kanpur-thakur
cd kanpur-thakur

# Install dependencies
npm install
```

### 5.2 Create Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment file
nano .env.production
```

**Environment Configuration:**
```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sheetbc_db
DB_USER=sheetbc_user
DB_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_DIR=/root/kanpur-thakur/uploads
MAX_FILE_SIZE=100MB

# Python Environment
PYTHON_PATH=/root/venv/bin/python
PYTHON_SCRIPT_PATH=/root/kanpur-thakur/scrap.py

# SSL Configuration (if using Let's Encrypt)
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 5.3 Create Required Directories
```bash
# Create upload directories
mkdir -p /root/kanpur-thakur/uploads
mkdir -p /root/kanpur-thakur/uploads/phone_numbers
mkdir -p /root/kanpur-thakur/telecare_files
mkdir -p /root/kanpur-thakur/logs

# Set proper permissions
chmod 755 /root/kanpur-thakur/uploads
chmod 755 /root/kanpur-thakur/telecare_files
chmod 755 /root/kanpur-thakur/logs
```

---

## 🗄️ Step 6: Database Setup

### 6.1 Run Database Migrations
```bash
# Navigate to application directory
cd /root/kanpur-thakur

# Run database setup scripts
node src/database/migratePhoneNumbers.js
node src/database/createTables.js
node src/database/updatePhoneNumberSchema.js

# Import initial data if needed
psql -h localhost -U anrag -d sheetbc_db -f src/database/initial_data.sql
```

### 6.2 Database Schema Files

Create the following SQL files in `src/database/`:

**`createTables.sql`:**
```sql
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip);
CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx);
CREATE INDEX IF NOT EXISTS idx_records_timezone ON records(timezone_id);
CREATE INDEX IF NOT EXISTS idx_demographic_records_zipcode ON demographic_records(zipcode);
CREATE INDEX IF NOT EXISTS idx_telecare_runs_zip ON telecare_runs(zip);
CREATE INDEX IF NOT EXISTS idx_telecare_runs_status ON telecare_runs(status);
```

**`initial_data.sql`:**
```sql
-- Insert sample timezone data
INSERT INTO timezones (timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst, description, states) VALUES
('America/New_York', 'Eastern Time', 'EST', 'EDT', '-05:00', '-04:00', true, 'Eastern Standard/Daylight Time', 'NY,PA,NJ,DE,MD,DC,VA,NC,SC,GA,FL,OH,IN,KY,TN,AL,MS,WV'),
('America/Chicago', 'Central Time', 'CST', 'CDT', '-06:00', '-05:00', true, 'Central Standard/Daylight Time', 'IL,WI,MI,IN,KY,TN,AL,MS,AR,LA,OK,TX,KS,NE,IA,MO,MN,ND,SD'),
('America/Denver', 'Mountain Time', 'MST', 'MDT', '-07:00', '-06:00', true, 'Mountain Standard/Daylight Time', 'CO,WY,MT,ID,UT,AZ,NM,TX,KS,NE,SD,ND'),
('America/Los_Angeles', 'Pacific Time', 'PST', 'PDT', '-08:00', '-07:00', true, 'Pacific Standard/Daylight Time', 'CA,WA,OR,NV,ID'),
('America/Anchorage', 'Alaska Time', 'AKST', 'AKDT', '-09:00', '-08:00', true, 'Alaska Standard/Daylight Time', 'AK'),
('Pacific/Honolulu', 'Hawaii Time', 'HST', 'HDT', '-10:00', '-09:00', true, 'Hawaii Standard/Daylight Time', 'HI'),
('America/Phoenix', 'Arizona Time', 'MST', 'MST', '-07:00', '-07:00', false, 'Arizona Mountain Standard Time (No DST)', 'AZ');
```

---

## 🌐 Step 7: Install and Configure Nginx

### 7.1 Install Nginx
```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

### 7.2 Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/sheetbc
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be updated after Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Client Max Body Size for File Uploads
    client_max_body_size 100M;
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Frontend Static Files
    location / {
        root /root/kanpur-thakur/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # File Uploads (if needed)
    location /uploads/ {
        alias /root/kanpur-thakur/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

### 7.3 Enable Site and Test Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sheetbc /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 8: Install SSL Certificate with Let's Encrypt

### 8.1 Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 8.2 Set Up Automatic Renewal
```bash
# Add to crontab for automatic renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🚀 Step 9: Build and Deploy Application

### 9.1 Build Frontend
```bash
# Navigate to frontend directory
cd /root/kanpur-thakur/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 9.2 Configure PM2
```bash
# Navigate to application root
cd /root/kanpur-thakur

# Create PM2 ecosystem file
nano ecosystem.config.js
```

**PM2 Configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'sheetbc-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/root/kanpur-thakur/logs/err.log',
    out_file: '/root/kanpur-thakur/logs/out.log',
    log_file: '/root/kanpur-thakur/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 9.3 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

# Follow the instructions provided by the above command
```

---

## 🔧 Step 10: Final Configuration and Testing

### 10.1 Set Up Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/sheetbc
```

**Logrotate Configuration:**
```
/root/kanpur-thakur/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 10.2 Configure Firewall
```bash
# Install UFW if not installed
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### 10.3 Test Application
```bash
# Check application status
pm2 status
pm2 logs

# Test API endpoints
curl -k https://yourdomain.com/api/health
curl -k https://yourdomain.com/api/v1/records
```

---

## 📊 Step 11: Monitoring and Maintenance

### 11.1 Set Up Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor application
pm2 monit
```

### 11.2 Backup Strategy
```bash
# Create backup script
nano /home/sheetbc/backup.sh
```

**Backup Script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
DB_NAME="sheetbc_db"
DB_USER="sheetbc_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /root/kanpur-thakur/uploads /root/kanpur-thakur/telecare_files

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make backup script executable
chmod +x /root/backup.sh

# Add to crontab for daily backups
crontab -e

# Add this line:
0 2 * * * /root/backup.sh
```

---

## 🔄 Step 12: Deployment Scripts

### 12.1 Create Deployment Script
```bash
nano /root/deploy.sh
```

**Deployment Script:**
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to application directory
cd /root/kanpur-thakur

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Restart application
pm2 restart sheetbc-api

# Check status
pm2 status

echo "✅ Deployment completed successfully!"
```

```bash
# Make deployment script executable
chmod +x /root/deploy.sh
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

**1. Application Won't Start**
```bash
# Check logs
pm2 logs sheetbc-api

# Check environment variables
pm2 env sheetbc-api

# Restart application
pm2 restart sheetbc-api
```

**2. Database Connection Issues**
```bash
# Test database connection
psql -h localhost -U sheetbc_user -d sheetbc_db

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**3. Nginx Issues**
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**4. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep "Not After"
```

---

## 📞 Support

For additional support:
- Check application logs: `pm2 logs`
- Check system logs: `sudo journalctl -u nginx`
- Monitor system resources: `htop`
- Check disk space: `df -h`

---

## ✅ Deployment Checklist

- [ ] Server updated and secured
- [ ] Python environment configured
- [ ] PostgreSQL installed and configured
- [ ] Node.js and PM2 installed
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Application running with PM2
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Application tested and working

---

**🎉 Congratulations! Your SheetBC application is now deployed and running in production!**
