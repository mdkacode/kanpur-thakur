import apiClient from './client';

export interface Record {
  id: number;
  npa: string;
  nxx: string;
  zip: string;
  state_code: string;
  city: string;
  rc: string;
  created_at: string;
  updated_at: string;
}

export interface RecordsResponse {
  success: boolean;
  data: Record[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: any;
}

export interface RecordStats {
  total_records: number;
  unique_npa: number;
  unique_states: number;
  unique_zips: number;
}

export const recordApi = {
  getAllRecords: async (
    page = 1,
    limit = 50,
    search?: string,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    filters?: {
      npa?: string;
      nxx?: string;
      zip?: string;
      state_code?: string;
      city?: string;
      rc?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<RecordsResponse> => {
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
      if (filters.npa) params.append('npa', filters.npa);
      if (filters.nxx) params.append('nxx', filters.nxx);
      if (filters.zip) params.append('zip', filters.zip);
      if (filters.state_code) params.append('state_code', filters.state_code);
      if (filters.city) params.append('city', filters.city);
      if (filters.rc) params.append('rc', filters.rc);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
    }
    
    const response = await apiClient.get(`/records?${params}`);
    return response.data;
  },

  getRecordById: async (id: number): Promise<{ success: boolean; data: Record }> => {
    const response = await apiClient.get(`/records/${id}`);
    return response.data;
  },

  searchRecords: async (
    query: string,
    page = 1,
    limit = 50
  ): Promise<RecordsResponse & { searchQuery: string }> => {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/search?${params}`);
    return response.data;
  },

  getRecordsByNpaNxx: async (
    npa: string,
    nxx: string,
    page = 1,
    limit = 50
  ): Promise<RecordsResponse & { filters: { npa: string; nxx: string } }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/records/npa/${npa}/nxx/${nxx}?${params}`);
    return response.data;
  },

  getRecordsByZip: async (
    zip: string,
    page = 1,
    limit = 50
  ): Promise<RecordsResponse & { filters: { zip: string } }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/records/zip/${zip}?${params}`);
    return response.data;
  },

  getRecordsByState: async (
    state: string,
    page = 1,
    limit = 50
  ): Promise<RecordsResponse & { filters: { state: string } }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await apiClient.get(`/records/state/${state}?${params}`);
    return response.data;
  },

  getStats: async (): Promise<{ success: boolean; data: RecordStats }> => {
    const response = await apiClient.get('/stats');
    return response.data;
  },

  deleteRecord: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/records/${id}`);
    return response.data;
  },

  deleteAllRecords: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete('/records');
    return response.data;
  },
};
