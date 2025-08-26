import apiClient from './client';

export interface RecordFilterConfig {
  search?: string;
  npa?: string | string[];
  nxx?: string | string[];
  zip?: string | string[];
  state_code?: string | string[];
  city?: string | string[];
  rc?: string | string[];
  timezone_id?: number | number[];
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface RecordFilterFormValues {
  search?: string;
  npa?: string | string[];
  nxx?: string | string[];
  zip?: string | string[];
  state_code?: string | string[];
  city?: string;
  rc?: string;
  timezone_id?: number | number[];
  dateRange?: [Date, Date];
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface SavedRecordFilter {
  id: number;
  name: string;
  user_id: string;
  filter_type: 'records';
  filter_config: RecordFilterConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecordFilterResponse {
  success: boolean;
  data: SavedRecordFilter[];
  message?: string;
  error?: string;
}

export interface CreateRecordFilterRequest {
  name: string;
  filter_config: RecordFilterConfig;
}

export const recordFilterApi = {
  // Create a new record filter
  createFilter: async (filterData: CreateRecordFilterRequest): Promise<{ success: boolean; data: SavedRecordFilter; message: string }> => {
    const response = await apiClient.post('/filters', {
      ...filterData,
      filter_type: 'records'
    });
    return response.data;
  },

  // Get all record filters for the current user
  getUserFilters: async (): Promise<RecordFilterResponse> => {
    const response = await apiClient.get('/filters', { 
      params: { filter_type: 'records' } 
    });
    return response.data;
  },

  // Get a specific filter by ID
  getFilterById: async (id: number): Promise<{ success: boolean; data: SavedRecordFilter }> => {
    const response = await apiClient.get(`/filters/${id}`);
    return response.data;
  },

  // Update a filter
  updateFilter: async (id: number, filterData: Partial<CreateRecordFilterRequest>): Promise<{ success: boolean; data: SavedRecordFilter; message: string }> => {
    const response = await apiClient.put(`/filters/${id}`, filterData);
    return response.data;
  },

  // Delete a filter
  deleteFilter: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/filters/${id}`);
    return response.data;
  },

  // Apply a filter to get filtered records
  applyFilter: async (filterId: number, page = 1, limit = 50): Promise<{ success: boolean; data: any[]; pagination: any }> => {
    const response = await apiClient.get(`/filters/${filterId}/apply`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Get unique values for filter dropdowns
  getUniqueValues: async (field: string): Promise<string[]> => {
    const response = await apiClient.get(`/records/unique/${field}?limit=1000`);
    return response.data.success ? response.data.data : [];
  }
};
