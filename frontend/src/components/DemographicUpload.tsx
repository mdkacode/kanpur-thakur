import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    uploadId: number;
    filename: string;
    fileSize: number;
    status: string;
    fileType: string;
  };
}

const DemographicUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStatus('');
    } else if (selectedFile) {
      setUploadStatus('Please select a CSV file only.');
      setFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setUploadStatus('');
    } else {
      setUploadStatus('Please drop a CSV file only.');
    }
  };

  const handleUpload = async () => {
    if (!file || !isAuthenticated) return;

    setUploading(true);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/demographic/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result: UploadResponse = response.data;

      if (result.success) {
        setUploadStatus('Upload successful! Processing started...');
        setUploadId(result.data.uploadId);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadStatus(`Upload failed: ${result.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Upload failed: Network error';
      setUploadStatus(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus('');
    setUploadId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <p className="text-lg">Please log in to upload demographic data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Upload Demographic Data</h2>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Upload CSV files containing demographic and geographic data. The first column should contain zipcodes.
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? isDarkMode 
              ? 'border-blue-500 bg-blue-900/20' 
              : 'border-blue-500 bg-blue-50'
            : isDarkMode
            ? 'border-gray-600 hover:border-gray-500'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl">📊</div>
          <div>
            <p className="text-lg font-medium mb-2">
              {file ? file.name : 'Drop your CSV file here or click to browse'}
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Supports CSV files up to 100MB
            </p>
          </div>
          
          {!file && (
            <button
              onClick={handleBrowseClick}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Browse Files
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Info */}
      {file && (
        <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📁</div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : isDarkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`mt-4 p-4 rounded-lg ${
          uploadStatus.includes('successful') || uploadStatus.includes('Processing')
            ? isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'
            : uploadStatus.includes('failed')
            ? isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'
            : isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            {uploadStatus.includes('successful') || uploadStatus.includes('Processing') ? (
              <span className="text-green-500">✅</span>
            ) : uploadStatus.includes('failed') ? (
              <span className="text-red-500">❌</span>
            ) : (
              <span className="text-blue-500">⏳</span>
            )}
            <span className={uploadStatus.includes('successful') || uploadStatus.includes('Processing')
              ? isDarkMode ? 'text-green-400' : 'text-green-700'
              : uploadStatus.includes('failed')
              ? isDarkMode ? 'text-red-400' : 'text-red-700'
              : isDarkMode ? 'text-blue-400' : 'text-blue-700'
            }>
              {uploadStatus}
            </span>
          </div>
        </div>
      )}

      {/* Upload ID Display */}
      {uploadId && (
        <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={isDarkMode ? 'text-blue-400' : 'text-blue-700'}>
            <strong>Upload ID:</strong> {uploadId}
          </p>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
            Use this ID to track the upload status
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <h3 className="font-medium mb-2">📋 File Requirements:</h3>
        <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <li>• File format: CSV only</li>
          <li>• First column should contain zipcodes</li>
          <li>• Maximum file size: 100MB</li>
          <li>• Include columns: state, county, city, mhhi, avg_hhi, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export default DemographicUpload;
