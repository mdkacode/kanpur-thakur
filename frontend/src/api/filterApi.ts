import apiClient from './client';

export interface FilterConfig {
  search?: string;
  state?: string | string[];
  zipcode?: string | string[];
  county?: string | string[];
  city?: string | string[];
  
  // Income & Economic
  mhhi_min?: string;
  mhhi_max?: string;
  avg_hhi_min?: string;
  avg_hhi_max?: string;
  pc_income_min?: string;
  pc_income_max?: string;
  pct_hh_w_income_200k_plus_min?: string;
  pct_hh_w_income_200k_plus_max?: string;
  
  // Demographics & Age
  median_age_min?: string;
  median_age_max?: string;
  pop_dens_sq_mi_min?: string;
  pop_dens_sq_mi_max?: string;
  
  // Race & Ethnicity
  race_ethnicity_white_min?: string;
  race_ethnicity_white_max?: string;
  race_ethnicity_black_min?: string;
  race_ethnicity_black_max?: string;
  race_ethnicity_hispanic_min?: string;
  race_ethnicity_hispanic_max?: string;
  
  // Household & Family
  households_min?: string;
  households_max?: string;
  family_hh_total_min?: string;
  family_hh_total_max?: string;
  
  // Education & Employment
  edu_att_bachelors_min?: string;
  edu_att_bachelors_max?: string;
  unemployment_pct_min?: string;
  unemployment_pct_max?: string;
  
  // Housing
  housing_units_min?: string;
  housing_units_max?: string;
  owner_occupied_min?: string;
  owner_occupied_max?: string;
  
  sortBy?: string;
  sortOrder?: string;
}

export interface FilterOptions {
  [field: string]: string[] | { min: number; max: number };
}

export interface SavedFilter {
  id: number;
  name: string;
  user_id: string;
  filter_type: string;
  filter_config: FilterConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilterResponse {
  success: boolean;
  data: SavedFilter[];
  message?: string;
  error?: string;
}

export interface CreateFilterRequest {
  name: string;
  filter_type?: string;
  filter_config: FilterConfig;
}

export const filterApi = {
  // Create a new filter
  createFilter: async (filterData: CreateFilterRequest): Promise<{ success: boolean; data: SavedFilter; message: string }> => {
    const response = await apiClient.post('/filters', filterData);
    return response.data;
  },

  // Get all filters for the current user
  getUserFilters: async (filterType?: string): Promise<FilterResponse> => {
    const params = filterType ? { filter_type: filterType } : {};
    const response = await apiClient.get('/filters', { params });
    return response.data;
  },

  // Get a specific filter by ID
  getFilterById: async (id: number): Promise<{ success: boolean; data: SavedFilter }> => {
    const response = await apiClient.get(`/filters/${id}`);
    return response.data;
  },

  // Update a filter
  updateFilter: async (id: number, updateData: Partial<SavedFilter>): Promise<{ success: boolean; data: SavedFilter; message: string }> => {
    const response = await apiClient.put(`/filters/${id}`, updateData);
    return response.data;
  },

  // Delete a filter (soft delete)
  deleteFilter: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/filters/${id}`);
    return response.data;
  },

  // Apply a saved filter to get filtered data
  applyFilter: async (id: number, page = 1, limit = 50): Promise<{
    success: boolean;
    data: any[];
    filteredZipcodes: string[];
    pagination: any;
    appliedFilter: SavedFilter;
  }> => {
    const response = await apiClient.get(`/filters/${id}/apply`, {
      params: { page, limit }
    });
    return response.data;
  },

  // New methods for getting filter options
  getFilterOptions: async (): Promise<FilterOptions> => {
    const response = await apiClient.get('/demographic/records/filter-options');
    return response.data.data;
  },

  getUniqueValues: async (field: string): Promise<string[]> => {
    const response = await apiClient.get(`/demographic/records/unique/${field}`);
    return response.data.data;
  }
};
