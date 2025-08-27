# Server Upload Fix for Large Files

This document describes the comprehensive fix for server-side upload issues that prevent large file uploads from working properly.

## Problem Description

The server was experiencing upload cancellations and failures for large files (300MB) due to:

1. **Nginx configuration limits** - `client_max_body_size` set to 100M
2. **Timeout settings** - Insufficient timeouts for large uploads
3. **System resource limits** - File descriptor and memory limits
4. **Missing timeout configurations** - No `client_body_timeout` or `client_header_timeout`

## Root Cause Analysis

The curl command showed:
```
--data-raw $'------WebKitFormBoundaryVJPtIpGW2Ey82wSr\r\nContent-Disposition: form-data; name="file"; filename="npanxx2zip_1.txt"\r\nContent-Type: text/plain\r\n\r\n\r\n------WebKitFormBoundaryVJPtIpGW2Ey82wSr--\r\n'
```

Notice the empty file body (`\r\n\r\n`) - this indicates the file wasn't properly attached, likely due to nginx rejecting the request before it reached the application.

## Comprehensive Solution

### 1. Server Configuration Fix

Run the comprehensive server fix script:

```bash
sudo npm run fix:server-uploads
```

This script will:
- Update nginx configuration for 300MB uploads
- Fix all timeout settings
- Update system limits
- Restart services
- Test the configuration

### 2. Manual Configuration Steps

If the script doesn't work, apply these changes manually:

#### Nginx Configuration

Update `/etc/nginx/sites-available/sheetbc`:

```nginx
# Add to http block or server block
client_max_body_size 300M;
client_body_timeout 900s;
client_header_timeout 900s;

# Update location /api/ block
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
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    proxy_connect_timeout 75s;
}
```

#### System Limits

Update `/etc/security/limits.conf`:

```
nginx soft nofile 65536
nginx hard nofile 65536
```

Update `/etc/sysctl.conf`:

```
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
```

Apply changes:
```bash
sudo sysctl -p
```

### 3. Service Restart

```bash
# Restart nginx
sudo systemctl restart nginx

# Restart application
pm2 restart all
# or
sudo systemctl restart your-app-service
```

## Testing the Fix

### 1. Test Upload Functionality

```bash
# Test without authentication
npm run test:large-upload

# Test with authentication
npm run test:large-upload YOUR_JWT_TOKEN
```

### 2. Manual Testing

Test with curl:

```bash
# Small file test
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@small_file.txt" \
  https://157.180.70.168/api/v1/upload

# Large file test
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@large_file.txt" \
  https://157.180.70.168/api/v1/upload
```

### 3. Monitor Logs

```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Application logs
pm2 logs
# or
sudo journalctl -u your-app-service -f
```

## Configuration Summary

### Nginx Settings
- **client_max_body_size**: 300M
- **proxy_read_timeout**: 900s
- **proxy_send_timeout**: 900s
- **proxy_connect_timeout**: 75s
- **client_body_timeout**: 900s
- **client_header_timeout**: 900s

### System Settings
- **File descriptors**: 65536
- **TCP buffer sizes**: 16MB
- **Memory limits**: Increased

### Application Settings
- **Multer file size**: 300MB
- **API timeout**: 10 minutes
- **Upload directory**: Proper permissions

## Troubleshooting

### Issue: Still getting 413 errors

1. **Check nginx configuration**:
   ```bash
   sudo nginx -t
   sudo grep -r "client_max_body_size" /etc/nginx/
   ```

2. **Verify nginx is using the correct config**:
   ```bash
   sudo nginx -T | grep client_max_body_size
   ```

3. **Check if there are multiple nginx configs**:
   ```bash
   sudo find /etc/nginx -name "*.conf" -exec grep -l "client_max_body_size" {} \;
   ```

### Issue: Timeout errors

1. **Increase timeouts further**:
   ```nginx
   client_body_timeout 1800s;
   proxy_read_timeout 1800s;
   proxy_send_timeout 1800s;
   ```

2. **Check system resources**:
   ```bash
   free -h
   df -h
   ulimit -n
   ```

### Issue: Permission errors

1. **Fix upload directory permissions**:
   ```bash
   sudo chown -R www-data:www-data /path/to/uploads
   sudo chmod -R 755 /path/to/uploads
   ```

2. **Check nginx user**:
   ```bash
   sudo grep "user" /etc/nginx/nginx.conf
   ```

### Issue: Application not receiving files

1. **Check if nginx is proxying correctly**:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

2. **Test direct connection to application**:
   ```bash
   curl -X POST \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test.txt" \
     http://localhost:3000/api/v1/upload
   ```

## Performance Optimization

### For Very Large Files (>500MB)

1. **Consider chunked uploads**:
   - Split files into smaller chunks
   - Upload chunks separately
   - Reassemble on server

2. **Implement resume capability**:
   - Track upload progress
   - Allow resuming interrupted uploads
   - Use multipart uploads

3. **Optimize server resources**:
   - Increase swap space
   - Optimize disk I/O
   - Use SSD storage

### Monitoring

1. **Set up monitoring**:
   ```bash
   # Monitor upload success rate
   sudo tail -f /var/log/nginx/access.log | grep "POST.*upload"

   # Monitor error rates
   sudo tail -f /var/log/nginx/error.log | grep "413\|timeout"
   ```

2. **Create alerts**:
   - Monitor disk space
   - Track upload failures
   - Alert on high error rates

## Rollback Instructions

If issues occur after the fix:

### 1. Restore Nginx Configuration

```bash
# Find backup files
sudo find /etc/nginx -name "*.backup.*"

# Restore from backup
sudo cp /etc/nginx/sites-available/sheetbc.backup.YYYYMMDD_HHMMSS /etc/nginx/sites-available/sheetbc

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Restore System Limits

```bash
# Remove added lines from /etc/security/limits.conf
sudo nano /etc/security/limits.conf

# Remove added lines from /etc/sysctl.conf
sudo nano /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

### 3. Restart Services

```bash
sudo systemctl restart nginx
pm2 restart all
```

## Future Improvements

1. **Implement chunked uploads** for files > 500MB
2. **Add upload progress tracking** with WebSocket
3. **Implement upload resume** capability
4. **Add file compression** for uploads
5. **Set up CDN** for better upload performance
6. **Implement upload queuing** for high traffic

---

**Last Updated**: January 27, 2025  
**Version**: 1.0.0  
**Tested**: Ubuntu 20.04+, Nginx 1.18+, Node.js 16+
