import apiClient from './client';

export interface DownloadStats {
  total_downloads: number;
  total_download_count: number;
  total_records_downloaded: number;
  avg_downloads_per_filter: number;
  last_download: string;
}

export interface DownloadHistory {
  id: number;
  filter_name: string;
  filter_criteria: any;
  download_count: number;
  total_records: number;
  file_size: number;
  last_downloaded_at: string;
  created_at: string;
}

export interface DownloadHistoryResponse {
  success: boolean;
  data: DownloadHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CSVExportRequest {
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: {
    npa?: string;
    nxx?: string;
    zip?: string;
    state_code?: string;
    city?: string;
    rc?: string;
    date_from?: string;
    date_to?: string;
  };
  filterName?: string;
}

export interface CSVExportResponse {
  success: boolean;
  message: string;
  data: {
    filename: string;
    recordCount: number;
    fileSize: number;
    csv: string;
  };
}

export const downloadApi = {
  // Export filtered data to CSV
  exportToCSV: async (request: CSVExportRequest): Promise<CSVExportResponse> => {
    const response = await apiClient.post('/export-csv', request);
    return response.data;
  },

  // Get download statistics
  getDownloadStats: async (): Promise<{ success: boolean; data: DownloadStats }> => {
    const response = await apiClient.get('/stats');
    return response.data;
  },

  // Get download history
  getAllDownloads: async (
    page = 1,
    limit = 20,
    sortBy = 'last_downloaded_at',
    sortOrder = 'DESC'
  ): Promise<DownloadHistoryResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });
    
    const response = await apiClient.get(`/history?${params}`);
    return response.data;
  },

  // Get most downloaded filters
  getMostDownloadedFilters: async (limit = 10): Promise<{ success: boolean; data: any[] }> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/popular?${params}`);
    return response.data;
  },

  // Delete download tracking entry
  deleteDownload: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/history/${id}`);
    return response.data;
  },

  // Download CSV file from response
  downloadCSV: (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
