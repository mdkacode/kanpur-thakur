import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface UploadRecord {
  id: number;
  filename: string;
  fileSize: number;
  status: string;
  recordsCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  fileType: string;
}

interface UploadHistoryResponse {
  success: boolean;
  data: UploadRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DemographicUploadHistory: React.FC = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUploads();
    }
  }, [isAuthenticated, currentPage, statusFilter]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await apiClient.get(`/demographic/uploads?${params}`);
      const result: UploadHistoryResponse = response.data;

      if (result.success) {
        setUploads(result.data);
        setTotalPages(result.pagination.totalPages);
      } else {
        setError('Failed to fetch uploads');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch uploads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteUpload = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this upload?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/demographic/uploads/${id}`);
      if (response.data.success) {
        // Refresh the list
        fetchUploads();
      } else {
        setError('Failed to delete upload');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete upload');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return isDarkMode 
          ? 'text-green-400 bg-green-900/20' 
          : 'text-green-600 bg-green-100';
      case 'processing':
        return isDarkMode 
          ? 'text-blue-400 bg-blue-900/20' 
          : 'text-blue-600 bg-blue-100';
      case 'failed':
        return isDarkMode 
          ? 'text-red-400 bg-red-900/20' 
          : 'text-red-600 bg-red-100';
      default:
        return isDarkMode 
          ? 'text-gray-400 bg-gray-900/20' 
          : 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAuthenticated) {
    return (
      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <p className="text-lg">Please log in to view upload history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Demographic Upload History</h2>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          View and manage your demographic data uploads
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="statusFilter" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Status Filter
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-4 p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-red-900/20 border-red-700 text-red-400' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {/* Uploads Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading uploads...</p>
        </div>
      ) : uploads.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg">No uploads found</p>
          <p className="text-sm">Upload your first demographic CSV file to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
            <thead>
              <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <th className="px-4 py-3 text-left border-b">File</th>
                <th className="px-4 py-3 text-left border-b">Status</th>
                <th className="px-4 py-3 text-left border-b">Records</th>
                <th className="px-4 py-3 text-left border-b">Size</th>
                <th className="px-4 py-3 text-left border-b">Uploaded</th>
                <th className="px-4 py-3 text-left border-b">Completed</th>
                <th className="px-4 py-3 text-left border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{upload.filename}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ID: {upload.id}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                      {upload.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {upload.recordsCount > 0 ? upload.recordsCount.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {formatFileSize(upload.fileSize)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{formatDate(upload.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {upload.completedAt ? (
                      <span className="text-sm">{formatDate(upload.completedAt)}</span>
                    ) : (
                      <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteUpload(upload.id)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          isDarkMode
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  page === currentPage
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDarkMode
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {uploads.some(upload => upload.errorMessage) && (
        <div className="mt-6">
          <h3 className="font-medium mb-3">Failed Uploads Details:</h3>
          {uploads
            .filter(upload => upload.errorMessage)
            .map(upload => (
              <div key={upload.id} className={`mb-3 p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-red-900/20 border-red-700' 
                  : 'bg-red-100 border-red-400'
              }`}>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-red-200' : 'text-red-800'
                }`}>
                  {upload.filename} (ID: {upload.id})
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                }`}>
                  {upload.errorMessage}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default DemographicUploadHistory;
