import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin, Alert, Tabs, Tag, message } from 'antd';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, PhoneOutlined } from '@ant-design/icons';
import { telecareApi } from '../api/telecareApi';
import { generateFromCSV, generateFromNpaNxxRecords } from '../api/phoneNumberApi';
import { useTheme } from '../contexts/ThemeContext';

interface FileViewerModalProps {
  visible: boolean;
  onClose: () => void;
  runId: string;
  zipcode: string;
  inputFilename: string;
  outputFilename: string;
  hasOutput: boolean;
}

interface FileContent {
  content: string;
  filename: string;
  size: number;
  file_type: string;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  visible,
  onClose,
  runId,
  zipcode,
  inputFilename,
  outputFilename,
  hasOutput
}) => {
  const [inputContent, setInputContent] = useState<FileContent | null>(null);
  const [outputContent, setOutputContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatingPhoneNumbers, setGeneratingPhoneNumbers] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { isDarkMode } = useTheme();

  const loadFileContent = async (fileType: 'input' | 'output') => {
    try {
      setLoading(true);
      setError('');
      
      const response = await telecareApi.getFileContent(runId, fileType);
      
      if (response.success) {
        if (fileType === 'input') {
          setInputContent(response.data);
        } else {
          setOutputContent(response.data);
        }
      } else {
        throw new Error('Failed to load file content');
      }
    } catch (error: any) {
      setError(`Error loading ${fileType} file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileType: 'input' | 'output') => {
    try {
      if (fileType === 'input') {
        const blob = await telecareApi.downloadInputCSV(runId);
        telecareApi.downloadCSV(blob, inputFilename);
      } else {
        const blob = await telecareApi.downloadOutputCSV(runId);
        telecareApi.downloadCSV(blob, outputFilename);
      }
    } catch (error: any) {
      setError(`Error downloading ${fileType} file: ${error.message}`);
    }
  };

  const handleGeneratePhoneNumbers = async () => {
    setGeneratingPhoneNumbers(true);
    setError('');

    try {
      // Try direct NPA NXX generation first (no telecare required)
      let response;
      try {
        response = await generateFromNpaNxxRecords(zipcode);
        
        if (response.success) {
          setSuccessMessage('Phone number generation started successfully from NPA NXX records! Check the phone number jobs section for progress.');
          message.success('Phone number generation started successfully!');
          return;
        }
      } catch (directError: any) {
        console.log('Direct generation failed, trying CSV fallback:', directError.message);
      }

      // Fallback to CSV generation if direct generation fails
      if (!outputContent) {
        throw new Error('No NPA NXX records found for this zipcode and no output CSV content available');
      }

      response = await generateFromCSV(outputContent.content, zipcode);
      
      if (response.success) {
        setSuccessMessage('Phone number generation started successfully from CSV! Check the phone number jobs section for progress.');
        message.success('Phone number generation started successfully!');
      } else {
        throw new Error(response.message || 'Failed to start phone number generation');
      }
    } catch (error: any) {
      setError(`Error starting phone number generation: ${error.message}`);
      message.error('Failed to start phone number generation');
    } finally {
      setGeneratingPhoneNumbers(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Theme-aware CSS classes
  const getThemeClasses = () => ({
    modal: isDarkMode ? 'dark' : 'light',
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    text: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
    bgTertiary: isDarkMode ? 'bg-gray-700' : 'bg-white',
    hover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
  });

  const renderCSVContent = (content: string, filename: string) => {
    const lines = content.split('\n');
    const headers = lines[0]?.split(',') || [];
    const dataRows = lines.slice(1).filter(line => line.trim());
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileTextOutlined className="text-blue-500" />
            <span className="font-medium">{filename}</span>
          </div>
          <Tag color="blue">{formatFileSize(content.length)}</Tag>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <span className="text-sm font-medium text-gray-700">Headers ({headers.length})</span>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {headers.map((header, index) => (
                <Tag key={index} color="green" className="text-xs">
                  {header.trim()}
                </Tag>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <span className="text-sm font-medium text-gray-700">Data Preview ({dataRows.length} rows)</span>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataRows.slice(0, 10).map((row, rowIndex) => {
                  const cells = row.split(',');
                  return (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 font-mono">
                          {cell.trim() || '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dataRows.length > 10 && (
              <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                Showing first 10 rows of {dataRows.length} total rows
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>• Total rows: {dataRows.length}</p>
          <p>• Columns: {headers.length}</p>
          <p>• File size: {formatFileSize(content.length)}</p>
        </div>
      </div>
    );
  };

  const renderTabContent = (fileType: 'input' | 'output') => {
    const content = fileType === 'input' ? inputContent : outputContent;
    const filename = fileType === 'input' ? inputFilename : outputFilename;
    const theme = getThemeClasses();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
          <span className={`ml-3 ${theme.textSecondary}`}>Loading {fileType} file...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }
    
    if (!content) {
      return (
        <div className="text-center py-12">
          <FileTextOutlined className={`text-4xl mb-4 ${theme.textSecondary}`} />
          <p className={theme.textSecondary}>No {fileType} file content loaded</p>
          <Button 
            type="primary" 
            onClick={() => loadFileContent(fileType)}
            className="mt-4"
          >
            Load {fileType} File
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg font-medium ${theme.text}`}>
            {fileType === 'input' ? 'Input CSV' : 'Output CSV'} Content
          </h3>
          <div className="flex items-center gap-2">
            {fileType === 'output' && (
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={handleGeneratePhoneNumbers}
                loading={generatingPhoneNumbers}
                disabled={generatingPhoneNumbers}
                className="bg-green-600 hover:bg-green-700 border-green-600"
                title="Generate phone numbers directly from NPA NXX records - no telecare required!"
              >
                Generate Phone Numbers
              </Button>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(fileType)}
            >
              Download {fileType === 'input' ? 'Input' : 'Output'} CSV
            </Button>
          </div>
        </div>
        
        {renderCSVContent(content.content, content.filename)}
      </div>
    );
  };

  useEffect(() => {
    if (visible) {
      // Auto-load input file content when modal opens
      loadFileContent('input');
    }
  }, [visible, runId]);

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2">
          <EyeOutlined className="text-blue-500" />
          <span className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
            File Viewer - Zipcode {zipcode}
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      className={`file-viewer-modal ${isDarkMode ? 'dark' : 'light'}`}
      styles={{
        content: {
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          color: isDarkMode ? '#f9fafb' : '#111827'
        }
      }}
    >
      <div className="space-y-4">
        <div className={`border rounded-lg p-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center space-x-4 text-sm">
            <div>
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Run ID:</span>
              <span className={`ml-2 font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{runId.slice(0, 8)}...</span>
            </div>
            <div>
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Zipcode:</span>
              <span className={`ml-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{zipcode}</span>
            </div>
            <div>
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Status:</span>
              <span className="ml-2 text-green-500">Success</span>
            </div>
          </div>
        </div>

        <Tabs
          defaultActiveKey="input"
          className={isDarkMode ? 'dark-tabs' : 'light-tabs'}
          items={[
            {
              key: 'input',
              label: (
                <span className="flex items-center space-x-2">
                  <FileTextOutlined />
                  <span>Input CSV</span>
                </span>
              ),
              children: renderTabContent('input')
            },
            {
              key: 'output',
              label: (
                <span className="flex items-center space-x-2">
                  <FileTextOutlined />
                  <span>Output CSV</span>
                  {!hasOutput && <Tag color="orange">No Output</Tag>}
                </span>
              ),
              children: hasOutput ? renderTabContent('output') : (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <FileTextOutlined className="text-4xl mb-4" />
                  <p>No output file available for this run</p>
                </div>
              ),
              disabled: !hasOutput
            }
          ]}
        />

        {/* Phone Number Generation Error Display */}
        {error && error.includes('phone number generation') && (
          <Alert
            message="Phone Number Generation Error"
            description={error}
            type="error"
            showIcon
            className="mt-4"
          />
        )}

        {/* Phone Number Generation Success Display */}
        {successMessage && (
          <Alert
            message="Phone Number Generation Started"
            description={successMessage}
            type="success"
            showIcon
            className="mt-4"
            action={
              <Button size="small" onClick={() => setSuccessMessage('')}>
                Dismiss
              </Button>
            }
          />
        )}
      </div>
    </Modal>
  );
};

export default FileViewerModal;
