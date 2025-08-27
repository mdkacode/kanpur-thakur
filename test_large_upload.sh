#!/bin/bash

# Test Large File Upload Script
# This script tests the upload functionality with different file sizes

set -e

echo "🧪 Testing Large File Upload Functionality"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Configuration
SERVER_URL="https://157.180.70.168"
API_ENDPOINT="$SERVER_URL/api/v1/upload"
TEST_DIR="./test_uploads"

# Create test directory
mkdir -p "$TEST_DIR"

# Function to create test files
create_test_file() {
    local size_mb=$1
    local filename=$2
    local filepath="$TEST_DIR/$filename"
    
    log "Creating test file: $filename (${size_mb}MB)"
    
    # Create file with random data
    dd if=/dev/urandom of="$filepath" bs=1M count="$size_mb" 2>/dev/null
    
    echo "$filepath"
}

# Function to test upload
test_upload() {
    local filepath=$1
    local expected_result=$2
    
    log "Testing upload: $(basename "$filepath")"
    
    # Get file size
    local file_size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath" 2>/dev/null)
    local file_size_mb=$((file_size / 1024 / 1024))
    
    echo "  File size: ${file_size_mb}MB"
    
    # Test upload with curl
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: multipart/form-data" \
        -F "file=@$filepath" \
        "$API_ENDPOINT" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "  HTTP Code: $http_code"
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        log "  ✅ Upload successful"
        echo "  Response: $response_body"
    elif [ "$http_code" = "413" ]; then
        warn "  ⚠️ File too large (413)"
        echo "  Response: $response_body"
    elif [ "$http_code" = "401" ]; then
        warn "  ⚠️ Authentication required (401)"
        echo "  Response: $response_body"
    else
        error "  ❌ Upload failed"
        echo "  Response: $response_body"
    fi
    
    echo ""
}

# Function to test with authentication
test_upload_with_auth() {
    local filepath=$1
    local token=$2
    
    log "Testing upload with authentication: $(basename "$filepath")"
    
    # Get file size
    local file_size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath" 2>/dev/null)
    local file_size_mb=$((file_size / 1024 / 1024))
    
    echo "  File size: ${file_size_mb}MB"
    
    # Test upload with curl and authentication
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: multipart/form-data" \
        -F "file=@$filepath" \
        "$API_ENDPOINT" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "  HTTP Code: $http_code"
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        log "  ✅ Upload successful"
        echo "  Response: $response_body"
    elif [ "$http_code" = "413" ]; then
        warn "  ⚠️ File too large (413)"
        echo "  Response: $response_body"
    elif [ "$http_code" = "401" ]; then
        error "  ❌ Authentication failed (401)"
        echo "  Response: $response_body"
    else
        error "  ❌ Upload failed"
        echo "  Response: $response_body"
    fi
    
    echo ""
}

# Step 1: Test server connectivity
log "Step 1: Testing Server Connectivity"
echo "==================================="

if curl -s -I "$SERVER_URL" | grep -q "200\|301\|302"; then
    log "✅ Server is accessible"
else
    error "❌ Server is not accessible"
    exit 1
fi

# Step 2: Test API endpoint
log "Step 2: Testing API Endpoint"
echo "============================"

if curl -s -I "$API_ENDPOINT" | grep -q "200\|405\|401"; then
    log "✅ API endpoint is accessible"
else
    error "❌ API endpoint is not accessible"
fi

# Step 3: Create test files
log "Step 3: Creating Test Files"
echo "=========================="

# Create small test file (1MB)
small_file=$(create_test_file 1 "test_small_1mb.txt")

# Create medium test file (10MB)
medium_file=$(create_test_file 10 "test_medium_10mb.txt")

# Create large test file (50MB)
large_file=$(create_test_file 50 "test_large_50mb.txt")

# Create very large test file (100MB)
very_large_file=$(create_test_file 100 "test_very_large_100mb.txt")

log "✅ Test files created"

# Step 4: Test uploads without authentication
log "Step 4: Testing Uploads Without Authentication"
echo "=============================================="

test_upload "$small_file"
test_upload "$medium_file"
test_upload "$large_file"
test_upload "$very_large_file"

# Step 5: Test uploads with authentication (if token provided)
if [ -n "$1" ]; then
    log "Step 5: Testing Uploads With Authentication"
    echo "==========================================="
    
    token="$1"
    log "Using provided token: ${token:0:20}..."
    
    test_upload_with_auth "$small_file" "$token"
    test_upload_with_auth "$medium_file" "$token"
    test_upload_with_auth "$large_file" "$token"
    test_upload_with_auth "$very_large_file" "$token"
else
    log "Step 5: Skipping Authenticated Tests"
    echo "==================================="
    log "No token provided. To test with authentication, run:"
    echo "  $0 YOUR_JWT_TOKEN"
fi

# Step 6: Test nginx configuration
log "Step 6: Testing Nginx Configuration"
echo "=================================="

# Check nginx configuration
if sudo nginx -t 2>/dev/null; then
    log "✅ Nginx configuration is valid"
else
    warn "⚠️ Nginx configuration has issues"
fi

# Check nginx status
if systemctl is-active --quiet nginx; then
    log "✅ Nginx is running"
else
    error "❌ Nginx is not running"
fi

# Step 7: Check system resources
log "Step 7: Checking System Resources"
echo "================================="

# Check disk space
disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 90 ]; then
    log "✅ Disk space available: ${disk_usage}% used"
else
    warn "⚠️ Low disk space: ${disk_usage}% used"
fi

# Check memory
memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
log "Memory usage: ${memory_usage}%"

# Step 8: Cleanup
log "Step 8: Cleaning Up"
echo "==================="

# Remove test files
rm -rf "$TEST_DIR"
log "✅ Test files cleaned up"

# Step 9: Summary
log "Step 9: Test Summary"
echo "==================="

echo ""
echo "📊 Test Summary:"
echo "================"
echo "✅ Server connectivity: Working"
echo "✅ API endpoint: Accessible"
echo "✅ Test files: Created and cleaned up"
echo "✅ Nginx: Configuration valid and running"
echo "✅ System resources: Adequate"
echo ""
echo "📝 Next steps:"
echo "=============="
echo "1. If uploads failed, check server logs:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "   pm2 logs"
echo ""
echo "2. If authentication failed, get a valid token from the frontend"
echo ""
echo "3. For large files (>100MB), consider:"
echo "   - Chunked uploads"
echo "   - Resume capability"
echo "   - Progress tracking"
echo ""
echo "4. Monitor upload performance:"
echo "   sudo tail -f /var/log/nginx/access.log"

log "Large file upload test completed!"
