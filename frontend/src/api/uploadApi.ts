import apiClient from './client';

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    uploadId: number;
    filename: string;
    fileSize: number;
    status: string;
  };
}

export interface UploadStatus {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  records_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface UploadsResponse {
  success: boolean;
  data: UploadStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadStats {
  total_uploads: number;
  completed_uploads: number;
  processing_uploads: number;
  failed_uploads: number;
  total_records_processed: number;
}

export const uploadApi = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  getUploadStatus: async (uploadId: number): Promise<{ success: boolean; data: UploadStatus }> => {
    const response = await apiClient.get(`/status/${uploadId}`);
    return response.data;
  },

  getAllUploads: async (page = 1, limit = 20, status?: string): Promise<UploadsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }
    
    const response = await apiClient.get(`/uploads?${params}`);
    return response.data;
  },

  getUploadStats: async (): Promise<{ success: boolean; data: UploadStats }> => {
    const response = await apiClient.get('/upload-stats');
    return response.data;
  },

  deleteUpload: async (uploadId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/uploads/${uploadId}`);
    return response.data;
  },
};
