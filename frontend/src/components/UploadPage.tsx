import React, { useState } from 'react';
import { Card, Tabs, Typography, Alert, Space } from 'antd';
import { UploadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';
import MultipleFileUpload from './MultipleFileUpload';
import { useTheme } from '../contexts/ThemeContext';
import { UploadResponse } from '../api/uploadApi';

const { Title, Text } = Typography;


interface UploadPageProps {
  onUploadSuccess?: (response: UploadResponse | UploadResponse[]) => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState('single');
  const { isDarkMode } = useTheme();

  const handleSingleUploadSuccess = (response: UploadResponse) => {
    if (onUploadSuccess) {
      onUploadSuccess(response);
    }
  };

  const handleMultipleUploadSuccess = (responses: UploadResponse[]) => {
    if (onUploadSuccess) {
      onUploadSuccess(responses);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Title level={1} style={{ 
          margin: 0,
          color: isDarkMode ? '#ffffff' : '#001529',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          File Upload
        </Title>
        <Text style={{ 
          fontSize: '18px',
          color: isDarkMode ? '#8c8c8c' : '#666666',
          marginTop: '8px'
        }}>
          Choose your preferred upload method
        </Text>
      </div>

      {/* Upload Method Comparison */}
      <Card
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={3} style={{ margin: '0 0 8px 0' }}>Single File Upload</Title>
            <Text style={{ color: isDarkMode ? '#8c8c8c' : '#666666' }}>
              Upload one large file (up to 300MB)
            </Text>
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ✅ Best for large datasets<br/>
                ✅ Faster for single files<br/>
                ⚠️ May timeout on slow connections
              </Text>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <FolderOpenOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <Title level={3} style={{ margin: '0 0 8px 0' }}>Multiple File Upload</Title>
            <Text style={{ color: isDarkMode ? '#8c8c8c' : '#666666' }}>
              Upload multiple smaller files (up to 100MB each)
            </Text>
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ✅ More reliable<br/>
                ✅ Better error handling<br/>
                ✅ Progress tracking per file
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Tabs */}
      <Card
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{
            color: isDarkMode ? '#ffffff' : '#000000'
          }}
          items={[
            {
              key: 'single',
              label: (
                <Space>
                  <UploadOutlined />
                  Single File Upload
                </Space>
              ),
              children: (
                <div style={{ padding: '20px 0' }}>
                  <Alert
                    message="Single File Upload"
                    description="Upload one large file (up to 300MB). This method is best for large datasets that you want to process as a single unit."
                    type="info"
                    showIcon
                    style={{
                      marginBottom: '20px',
                      borderRadius: '8px',
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f9ff',
                      border: isDarkMode ? '1px solid #303030' : '1px solid #bae7ff'
                    }}
                  />
                  <FileUpload onUploadSuccess={handleSingleUploadSuccess} />
                </div>
              )
            },
            {
              key: 'multiple',
              label: (
                <Space>
                  <FolderOpenOutlined />
                  Multiple File Upload
                </Space>
              ),
              children: (
                <div style={{ padding: '20px 0' }}>
                  <Alert
                    message="Multiple File Upload"
                    description="Upload multiple smaller files (up to 100MB each) one by one. This method is more reliable and provides better error handling."
                    type="success"
                    showIcon
                    style={{
                      marginBottom: '20px',
                      borderRadius: '8px',
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#f6ffed',
                      border: isDarkMode ? '1px solid #303030' : '1px solid #b7eb8f'
                    }}
                  />
                  <MultipleFileUpload onUploadSuccess={handleMultipleUploadSuccess} />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Tips Section */}
      <Card
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          marginTop: '24px'
        }}
      >
        <Title level={4} style={{ marginBottom: '16px' }}>
          Upload Tips
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <Text strong>For Large Files (100MB):</Text>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Use Single File Upload for files up to 300MB</li>
              <li>Ensure stable internet connection</li>
              <li>Consider splitting very large files</li>
              <li>Monitor upload progress</li>
            </ul>
          </div>
          <div>
            <Text strong>For Multiple Files:</Text>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Use Multiple File Upload for reliability</li>
              <li>Keep files under 100MB each</li>
              <li>Files are processed sequentially</li>
              <li>Failed uploads can be retried</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UploadPage;
