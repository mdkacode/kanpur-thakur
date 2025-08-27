#!/bin/bash

echo "🔧 Installing ChromeDriver for Mac..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install Homebrew first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome &> /dev/null; then
    echo "❌ Google Chrome is not installed. Please install Chrome first:"
    echo "   brew install --cask google-chrome"
    exit 1
fi

# Install ChromeDriver
echo "📦 Installing ChromeDriver..."
brew install chromedriver

# Check if installation was successful
if command -v chromedriver &> /dev/null; then
    echo "✅ ChromeDriver installed successfully!"
    echo "📍 Location: $(which chromedriver)"
    echo "🔍 Version: $(chromedriver --version)"
else
    echo "❌ ChromeDriver installation failed"
    exit 1
fi

# Check Chrome version
echo "🔍 Checking Chrome version..."
if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version | cut -d' ' -f3 | cut -d'.' -f1)
elif command -v /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome &> /dev/null; then
    CHROME_VERSION=$(/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version | cut -d' ' -f3 | cut -d'.' -f1)
else
    CHROME_VERSION="unknown"
fi

echo "🌐 Chrome version: $CHROME_VERSION"

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
