# File Upload Fixes for 300MB Files

This document describes the fixes implemented to handle large file uploads (up to 300MB) in the SheetBC application.

## Problem Description

The original system had several issues preventing successful upload of large files (300MB):

1. **Inconsistent file size limits** across different components
2. **Short timeout settings** causing upload cancellations
3. **Missing nginx configuration** for large file uploads
4. **No real-time progress tracking** for large uploads

## Fixes Implemented

### 1. Backend File Size Limits

#### Updated Files:
- `src/middleware/upload.js`
- `src/routes/demographicUploadRoutes.js`

#### Changes:
```javascript
// Before
fileSize: 100 * 1024 * 1024, // 100MB limit

// After  
fileSize: 300 * 1024 * 1024, // 300MB limit
```

### 2. Frontend File Size Validation

#### Updated Files:
- `frontend/src/components/FileUpload.tsx`

#### Changes:
```typescript
// Before
if (file.size > 200 * 1024 * 1024) {
  message.error('File size must be less than 200MB');
  return;
}

// After
if (file.size > 300 * 1024 * 1024) {
  message.error('File size must be less than 300MB');
  return;
}
```

### 3. API Client Timeout Configuration

#### Updated Files:
- `frontend/src/api/client.ts`

#### Changes:
```typescript
// Before
timeout: 30000, // 30 seconds

// After
timeout: 600000, // 10 minutes for large file uploads
```

### 4. Real-time Upload Progress

#### Updated Files:
- `frontend/src/api/uploadApi.ts`
- `frontend/src/components/FileUpload.tsx`

#### Changes:
```typescript
// Added progress tracking to upload API
uploadFile: async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
  // ... existing code ...
  onUploadProgress: (progressEvent) => {
    if (onProgress && progressEvent.total) {
      const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(progress);
    }
  },
}

// Updated component to use real progress instead of simulation
const response = await uploadApi.uploadFile(file, (progress) => {
  setUploadProgress(progress);
});
```

### 5. Nginx Configuration Updates

#### New File:
- `update_nginx_upload_limits.sh`

#### Configuration Changes:
```nginx
# Before
client_max_body_size 100M;
proxy_read_timeout 300s;

# After
client_max_body_size 300M;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

## Usage Instructions

### 1. Update Nginx Configuration (Server)

```bash
# Run the nginx update script (requires sudo)
sudo npm run update:nginx-limits

# Or run directly
sudo ./update_nginx_upload_limits.sh
```

### 2. Restart Services

```bash
# Restart nginx
sudo systemctl restart nginx

# Restart Node.js application
pm2 restart all
# or
npm run dev
```

### 3. Test Large File Upload

1. Navigate to the upload page
2. Select a file larger than 100MB (up to 300MB)
3. Upload should proceed with real-time progress
4. No timeout or cancellation errors

## Configuration Summary

### File Size Limits
- **Backend (Multer)**: 300MB
- **Frontend Validation**: 300MB  
- **Nginx**: 300MB

### Timeout Settings
- **API Client**: 10 minutes (600,000ms)
- **Nginx proxy_read_timeout**: 600 seconds
- **Nginx proxy_send_timeout**: 600 seconds
- **Nginx proxy_connect_timeout**: 75 seconds

### Progress Tracking
- **Real-time upload progress** instead of simulation
- **Progress callback** for accurate percentage display
- **Error handling** for failed uploads

## Monitoring and Troubleshooting

### Check Upload Status
```bash
# Monitor nginx access logs
sudo tail -f /var/log/nginx/access.log

# Monitor nginx error logs
sudo tail -f /var/log/nginx/error.log

# Monitor application logs
pm2 logs
# or
npm run dev
```

### Common Issues and Solutions

#### 1. Upload Still Fails After Changes
```bash
# Check nginx configuration
sudo nginx -t

# Restart nginx completely
sudo systemctl restart nginx

# Check file permissions
ls -la uploads/
```

#### 2. Timeout Errors
```bash
# Increase timeout further if needed
# Edit nginx configuration manually
sudo nano /etc/nginx/sites-available/your-site

# Add or update:
client_max_body_size 500M;
proxy_read_timeout 900s;
proxy_send_timeout 900s;
```

#### 3. Memory Issues
```bash
# Monitor server memory usage
htop
free -h

# Check disk space
df -h
```

### Performance Considerations

#### For Very Large Files (>500MB)
1. Consider implementing **chunked uploads**
2. Add **resume capability** for interrupted uploads
3. Implement **background processing** for file parsing
4. Use **streaming** instead of loading entire file into memory

#### Server Resources
- **Memory**: Ensure sufficient RAM for file processing
- **Disk Space**: Monitor upload directory space
- **CPU**: Large files may require significant processing time
- **Network**: Consider bandwidth limitations

## Testing

### Test Cases
1. **Small files** (< 10MB) - Should work as before
2. **Medium files** (10-100MB) - Should work with progress
3. **Large files** (100-300MB) - Should work with longer timeouts
4. **Very large files** (>300MB) - Should be rejected with clear error

### Test Commands
```bash
# Test with curl (replace with your actual endpoint)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large_file.csv" \
  https://your-domain.com/api/v1/upload

# Test nginx configuration
sudo nginx -t

# Test file upload endpoint
curl -I https://your-domain.com/api/v1/upload
```

## Rollback Instructions

If issues occur, you can rollback the changes:

### 1. Restore Nginx Configuration
```bash
# Find backup files
sudo find /etc/nginx -name "*.backup.*"

# Restore from backup
sudo cp /etc/nginx/sites-available/your-site.backup.YYYYMMDD_HHMMSS /etc/nginx/sites-available/your-site

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Restore Code Changes
```bash
# Revert file size limits
git checkout HEAD -- src/middleware/upload.js
git checkout HEAD -- src/routes/demographicUploadRoutes.js
git checkout HEAD -- frontend/src/components/FileUpload.tsx
git checkout HEAD -- frontend/src/api/client.ts
```

## Future Improvements

1. **Chunked Uploads**: For files > 500MB
2. **Resume Capability**: Handle interrupted uploads
3. **Compression**: Reduce upload size
4. **CDN Integration**: For better upload performance
5. **Progress Persistence**: Save progress across browser sessions

---

**Last Updated**: January 27, 2025  
**Version**: 1.0.0  
**Tested File Size**: Up to 300MB
