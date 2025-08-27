# 🚀 Cross-Platform Python Script Setup Guide

## 📋 Overview

This guide helps you set up the improved Python script (`scrap_improved.py`) for both Mac (local) and Linux Ubuntu (server) environments.

## 🔧 Key Improvements Made

### 1. **Enhanced Error Handling**
- ✅ Multiple strategies to find file input elements
- ✅ Better error messages and debugging information
- ✅ Enhanced logging to stderr (doesn't interfere with CSV output)
- ✅ Timeout handling for element detection
- ✅ Page source logging for debugging

### 2. **Cross-Platform Compatibility**
- ✅ **Mac (Intel/ARM64)**: Specific ChromeDriver detection for M1/M2 chips
- ✅ **Linux Ubuntu**: Optimized for server environments
- ✅ **Windows**: Fallback support
- ✅ Platform-specific Chrome options and user agents

### 3. **Processing Sessions Integration**
- ✅ All Python script jobs tracked in Processing Sessions tab
- ✅ 10-second delays between batch jobs
- ✅ Detailed error logging and session status updates
- ✅ File generation tracking
- ✅ Real-time progress monitoring

## 🖥️ Local Setup (Mac)

### Step 1: Install ChromeDriver
```bash
# Run the installation script
./install_chromedriver_mac.sh
```

### Step 2: Update Script Credentials
Edit `scrap_improved.py` and update:
```python
USERNAME = "your_actual_username"
PASSWORD = "your_actual_password"
```

### Step 3: Test Installation
```bash
# Check if ChromeDriver is working
chromedriver --version

# Check if Chrome is installed
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

## 🖥️ Server Setup (Linux Ubuntu)

### Step 1: Install ChromeDriver
```bash
# Run the installation script
./install_chromedriver_linux.sh
```

### Step 2: Update Script Credentials
Edit `scrap_improved.py` and update:
```python
USERNAME = "your_actual_username"
PASSWORD = "your_actual_password"
```

### Step 3: Test Installation
```bash
# Check if ChromeDriver is working
chromedriver --version

# Check if Chrome is installed
google-chrome --version
```

## 🔍 Troubleshooting

### Common Issues

#### 1. **ChromeDriver Not Found**
**Error**: `ChromeDriver compatibility issue`
**Solution**: 
- Mac: Run `./install_chromedriver_mac.sh`
- Linux: Run `./install_chromedriver_linux.sh`

#### 2. **File Input Element Not Found**
**Error**: `no such element: Unable to locate element`
**Solution**: The improved script now uses multiple strategies:
- CSS selector: `input[type='file']`
- Name attribute: `name="filename"`
- Comprehensive search through all inputs
- Page source logging for debugging

#### 3. **ARM64 Mac Issues**
**Error**: `macOS ARM64 compatibility`
**Solution**: The script now automatically detects ARM64 Macs and tries:
- `/usr/local/bin/chromedriver`
- `/opt/homebrew/bin/chromedriver`
- `/usr/bin/chromedriver`

#### 4. **Linux Server Issues**
**Error**: `ChromeDriver setup issue`
**Solution**: The script includes Linux-specific options:
- `--disable-dev-shm-usage`
- `--no-sandbox`
- Linux user agent

## 📊 Processing Sessions Monitoring

### View All Jobs
1. Go to **Comprehensive Dashboard** → **Processing Sessions Tab**
2. See all Python script jobs with:
   - Session ID and type
   - Zipcodes being processed
   - Applied filters
   - Records processed
   - Generated files
   - Status and duration

### Job Types
- **`python_script_processing`**: Single zipcode processing
- **`batch_python_processing`**: Multiple zipcodes with 10-second delays
- **`npa_nxx_processing`**: NPA NXX processing
- **`demographic_upload`**: File upload processing

### Error Tracking
- ✅ Failed jobs are marked as "failed" in Processing Sessions
- ✅ Detailed error messages in session details
- ✅ Error logs in console output
- ✅ Session status updates in real-time

## 🚀 Usage

### Single Zipcode Processing
```javascript
// The system automatically creates a processing session
const result = await pythonProcessor.processMissing('10001', filterConfig, userId);
```

### Batch Processing (with 10-second delays)
```javascript
// Multiple zipcodes processed with delays
const result = await pythonProcessor.processMultipleZipcodes(
  ['10001', '10002', '10003'], 
  filterConfig, 
  userId
);
```

### Monitor Progress
1. Check **Processing Sessions Tab** for real-time status
2. Click **Details** on any session to see:
   - Applied filter criteria
   - Generated files
   - Error messages (if any)
   - Processing duration

## 📈 Performance Features

### Batch Processing
- ✅ **10-second delays** between jobs to prevent overload
- ✅ **Progress tracking** (1/5, 2/5, etc.)
- ✅ **Error isolation** (failed jobs don't stop the batch)
- ✅ **Session management** (single session for entire batch)

### Error Recovery
- ✅ **Multiple ChromeDriver strategies**
- ✅ **Element detection fallbacks**
- ✅ **Detailed error logging**
- ✅ **Session status updates**

### File Management
- ✅ **Automatic file tracking** in Processing Sessions
- ✅ **File download links** (ready for implementation)
- ✅ **File metadata** (size, record count, type)
- ✅ **Cleanup** of temporary files

## 🎯 Next Steps

1. **Update credentials** in `scrap_improved.py`
2. **Install ChromeDriver** using the provided scripts
3. **Test with single zipcode** first
4. **Monitor Processing Sessions** tab for job status
5. **Check logs** for detailed error information
6. **Scale to batch processing** once single jobs work

## 📞 Support

If you encounter issues:
1. Check the **Processing Sessions Tab** for error details
2. Look at the console logs for Python script output
3. Verify ChromeDriver installation with the provided scripts
4. Check that credentials are correctly set in the script

The improved system now provides complete visibility into all Python script processing with robust error handling and cross-platform compatibility! 🚀
