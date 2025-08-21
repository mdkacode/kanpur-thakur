import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  DeleteOutlined, 
  CloudUploadOutlined,
  FileExcelOutlined,
  FileTextOutlined as FileTextIcon
} from '@ant-design/icons';
import { Upload, Card, Progress, Button, message, Space, Typography, Alert, Divider } from 'antd';
import { uploadApi, UploadResponse } from '../api/uploadApi';
import { useTheme } from '../contexts/ThemeContext';

const { Text, Title } = Typography;

interface FileUploadProps {
  onUploadSuccess?: (response: UploadResponse) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { isDarkMode } = useTheme();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    const allowedTypes = ['.csv', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      message.error('Please upload a .csv or .txt file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      message.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadApi.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      message.success('File uploaded successfully! Processing started.');
      
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const removeFile = () => {
    // Clear the accepted files by triggering a new dropzone render
    const event = new Event('dropzone-clear');
    window.dispatchEvent(event);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Card
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ 
            margin: 0,
            color: isDarkMode ? '#ffffff' : '#001529',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            File Upload
          </Title>
          <Text style={{ 
            fontSize: '16px',
            color: isDarkMode ? '#8c8c8c' : '#666666',
            marginTop: '8px'
          }}>
            Upload your data files for processing
          </Text>
        </div>

        <div
          {...getRootProps()}
          style={{
            border: '3px dashed',
            borderColor: isDragActive 
              ? (isDarkMode ? '#1890ff' : '#1677ff')
              : (isDarkMode ? '#434343' : '#d9d9d9'),
            borderRadius: '16px',
            padding: '48px 32px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            backgroundColor: isDragActive 
              ? (isDarkMode ? '#111b26' : '#f0f8ff')
              : (isDarkMode ? '#141414' : '#fafafa'),
            transition: 'all 0.3s ease',
            opacity: uploading ? 0.7 : 1,
            position: 'relative',
            overflow: 'hidden',
            transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
            boxShadow: isDragActive 
              ? '0 8px 25px rgba(24, 144, 255, 0.15)'
              : '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            if (!uploading && !isDragActive) {
              e.currentTarget.style.transform = 'scale(1.01)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading && !isDragActive) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          <input {...getInputProps()} />
          
          <div style={{ marginBottom: '24px' }}>
            <CloudUploadOutlined style={{ 
              fontSize: '64px', 
              color: isDragActive 
                ? (isDarkMode ? '#1890ff' : '#1677ff')
                : (isDarkMode ? '#434343' : '#bfbfbf'),
              marginBottom: '16px',
              transition: 'all 0.3s ease'
            }} />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <Title level={3} style={{ 
              margin: '0 0 12px 0',
              color: isDarkMode ? '#ffffff' : '#001529',
              fontWeight: 600
            }}>
              {uploading ? 'Uploading...' : 'Upload your file'}
            </Title>
            <Text style={{ 
              fontSize: '16px',
              color: isDarkMode ? '#8c8c8c' : '#666666',
              display: 'block',
              marginBottom: '8px'
            }}>
              {isDragActive 
                ? 'Drop the file here to upload' 
                : 'Drag and drop a .csv or .txt file, or click to select'
              }
            </Text>
            <Text style={{ 
              fontSize: '14px',
              color: isDarkMode ? '#595959' : '#999999'
            }}>
              Maximum file size: 10MB
            </Text>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div style={{ marginTop: '32px' }}>
              <Progress 
                percent={uploadProgress} 
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                strokeWidth={8}
                showInfo={false}
              />
              <Text style={{ 
                fontSize: '14px',
                color: isDarkMode ? '#8c8c8c' : '#666666',
                marginTop: '8px',
                display: 'block'
              }}>
                {uploadProgress}% complete - Processing your file...
              </Text>
            </div>
          )}
        </div>

        {/* Selected File */}
        {acceptedFiles.length > 0 && (
          <Card 
            size="small" 
            style={{ 
              marginTop: '24px', 
              background: isDarkMode ? '#141414' : '#f8f9fa',
              border: `1px solid ${isDarkMode ? '#303030' : '#e9ecef'}`,
              borderRadius: '12px'
            }}
          >
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size="middle">
                {acceptedFiles[0].name.toLowerCase().endsWith('.csv') ? (
                  <FileExcelOutlined style={{ 
                    fontSize: '32px', 
                    color: isDarkMode ? '#52c41a' : '#52c41a' 
                  }} />
                ) : (
                  <FileTextIcon style={{ 
                    fontSize: '32px', 
                    color: isDarkMode ? '#1890ff' : '#1677ff' 
                  }} />
                )}
                <div>
                  <Text strong style={{ 
                    fontSize: '16px',
                    color: isDarkMode ? '#ffffff' : '#001529'
                  }}>
                    {acceptedFiles[0].name}
                  </Text>
                  <br />
                  <Text style={{ 
                    fontSize: '14px',
                    color: isDarkMode ? '#8c8c8c' : '#666666'
                  }}>
                    {(acceptedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </div>
              </Space>
              {!uploading && (
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={removeFile}
                  danger
                  style={{
                    fontSize: '16px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
              )}
            </Space>
          </Card>
        )}

        {/* File Format Information */}
        <Divider style={{ 
          margin: '32px 0 16px 0',
          borderColor: isDarkMode ? '#303030' : '#f0f0f0'
        }} />
        
        <Alert
          message="Supported File Formats"
          description={
            <div>
              <div style={{ marginBottom: '8px' }}>
                <strong>CSV Files (.csv):</strong> Comma-separated values with headers
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>TXT Files (.txt):</strong> Plain text with tab or comma delimiters
              </div>
              <div>
                <strong>Data Format:</strong> NPA,NXX,ZIP,STATE,CITY,RC
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{
            background: isDarkMode ? '#111b26' : '#e6f7ff',
            border: `1px solid ${isDarkMode ? '#1890ff' : '#91d5ff'}`,
            borderRadius: '8px'
          }}
        />
      </Card>
    </div>
  );
};

export default FileUpload;
