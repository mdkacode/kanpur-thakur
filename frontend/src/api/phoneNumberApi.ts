import apiClient from './client';

export interface PhoneNumberJob {
  job_id: string;
  run_id: string;
  zip: string;
  filter_id?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_numbers: number;
  generated_numbers: number;
  failed_numbers: number;
  started_at: string;
  finished_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: number;
  job_id: string;
  run_id: string;
  zip: string;
  npa: string;
  nxx: string;
  thousands: string;
  full_phone_number: string;
  state: string;
  timezone: string;
  company_type?: string;
  company?: string;
  ratecenter?: string;
  filter_id?: number;
  created_at: string;
}

export interface PhoneNumberStats {
  total_phone_numbers: number;
  total_jobs: number;
  total_runs: number;
  total_zips: number;
  total_states: number;
}

export interface PhoneNumberPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PhoneNumberResponse {
  success: boolean;
  data: PhoneNumber[];
  pagination: PhoneNumberPagination;
}

export interface PhoneNumberJobResponse {
  success: boolean;
  data: PhoneNumberJob[];
}

export interface PhoneNumberStatsResponse {
  success: boolean;
  data: PhoneNumberStats;
}

// Generate phone numbers from telecare output
export const generateFromTelecareOutput = async (runId: string, zip: string) => {
  const response = await apiClient.post(`/phone-numbers/generate/telecare/${runId}`, { zip });
  return response.data;
};

// Generate phone numbers for a specific filter
export const generateForFilter = async (filterId: number, zip: string) => {
  const response = await apiClient.post(`/phone-numbers/generate/filter/${filterId}`, { zip });
  return response.data;
};

// Generate phone numbers directly from CSV data
export const generateFromCSV = async (csvData: string, zip: string, filterId?: number) => {
  const response = await apiClient.post('/phone-numbers/generate/csv', { csvData, zip, filterId });
  return response.data;
};

// Generate phone numbers directly from NPA NXX records (NO TELECARE REQUIRED)
export const generateFromNpaNxxRecords = async (zip: string, filterCriteria?: any) => {
  const response = await apiClient.post('/phone-numbers/generate/npa-nxx', { 
    zip, 
    filter_criteria: filterCriteria 
  });
  return response.data;
};

// Generate phone numbers for all zipcodes in a filter batch (NO TELECARE REQUIRED)
export const generateForFilterBatch = async (filterId: number) => {
  const response = await apiClient.post(`/phone-numbers/generate/filter-batch/${filterId}`);
  return response.data;
};

// Get phone number generation status
export const getGenerationStatus = async (jobId: string) => {
  const response = await apiClient.get(`/phone-numbers/status/${jobId}`);
  return response.data;
};

// Get phone numbers for a job
export const getPhoneNumbersForJob = async (jobId: string, page = 1, limit = 100): Promise<PhoneNumberResponse> => {
  const response = await apiClient.get(`/phone-numbers/numbers/job/${jobId}?page=${page}&limit=${limit}`);
  return response.data;
};

// Get phone numbers for a run
export const getPhoneNumbersForRun = async (runId: string, page = 1, limit = 100): Promise<PhoneNumberResponse> => {
  const response = await apiClient.get(`/phone-numbers/numbers/run/${runId}?page=${page}&limit=${limit}`);
  return response.data;
};

// Get phone numbers for a zipcode
export const getPhoneNumbersForZip = async (zip: string, page = 1, limit = 100): Promise<PhoneNumberResponse> => {
  const response = await apiClient.get(`/phone-numbers/numbers/zip/${zip}?page=${page}&limit=${limit}`);
  return response.data;
};

// Get phone number jobs for a run
export const getJobsForRun = async (runId: string): Promise<PhoneNumberJobResponse> => {
  const response = await apiClient.get(`/phone-numbers/jobs/run/${runId}`);
  return response.data;
};

// Get phone number jobs for a zipcode
export const getJobsForZip = async (zip: string): Promise<PhoneNumberJobResponse> => {
  const response = await apiClient.get(`/phone-numbers/jobs/zip/${zip}`);
  return response.data;
};

// Get phone number statistics
export const getPhoneNumberStats = async (): Promise<PhoneNumberStatsResponse> => {
  const response = await apiClient.get('/phone-numbers/stats');
  return response.data;
};

// Export phone numbers to CSV
export const exportPhoneNumbersToCSV = async (jobId: string, page = 1, limit = 1000) => {
  const response = await apiClient.get(`/phone-numbers/export/csv/${jobId}?page=${page}&limit=${limit}`, {
    responseType: 'blob'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `phone_numbers_${jobId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Delete phone numbers for a job
export const deletePhoneNumbersForJob = async (jobId: string) => {
  const response = await apiClient.delete(`/phone-numbers/numbers/job/${jobId}`);
  return response.data;
};

// Delete phone numbers for a run
export const deletePhoneNumbersForRun = async (runId: string) => {
  const response = await apiClient.delete(`/phone-numbers/numbers/run/${runId}`);
  return response.data;
};
