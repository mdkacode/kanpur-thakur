# Multiple File Upload Feature

This document describes the multiple file upload feature that provides an alternative to single large file uploads for better reliability and error handling.

## Overview

The multiple file upload feature allows users to upload multiple smaller files (up to 100MB each) one by one, providing a more reliable alternative to uploading one large file. This approach reduces the risk of timeouts and connection issues.

## Features

### 1. Sequential Upload Processing
- Files are uploaded one at a time
- Each file is processed independently
- Failed uploads don't affect other files
- Progress tracking for each individual file

### 2. Comprehensive Status Tracking
- **Pending**: Files waiting to be uploaded
- **Uploading**: Currently being uploaded with progress
- **Completed**: Successfully uploaded
- **Failed**: Upload failed with error details

### 3. File Management
- Add multiple files via drag & drop or file picker
- Remove individual files from queue
- Clear all files at once
- File size validation (100MB limit per file)

### 4. Real-time Progress
- Individual progress bars for each file
- Current upload indicator
- Success/failure status for each file
- Upload summary with statistics

## Components

### 1. MultipleFileUpload Component
**File**: `frontend/src/components/MultipleFileUpload.tsx`

**Features**:
- Drag & drop multiple files
- File validation and error handling
- Sequential upload processing
- Progress tracking per file
- Status management
- Error recovery

### 2. UploadPage Component
**File**: `frontend/src/components/UploadPage.tsx`

**Features**:
- Tabbed interface for upload methods
- Comparison of single vs multiple upload
- Tips and guidance for users
- Unified upload success handling

## Usage

### Basic Usage

```tsx
import MultipleFileUpload from './components/MultipleFileUpload';

function App() {
  const handleUploadSuccess = (responses: UploadResponse[]) => {
    console.log('Uploaded files:', responses);
  };

  return (
    <MultipleFileUpload onUploadSuccess={handleUploadSuccess} />
  );
}
```

### With UploadPage Component

```tsx
import UploadPage from './components/UploadPage';

function App() {
  const handleUploadSuccess = (response: UploadResponse | UploadResponse[]) => {
    if (Array.isArray(response)) {
      console.log('Multiple files uploaded:', response);
    } else {
      console.log('Single file uploaded:', response);
    }
  };

  return (
    <UploadPage onUploadSuccess={handleUploadSuccess} />
  );
}
```

## File Upload Process

### 1. File Selection
- Users can drag & drop multiple files
- Files are validated for type (.csv, .txt) and size (≤100MB)
- Invalid files are rejected with error messages
- Valid files are added to the upload queue

### 2. Upload Queue Management
- Files are displayed in a list with status indicators
- Users can remove individual files before upload
- Clear all option to reset the queue
- File count and size information displayed

### 3. Sequential Upload
- Upload starts when user clicks "Start Upload"
- Files are processed one by one
- Current upload is highlighted
- Progress bar shows upload progress for current file

### 4. Status Updates
- Each file status is updated in real-time
- Success/failure messages for each file
- Upload IDs displayed for completed uploads
- Error details shown for failed uploads

### 5. Completion Summary
- Final summary shows success/failure counts
- Success callback triggered with all responses
- Failed uploads can be identified for retry

## Configuration

### File Size Limits
- **Per file**: 100MB maximum
- **Total queue**: No limit (limited by browser memory)
- **File types**: .csv, .txt

### Upload Settings
- **Sequential processing**: One file at a time
- **Progress tracking**: Real-time progress updates
- **Error handling**: Individual file error recovery
- **Timeout**: 10 minutes per file

## Error Handling

### File Validation Errors
- Invalid file types are rejected
- Files exceeding size limit are rejected
- Clear error messages for each issue

### Upload Errors
- Network errors don't stop other uploads
- Failed uploads are marked with error details
- Users can retry failed uploads manually

### Recovery Options
- Remove failed files from queue
- Retry individual failed uploads
- Clear all and start over

## Benefits

### 1. Reliability
- Smaller files are less likely to timeout
- Network issues affect only current file
- Failed uploads don't lose progress on other files

### 2. Better User Experience
- Real-time progress for each file
- Clear status indicators
- Detailed error messages
- Ability to manage upload queue

### 3. Error Recovery
- Individual file error handling
- Retry capabilities for failed uploads
- No loss of progress on successful uploads

### 4. Flexibility
- Mix of file sizes and types
- Add/remove files before upload
- Clear all option for fresh start

## Comparison with Single File Upload

| Feature | Single File Upload | Multiple File Upload |
|---------|-------------------|---------------------|
| **File Size Limit** | 300MB | 100MB per file |
| **Upload Method** | One large file | Multiple smaller files |
| **Reliability** | May timeout | More reliable |
| **Progress Tracking** | Overall progress | Per-file progress |
| **Error Handling** | All-or-nothing | Individual files |
| **Recovery** | Retry entire upload | Retry individual files |
| **Best For** | Large datasets | Multiple smaller datasets |

## Implementation Details

### State Management
```typescript
interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  response?: UploadResponse;
  error?: string;
}
```

### Upload Process
```typescript
const uploadFilesSequentially = async () => {
  for (let i = 0; i < fileList.length; i++) {
    const fileItem = fileList[i];
    
    // Skip completed/failed files
    if (fileItem.status === 'completed' || fileItem.status === 'failed') {
      continue;
    }

    // Update status to uploading
    setFileList(prev => prev.map((item, index) => 
      index === i ? { ...item, status: 'uploading', progress: 0 } : item
    ));

    try {
      const response = await uploadApi.uploadFile(fileItem.file, (progress) => {
        // Update progress
        setFileList(prev => prev.map((item, index) => 
          index === i ? { ...item, progress } : item
        ));
      });

      // Mark as completed
      setFileList(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'completed', progress: 100, response } : item
      ));

    } catch (error) {
      // Mark as failed
      setFileList(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'failed', error: error.message } : item
      ));
    }
  }
};
```

## Best Practices

### 1. File Preparation
- Split large files into smaller chunks (≤100MB each)
- Use consistent file naming conventions
- Ensure files are in correct format (.csv, .txt)

### 2. Upload Strategy
- Use multiple file upload for better reliability
- Monitor upload progress for each file
- Handle failed uploads appropriately

### 3. Error Handling
- Check error messages for failed uploads
- Retry failed uploads if appropriate
- Contact support for persistent issues

## Troubleshooting

### Common Issues

1. **Files not uploading**
   - Check file size (≤100MB)
   - Verify file type (.csv, .txt)
   - Check network connection

2. **Upload failures**
   - Review error messages
   - Check server logs
   - Retry failed uploads

3. **Slow uploads**
   - Check internet connection
   - Consider smaller file sizes
   - Monitor server performance

### Support

For issues with multiple file uploads:
1. Check browser console for errors
2. Review network tab for failed requests
3. Check server logs for backend errors
4. Contact system administrator

---

**Last Updated**: January 27, 2025  
**Version**: 1.0.0  
**Component**: MultipleFileUpload, UploadPage
