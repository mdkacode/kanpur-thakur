import apiClient from './client';

export interface Timezone {
  id: number;
  timezone_name: string;
  display_name: string;
  abbreviation_standard: string;
  abbreviation_daylight?: string;
  utc_offset_standard: number;
  utc_offset_daylight?: number;
  observes_dst: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimezoneOption {
  id: number;
  value: number;
  label: string;
  timezone_name: string;
  display_name: string;
  abbreviation: string;
}

export interface CurrentTimeInfo {
  timezone: Timezone;
  current_time: string;
  is_dst: boolean;
  offset_minutes: number;
  abbreviation: string;
}

export const timezoneApi = {
  // Get all timezones
  async getAllTimezones(): Promise<Timezone[]> {
    try {
      const response = await apiClient.get('/timezones');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching timezones:', error);
      throw error;
    }
  },

  // Get timezone options for dropdowns
  async getTimezoneOptions(): Promise<TimezoneOption[]> {
    try {
      const response = await apiClient.get('/timezones/options');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching timezone options:', error);
      throw error;
    }
  },

  // Get timezone by ID
  async getTimezoneById(id: number): Promise<Timezone | null> {
    try {
      const response = await apiClient.get(`/timezones/${id}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching timezone by ID:', error);
      throw error;
    }
  },

  // Get timezones by state
  async getTimezonesByState(state: string): Promise<Timezone[]> {
    try {
      const response = await apiClient.get(`/timezones/state/${encodeURIComponent(state)}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching timezones by state:', error);
      throw error;
    }
  },

  // Get current time in timezone
  async getCurrentTimeInTimezone(id: number): Promise<CurrentTimeInfo> {
    try {
      const response = await apiClient.get(`/timezones/${id}/current-time`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching current time in timezone:', error);
      throw error;
    }
  },

  // Create new timezone
  async createTimezone(timezoneData: Partial<Timezone>): Promise<Timezone> {
    try {
      const response = await apiClient.post('/timezones', timezoneData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating timezone:', error);
      throw error;
    }
  },

  // Update timezone
  async updateTimezone(id: number, timezoneData: Partial<Timezone>): Promise<Timezone> {
    try {
      const response = await apiClient.put(`/timezones/${id}`, timezoneData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating timezone:', error);
      throw error;
    }
  },

  // Delete timezone
  async deleteTimezone(id: number): Promise<Timezone> {
    try {
      const response = await apiClient.delete(`/timezones/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error deleting timezone:', error);
      throw error;
    }
  }
};

export default timezoneApi;
