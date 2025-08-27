#!/bin/bash

echo "🔧 Installing ChromeDriver for Linux Ubuntu..."

# Update package list
echo "📦 Updating package list..."
sudo apt-get update

# Install Chrome
echo "🌐 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install ChromeDriver
echo "📦 Installing ChromeDriver..."
CHROME_VERSION=$(google-chrome --version | cut -d' ' -f3 | cut -d'.' -f1)
echo "🔍 Chrome version: $CHROME_VERSION"

# Download ChromeDriver
CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION")
echo "🔍 ChromeDriver version: $CHROMEDRIVER_VERSION"

wget -O /tmp/chromedriver.zip "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip"
unzip /tmp/chromedriver.zip -d /tmp/
sudo mv /tmp/chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver

# Clean up
rm /tmp/chromedriver.zip

# Check if installation was successful
if command -v chromedriver &> /dev/null; then
    echo "✅ ChromeDriver installed successfully!"
    echo "📍 Location: $(which chromedriver)"
    echo "🔍 Version: $(chromedriver --version)"
else
    echo "❌ ChromeDriver installation failed"
    exit 1
fi

# Test ChromeDriver
echo "🧪 Testing ChromeDriver..."
if chromedriver --version &> /dev/null; then
    echo "✅ ChromeDriver is working correctly!"
else
    echo "❌ ChromeDriver test failed"
    exit 1
fi

echo ""
echo "🎉 ChromeDriver installation complete!"
echo "🚀 You can now run the Python script with improved error handling."
echo ""
echo "📋 Next steps:"
echo "   1. Update the script with your actual login credentials"
echo "   2. Test with a single zipcode"
echo "   3. Monitor the Processing Sessions tab for job status"
