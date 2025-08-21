import apiClient from './client';

export interface State {
  id: number;
  state_code: string;
  state_name: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface StatesResponse {
  success: boolean;
  data: State[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface StateStats {
  total_states: number;
  total_regions: number;
  region: string;
  states_in_region: number;
}

export const stateApi = {
  getAllStates: async (
    page = 1, 
    limit = 50, 
    region?: string, 
    search?: string, 
    sortBy = 'state_name', 
    sortOrder = 'ASC'
  ): Promise<StatesResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });
    
    if (region) params.append('region', region);
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/states?${params}`);
    return response.data;
  },

  getStateById: async (id: number): Promise<{ success: boolean; data: State }> => {
    const response = await apiClient.get(`/states/${id}`);
    return response.data;
  },

  getStateByCode: async (code: string): Promise<{ success: boolean; data: State }> => {
    const response = await apiClient.get(`/states/code/${code}`);
    return response.data;
  },

  getStatesByRegion: async (region: string): Promise<{ success: boolean; data: State[] }> => {
    const response = await apiClient.get(`/states/region/${region}`);
    return response.data;
  },

  getRegions: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await apiClient.get('/regions');
    return response.data;
  },

  searchStates: async (query: string): Promise<{ success: boolean; data: State[]; searchQuery: string }> => {
    const response = await apiClient.get(`/states/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getStats: async (): Promise<{ success: boolean; data: StateStats[] }> => {
    const response = await apiClient.get('/states/stats');
    return response.data;
  },

  createState: async (stateData: { state_code: string; state_name: string; region?: string }): Promise<{ success: boolean; data: State; message: string }> => {
    const response = await apiClient.post('/states', stateData);
    return response.data;
  },

  updateState: async (id: number, stateData: { state_code: string; state_name: string; region?: string }): Promise<{ success: boolean; data: State; message: string }> => {
    const response = await apiClient.put(`/states/${id}`, stateData);
    return response.data;
  },

  deleteState: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/states/${id}`);
    return response.data;
  }
};
