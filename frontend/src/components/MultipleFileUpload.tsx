import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  DeleteOutlined, 
  CloudUploadOutlined,
  FileExcelOutlined,
  FileTextOutlined as FileTextIcon,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Upload, Card, Progress, Button, message, Space, Typography, Alert, Divider, List, Tag } from 'antd';
import { uploadApi, UploadResponse } from '../api/uploadApi';
import { useTheme } from '../contexts/ThemeContext';

const { Text, Title } = Typography;

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  response?: UploadResponse;
  error?: string;
}

interface MultipleFileUploadProps {
  onUploadSuccess?: (responses: UploadResponse[]) => void;
}

const MultipleFileUpload: React.FC<MultipleFileUploadProps> = ({ onUploadSuccess }) => {
  const [fileList, setFileList] = useState<FileUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(-1);
  const { isDarkMode } = useTheme();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validate each file
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    acceptedFiles.forEach(file => {
      // Validate file type
      const allowedTypes = ['.csv', '.txt'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        invalidFiles.push(`${file.name} (invalid file type)`);
        return;
      }

      // Validate file size (100MB per file for multiple uploads)
      if (file.size > 100 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (file too large, max 100MB)`);
        return;
      }

      validFiles.push(file);
    });

    // Show errors for invalid files
    if (invalidFiles.length > 0) {
      message.error(`Invalid files: ${invalidFiles.join(', ')}`);
    }

    // Add valid files to the list
    const newFileItems: FileUploadItem[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));

    setFileList(prev => [...prev, ...newFileItems]);

    if (validFiles.length > 0) {
      message.success(`Added ${validFiles.length} file(s) to upload queue`);
    }
  }, []);

  const removeFile = (fileId: string) => {
    setFileList(prev => prev.filter(item => item.id !== fileId));
  };

  const clearAllFiles = () => {
    setFileList([]);
    setCurrentUploadIndex(-1);
  };

  const uploadFilesSequentially = async () => {
    if (fileList.length === 0) {
      message.warning('No files to upload');
      return;
    }

    setUploading(true);
    const successfulUploads: UploadResponse[] = [];
    let failedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const fileItem = fileList[i];
      
      // Skip already completed or failed files
      if (fileItem.status === 'completed' || fileItem.status === 'failed') {
        continue;
      }

      setCurrentUploadIndex(i);
      
      // Update status to uploading
      setFileList(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'uploading', progress: 0 } : item
      ));

      try {
        const response = await uploadApi.uploadFile(fileItem.file, (progress) => {
          setFileList(prev => prev.map((item, index) => 
            index === i ? { ...item, progress } : item
          ));
        });

        // Update status to completed
        setFileList(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'completed', progress: 100, response } : item
        ));

        successfulUploads.push(response);
        message.success(`Uploaded: ${fileItem.file.name}`);

      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Upload failed';
        
        // Update status to failed
        setFileList(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'failed', 
            progress: 0, 
            error: errorMessage 
          } : item
        ));

        failedCount++;
        message.error(`Failed to upload: ${fileItem.file.name} - ${errorMessage}`);
      }
    }

    setUploading(false);
    setCurrentUploadIndex(-1);

    // Show final summary
    const totalFiles = fileList.length;
    const successCount = successfulUploads.length;
    
    if (successCount > 0) {
      message.success(`Upload completed! ${successCount}/${totalFiles} files uploaded successfully`);
      
      if (onUploadSuccess) {
        onUploadSuccess(successfulUploads);
      }
    }

    if (failedCount > 0) {
      message.warning(`${failedCount} file(s) failed to upload`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    multiple: true,
    disabled: uploading
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'uploading':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'uploading':
        return 'processing';
      default:
        return 'default';
    }
  };

  const pendingFiles = fileList.filter(item => item.status === 'pending');
  const completedFiles = fileList.filter(item => item.status === 'completed');
  const failedFiles = fileList.filter(item => item.status === 'failed');
  const uploadingFiles = fileList.filter(item => item.status === 'uploading');

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
            Multiple File Upload
          </Title>
          <Text style={{ 
            fontSize: '16px',
            color: isDarkMode ? '#8c8c8c' : '#666666',
            marginTop: '8px'
          }}>
            Upload multiple files one by one for reliable processing
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
              ? (isDarkMode ? '#1a1a1a' : '#fafafa')
              : 'transparent',
            transition: 'all 0.3s ease',
            marginBottom: '24px'
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadOutlined 
            style={{ 
              fontSize: '48px', 
              color: isDarkMode ? '#8c8c8c' : '#d9d9d9',
              marginBottom: '16px'
            }} 
          />
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Upload your files
          </div>
          <div style={{ color: isDarkMode ? '#8c8c8c' : '#666666', marginBottom: '8px' }}>
            Drag and drop multiple .csv or .txt files, or click to select
          </div>
          <div style={{ color: isDarkMode ? '#8c8c8c' : '#999999', fontSize: '14px' }}>
            Maximum file size: 100MB per file
          </div>
        </div>

        {/* File List */}
        {fileList.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <Title level={4} style={{ margin: 0 }}>
                Upload Queue ({fileList.length} files)
              </Title>
              <Space>
                <Button 
                  onClick={clearAllFiles}
                  disabled={uploading}
                  icon={<DeleteOutlined />}
                >
                  Clear All
                </Button>
                <Button 
                  type="primary"
                  onClick={uploadFilesSequentially}
                  disabled={uploading || fileList.length === 0}
                  icon={<UploadOutlined />}
                  loading={uploading}
                >
                  {uploading ? 'Uploading...' : 'Start Upload'}
                </Button>
              </Space>
            </div>

            <List
              dataSource={fileList}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    padding: '16px',
                    border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: isDarkMode ? '#262626' : '#fafafa'
                  }}
                  actions={[
                    item.status === 'pending' && (
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={() => removeFile(item.id)}
                        disabled={uploading}
                      >
                        Remove
                      </Button>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(item.status)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{item.file.name}</span>
                        <Tag color={getStatusColor(item.status)}>
                          {item.status.toUpperCase()}
                        </Tag>
                        {currentUploadIndex === index && uploading && (
                          <Tag color="processing">CURRENT</Tag>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <div>Size: {(item.file.size / 1024 / 1024).toFixed(2)} MB</div>
                        {item.status === 'uploading' && (
                          <Progress 
                            percent={item.progress} 
                            size="small" 
                            style={{ marginTop: '8px' }}
                          />
                        )}
                        {item.status === 'failed' && item.error && (
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            Error: {item.error}
                          </Text>
                        )}
                        {item.status === 'completed' && (
                          <Text type="success" style={{ fontSize: '12px' }}>
                            Upload ID: {item.response?.data?.uploadId}
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Summary */}
        {fileList.length > 0 && (
          <div style={{ 
            padding: '16px',
            backgroundColor: isDarkMode ? '#262626' : '#f6f6f6',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Summary:</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">
                    Pending: {pendingFiles.length} | 
                    Uploading: {uploadingFiles.length} | 
                    Completed: {completedFiles.length} | 
                    Failed: {failedFiles.length}
                  </Text>
                </div>
              </div>
              {completedFiles.length > 0 && (
                <Text type="success" strong>
                  {completedFiles.length} file(s) uploaded successfully
                </Text>
              )}
            </div>
          </div>
        )}

        {/* Supported File Formats */}
        <Alert
          message="Supported File Formats"
          description="CSV Files (.csv): Comma-separated values with headers. TXT Files (.txt): Plain text files with tabular data."
          type="info"
          showIcon
          style={{
            borderRadius: '8px',
            backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f9ff',
            border: isDarkMode ? '1px solid #303030' : '1px solid #bae7ff'
          }}
        />
      </Card>
    </div>
  );
};

export default MultipleFileUpload;
