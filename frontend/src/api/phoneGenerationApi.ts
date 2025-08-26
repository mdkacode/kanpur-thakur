import apiClient from './client';

export interface PhoneNumberGeneration {
  id: number;
  generation_name: string;
  user_id: string;
  user_name?: string;
  filter_criteria: any;
  source_zipcodes: string[];
  source_timezone_ids: number[];
  total_records: number;
  file_size?: number;
  download_count: number;
  download_count_actual: number;
  last_downloaded_at?: string;
  csv_filename?: string;
  csv_path?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneGenerationStats {
  total_generations: number;
  unique_users: number;
  total_phone_numbers: number;
  total_downloads: number;
  avg_records_per_generation: number;
  last_generation?: string;
}

export interface DownloadRecord {
  id: number;
  generation_id: number;
  user_id: string;
  user_name?: string;
  download_type: string;
  ip_address?: string;
  user_agent?: string;
  downloaded_at: string;
  generation_name?: string;
}

export interface PhoneGenerationResponse {
  success: boolean;
  data: PhoneNumberGeneration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: any;
}

export interface GeneratePhoneNumbersRequest {
  generation_name: string;
  filter_criteria: any;
  user_name?: string;
}

export interface GeneratePhoneNumbersResponse {
  success: boolean;
  data: {
    generation: PhoneNumberGeneration;
    phone_numbers_count: number;
    csv_filename: string;
    file_size: number;
    download_url: string;
          validation_summary?: {
        valid_records: number;
        invalid_records: number;
        duplicate_records: number;
        total_processed: number;
      };
  };
  message: string;
}

export const phoneGenerationApi = {
  // Generate phone numbers and create CSV
  generatePhoneNumbers: async (request: GeneratePhoneNumbersRequest): Promise<GeneratePhoneNumbersResponse> => {
    const response = await apiClient.post('/phone-generations', request);
    return response.data;
  },

  // Get all phone number generations with filtering
  getAllGenerations: async (
    page = 1,
    limit = 50,
    search?: string,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    filters?: {
      user_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      timezone_ids?: number[];
    }
  ): Promise<PhoneGenerationResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (search) {
      params.append('search', search);
    }

    // Add filter parameters
    if (filters) {
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.timezone_ids && filters.timezone_ids.length > 0) {
        params.append('timezone_ids', filters.timezone_ids.join(','));
      }
    }

    const response = await apiClient.get(`/phone-generations?${params}`);
    return response.data;
  },

  // Get generation by ID
  getGenerationById: async (id: number): Promise<{ success: boolean; data: PhoneNumberGeneration }> => {
    const response = await apiClient.get(`/phone-generations/${id}`);
    return response.data;
  },

  // Download CSV file
  downloadCSV: async (id: number, user_name?: string): Promise<Blob> => {
    const response = await apiClient.get(`/phone-generations/${id}/download`, {
      responseType: 'blob',
      data: { user_name }
    });
    return response.data;
  },

  // Get download history for a generation
  getDownloadHistory: async (id: number): Promise<{ success: boolean; data: DownloadRecord[] }> => {
    const response = await apiClient.get(`/phone-generations/${id}/downloads`);
    return response.data;
  },

  // Get statistics
  getStats: async (): Promise<{ success: boolean; data: PhoneGenerationStats }> => {
    const response = await apiClient.get('/phone-generations/stats');
    return response.data;
  },

  // Delete generation
  deleteGeneration: async (id: number): Promise<{ success: boolean; data: PhoneNumberGeneration; message: string }> => {
    const response = await apiClient.delete(`/phone-generations/${id}`);
    return response.data;
  },

  // Get unique values for a field (for filter dropdowns)
  getUniqueValues: async (field: string, search = '', limit = 100): Promise<string[]> => {
    try {
      const params = new URLSearchParams({
        search,
        limit: limit.toString(),
      });

      const response = await apiClient.get(`/phone-generations/unique/${field}?${params}`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching unique values for ${field}:`, error);
      return [];
    }
  },

  // Helper function to download and save CSV file
  downloadAndSaveCSV: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default phoneGenerationApi;
