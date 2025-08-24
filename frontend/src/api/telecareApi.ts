import apiClient from './client';

export interface TelecareRun {
  run_id: string;
  zip: string;
  input_csv_name: string;
  output_csv_name: string;
  row_count: number;
  status: 'processing' | 'success' | 'error';
  script_version: string;
  started_at: string;
  finished_at?: string;
  file_refs: any;
  created_at: string;
  updated_at: string;
}

export interface TelecareOutputRow {
  id: number;
  run_id: string;
  zip: string;
  payload: any;
  created_at: string;
}

export interface TelecareStats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  processing_runs: number;
  unique_zips: number;
  total_rows_processed: number;
}

export interface ProcessingResponse {
  success: boolean;
  message: string;
  data: {
    zipcode: string;
    records_count: number;
    status: string;
  };
}

export const telecareApi = {
  // Process telecare data for a zipcode
  processZipcode: async (zipcode: string): Promise<ProcessingResponse> => {
    const response = await apiClient.post(`/telecare/process/${zipcode}`);
    return response.data;
  },

  // Get processing status for a run
  getProcessingStatus: async (run_id: string): Promise<{ success: boolean; data: TelecareRun }> => {
    const response = await apiClient.get(`/telecare/status/${run_id}`);
    return response.data;
  },

  // Get telecare runs for a zipcode
  getRunsByZip: async (
    zipcode: string,
    limit = 10
  ): Promise<{ success: boolean; data: TelecareRun[]; pagination: { total: number; limit: number } }> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/telecare/runs/${zipcode}?${params}`);
    return response.data;
  },

  // Get output rows for a run
  getOutputRows: async (
    run_id: string
  ): Promise<{ success: boolean; data: TelecareOutputRow[]; pagination: { total: number } }> => {
    const response = await apiClient.get(`/telecare/output/${run_id}`);
    return response.data;
  },

  // Get telecare statistics
  getStats: async (): Promise<{ success: boolean; data: TelecareStats }> => {
    const response = await apiClient.get('/telecare/stats');
    return response.data;
  },

  // Get latest run for a zipcode
  getLatestRun: async (zipcode: string): Promise<{ success: boolean; data: TelecareRun }> => {
    const response = await apiClient.get(`/telecare/latest/${zipcode}`);
    return response.data;
  },

  // Download input CSV for a run
  downloadInputCSV: async (run_id: string): Promise<Blob> => {
    const response = await apiClient.get(`/telecare/download/input/${run_id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download output CSV for a run
  downloadOutputCSV: async (run_id: string): Promise<Blob> => {
    const response = await apiClient.get(`/telecare/download/output/${run_id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Helper function to download CSV blob
  downloadCSV: (blob: Blob, filename: string) => {
    try {
      console.log('Creating download for:', filename, 'blob size:', blob.size);
      
      if (!blob || blob.size === 0) {
        console.error('Invalid blob for download');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Download initiated successfully');
    } catch (error) {
      console.error('Error in downloadCSV:', error);
    }
  },

  // Get file content for viewing
  getFileContent: async (
    run_id: string,
    file_type: 'input' | 'output'
  ): Promise<{ success: boolean; data: { content: string; filename: string; size: number; file_type: string } }> => {
    const response = await apiClient.get(`/telecare/files/${run_id}/${file_type}/content`);
    return response.data;
  },
};
