#!/bin/bash

echo "🔧 Fixing ChromeDriver installation on Ubuntu server..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt update -y

# Install required dependencies
echo "📦 Installing required dependencies..."
apt install -y wget unzip curl software-properties-common apt-transport-https ca-certificates gnupg

# Remove existing ChromeDriver installations
echo "🧹 Removing existing ChromeDriver installations..."
rm -rf /root/.wdm
rm -rf /usr/local/bin/chromedriver
rm -rf /usr/bin/chromedriver

# Install Google Chrome
echo "🌐 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt update -y
apt install -y google-chrome-stable

# Get Chrome version
CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | awk -F'.' '{print $1}')
echo "🔍 Detected Chrome version: $CHROME_VERSION"

# Download and install ChromeDriver manually
echo "📥 Downloading ChromeDriver version $CHROME_VERSION..."
cd /tmp
wget -O chromedriver.zip "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION"
LATEST_VERSION=$(cat chromedriver.zip)
echo "📥 Latest ChromeDriver version: $LATEST_VERSION"

wget -O chromedriver.zip "https://chromedriver.storage.googleapis.com/$LATEST_VERSION/chromedriver_linux64.zip"
unzip -o chromedriver.zip
chmod +x chromedriver

# Move to system path
mv chromedriver /usr/local/bin/
ln -sf /usr/local/bin/chromedriver /usr/bin/chromedriver

# Verify installation
echo "✅ ChromeDriver installation verification:"
chromedriver --version

# Clean up
rm -f chromedriver.zip
rm -f LATEST_RELEASE_*

# Set up Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd /root/kanpur-thakur

# Remove existing venv if corrupted
if [ -d "venv" ]; then
    echo "🧹 Removing existing virtual environment..."
    rm -rf venv
fi

# Create new virtual environment
echo "🔧 Creating new virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install selenium webdriver-manager requests beautifulsoup4 pandas

# Test ChromeDriver
echo "🧪 Testing ChromeDriver..."
python3 -c "
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-gpu')
options.add_argument('--remote-debugging-port=9222')

try:
    driver = webdriver.Chrome(options=options)
    print('✅ ChromeDriver test successful!')
    driver.quit()
except Exception as e:
    print(f'❌ ChromeDriver test failed: {e}')
"

echo "🎉 ChromeDriver fix completed!"
echo "📝 Next steps:"
echo "   1. Restart your PM2 processes: pm2 restart all"
echo "   2. Test telecare processing again"
echo "   3. Check logs: pm2 logs sheetbc-api"
