import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input, Button, Select, message, Card, Row, Col, Typography, Space, Tag, Progress, Table } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, ThunderboltOutlined, PhoneOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { telecareApi } from '../api/telecareApi';
import * as phoneNumberApi from '../api/phoneNumberApi';
import { PhoneNumberJob, PhoneNumber } from '../api/phoneNumberApi';
import FileViewerModal from './FileViewerModal';
import PhoneGenerationModal from './PhoneGenerationModal';
import ProcessingSessionsTab from './ProcessingSessionsTab';

interface NpaNxxRecord {
  id: number;
  npa: string;
  nxx: string;
  zip: string;
  state_code: string;
  city: string;
  rc: string;
  timezone_id?: number;
  timezone_name?: string;
  timezone_display_name?: string;
  abbreviation_standard?: string;
  abbreviation_daylight?: string;
  utc_offset_standard?: number;
  utc_offset_daylight?: number;
  observes_dst?: boolean;
  timezone_description?: string;
  timezone_states?: string[];
  created_at: string;
  updated_at: string;
}

interface TelecareRun {
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

const ComprehensiveDashboard: React.FC = () => {
  const [searchZipcodes, setSearchZipcodes] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<NpaNxxRecord[]>([]);
  const [originalSearchResults, setOriginalSearchResults] = useState<NpaNxxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [currentRun, setCurrentRun] = useState<TelecareRun | null>(null);
  const [latestRun, setLatestRun] = useState<TelecareRun | null>(null);
  const [fileViewerVisible, setFileViewerVisible] = useState(false);
  const [selectedRun, setSelectedRun] = useState<TelecareRun | null>(null);
  const [processedZipcodes, setProcessedZipcodes] = useState<TelecareRun[]>([]);
  const [loadingProcessed, setLoadingProcessed] = useState(false);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filterZipcodes, setFilterZipcodes] = useState<string[]>([]);
  const [loadingFilterZipcodes, setLoadingFilterZipcodes] = useState(false);
  const [phoneNumberJobs, setPhoneNumberJobs] = useState<PhoneNumberJob[]>([]);
  const [loadingPhoneNumberJobs, setLoadingPhoneNumberJobs] = useState(false);
  const [phoneNumberResults, setPhoneNumberResults] = useState<PhoneNumber[]>([]);
  const [loadingPhoneNumberResults, setLoadingPhoneNumberResults] = useState(false);
  const [phoneGenerationModalVisible, setPhoneGenerationModalVisible] = useState(false);
  const [appliedFilterConfig, setAppliedFilterConfig] = useState<any>(null);
  const { isAuthenticated } = useAuth();
const { isDarkMode } = useTheme();
const { Text } = Typography;

  // Load processed zipcodes on component mount
  useEffect(() => {
    loadProcessedZipcodes();
    loadSavedFilters();
    loadPhoneNumberJobs();
    
    // Check for zipcodes in URL parameters (from Records page)
    const urlParams = new URLSearchParams(window.location.search);
    const zipcodesParam = urlParams.get('zipcodes');
    if (zipcodesParam) {
      const zipcodes = zipcodesParam.split(',').filter(zip => zip.trim());
      if (zipcodes.length > 0) {
        console.log('🔍 Found zipcodes in URL:', zipcodes);
        setSearchZipcodes(zipcodes);
        // Auto-search for these zipcodes
        setTimeout(() => {
          searchWithZipcodes(zipcodes);
        }, 100);
      }
    }
  }, []);

  // Enhanced filter display component
  const FilterInfoDisplay = ({ filterConfig }: { filterConfig: any }) => {
    if (!filterConfig) return null;

    const filterItems = [];
    
    if (filterConfig.zip_code) {
      const zipcodes = filterConfig.zip_code.split(',').map((z: string) => z.trim());
      filterItems.push(
        <Tag key="zipcodes" color="blue">
          📍 {zipcodes.length} Zipcodes: {zipcodes.slice(0, 3).join(', ')}{zipcodes.length > 3 ? '...' : ''}
        </Tag>
      );
    }
    
    if (filterConfig.timezone) {
      const timezones = filterConfig.timezone.split(',').map((t: string) => t.trim());
      filterItems.push(
        <Tag key="timezones" color="green">
          🌍 {timezones.length} Timezones: {timezones.slice(0, 3).join(', ')}{timezones.length > 3 ? '...' : ''}
        </Tag>
      );
    }
    
    if (filterConfig.state) {
      const states = filterConfig.state.split(',').map((s: string) => s.trim());
      filterItems.push(
        <Tag key="states" color="orange">
          🏛️ {states.length} States: {states.join(', ')}
        </Tag>
      );
    }
    
    if (filterConfig.city) {
      const cities = filterConfig.city.split(',').map((c: string) => c.trim());
      filterItems.push(
        <Tag key="cities" color="purple">
          🏙️ {cities.length} Cities: {cities.slice(0, 2).join(', ')}{cities.length > 2 ? '...' : ''}
        </Tag>
      );
    }

    return filterItems.length > 0 ? (
      <div style={{ marginBottom: 16 }}>
        <Text strong>Applied Filter Criteria:</Text>
        <div style={{ marginTop: 8 }}>
          {filterItems}
        </div>
      </div>
    ) : null;
  };

  const loadSavedFilters = async () => {
    setLoadingFilters(true);
    try {
      // Use the proper filter API to get saved filters
      const response = await apiClient.get('/filters');
      if (response.data.success) {
        setSavedFilters(response.data.data || []);
        console.log('✅ Loaded saved filters:', response.data.data);
      } else {
        console.log('❌ Failed to load filters:', response.data.message);
        setSavedFilters([]);
      }
    } catch (error) {
      console.log('❌ Error loading saved filters:', error);
      setSavedFilters([]);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Refresh saved filters - can be called from parent or after operations
  const refreshSavedFilters = () => {
    loadSavedFilters();
  };

  const searchZipcodesFromFilter = async (filterId: string) => {
    if (!filterId) return;
    
    setLoadingFilterZipcodes(true);
    try {
      console.log('🔍 Fetching zipcodes for filter:', filterId);
      const response = await apiClient.get(`/filters/${filterId}/apply?limit=10000`);
      
      if (response.data.success) {
        const zipcodes = response.data.filteredZipcodes || [];
        const appliedFilter = response.data.appliedFilter;
        console.log('✅ Filter zipcodes loaded:', zipcodes);
        console.log('✅ Applied filter config:', appliedFilter?.filter_config);
        setFilterZipcodes(zipcodes);
        
        // Automatically populate search and trigger search if zipcodes are found
        if (zipcodes.length > 0) {
          console.log('🔍 Auto-populating search with zipcodes:', zipcodes);
          
          // Set the search zipcodes first
          setSearchZipcodes(zipcodes);
          console.log('🔍 searchZipcodes state updated with:', zipcodes);
          
          // Show success message
          message.success(`Loaded ${zipcodes.length} zipcodes from filter. Auto-searching for NPA NXX records...`);
          
          // Wait for state to update, then trigger search with filter criteria
          setTimeout(() => {
            console.log('🔍 Current searchZipcodes state:', searchZipcodes);
            console.log('🔍 Auto-triggering search for zipcodes:', zipcodes);
            // Store the applied filter config for phone generation
            setAppliedFilterConfig(appliedFilter?.filter_config);
            // Use the zipcodes directly and apply the same filter criteria
            searchWithZipcodesAndFilter(zipcodes, appliedFilter?.filter_config);
          }, 100);
        } else {
          message.warning('No zipcodes found for this filter');
        }
      } else {
        console.error('❌ Failed to fetch filter zipcodes:', response.data.message);
        message.error('Failed to load filter zipcodes');
      }
    } catch (error: any) {
      console.error('❌ Error fetching filter zipcodes:', error);
      message.error('Error loading filter zipcodes');
    } finally {
      setLoadingFilterZipcodes(false);
    }
  };

  // New function to search with specific zipcodes and filter criteria
  const searchWithZipcodesAndFilter = async (zipcodesToSearch: string[], filterConfig?: any) => {
    if (zipcodesToSearch.length === 0) {
      setError('No zipcodes to search');
      return;
    }

    // Validate zipcode format (5 digits) for all zipcodes
    const invalidZipcodes = zipcodesToSearch.filter(zip => !/^\d{5}$/.test(zip.trim()));
    if (invalidZipcodes.length > 0) {
      setError(`Invalid zipcode format: ${invalidZipcodes.join(', ')}. Please enter valid 5-digit zipcodes.`);
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    setCurrentRun(null);
    setLatestRun(null);

    try {
      console.log('🔍 Searching for zipcodes with filter criteria:', zipcodesToSearch, filterConfig);
      
      // Build filter parameters for NPA NXX records
      const filterParams = new URLSearchParams();
      
      // Add zipcodes as comma-separated list
      filterParams.append('zip', zipcodesToSearch.join(','));
      
      // Add timezone filter if present
      if (filterConfig?.timezone) {
        const timezoneValues = Array.isArray(filterConfig.timezone) 
          ? filterConfig.timezone 
          : filterConfig.timezone.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        if (timezoneValues.length > 0) {
          // Use timezone IDs directly for filtering
          filterParams.append('timezone_id', timezoneValues.join(','));
          console.log('🔍 Using timezone IDs for filtering:', timezoneValues);
        }
      }
      
      // Add state filter if present
      if (filterConfig?.state) {
        const stateValues = Array.isArray(filterConfig.state) 
          ? filterConfig.state 
          : filterConfig.state.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        if (stateValues.length > 0) {
          filterParams.append('state_code', stateValues.join(','));
        }
      }
      
      // Add city filter if present
      if (filterConfig?.city) {
        const cityValues = Array.isArray(filterConfig.city) 
          ? filterConfig.city 
          : filterConfig.city.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        if (cityValues.length > 0) {
          filterParams.append('city', cityValues.join(','));
        }
      }
      
      console.log('🔍 Filter parameters for NPA NXX search:', filterParams.toString());
      
      // Search for NPA NXX records with filter criteria
      const response = await apiClient.get(`/records?${filterParams.toString()}&limit=10000`);
      
      if (response.data.success) {
        const allResults = response.data.data || [];
        console.log(`✅ Found ${allResults.length} NPA NXX records matching filter criteria`);
        
        setSearchResults(allResults);
        setOriginalSearchResults(allResults); // Store original results for filter reset
        
        if (allResults.length === 0) {
          setError(`No NPA NXX records found matching the filter criteria for zipcodes: ${zipcodesToSearch.join(', ')}`);
        } else {
          message.success(`Found ${allResults.length} NPA NXX records matching filter criteria across ${zipcodesToSearch.length} zipcode(s)`);
          
          // Check for latest telecare run (use first zipcode for now)
          try {
            const latestRunResponse = await telecareApi.getLatestRun(zipcodesToSearch[0].trim());
            if (latestRunResponse.success) {
              setLatestRun(latestRunResponse.data);
            }
          } catch (error) {
            console.log('No previous telecare runs found');
          }
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch NPA NXX records');
      }
    } catch (error: any) {
      console.error('❌ Error searching with filter criteria:', error);
      setError(error.response?.data?.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  // New function to search with specific zipcodes (avoids state race condition)
  const searchWithZipcodes = async (zipcodesToSearch: string[]) => {
    if (zipcodesToSearch.length === 0) {
      setError('No zipcodes to search');
      return;
    }

    // Validate zipcode format (5 digits) for all zipcodes
    const invalidZipcodes = zipcodesToSearch.filter(zip => !/^\d{5}$/.test(zip.trim()));
    if (invalidZipcodes.length > 0) {
      setError(`Invalid zipcode format: ${invalidZipcodes.join(', ')}. Please enter valid 5-digit zipcodes.`);
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    setCurrentRun(null);
    setLatestRun(null);

    try {
      console.log('🔍 Searching for zipcodes:', zipcodesToSearch);
      
      // Search for each zipcode and combine results
      const allResults: NpaNxxRecord[] = [];
      const searchPromises = zipcodesToSearch.map(async (zipcode) => {
        try {
          const response = await apiClient.get(`/records/zip/${zipcode.trim()}?_t=${Date.now()}`);
          if (response.data.success) {
            return response.data.data || [];
          } else {
            console.warn(`⚠️ Failed to fetch records for zipcode ${zipcode}:`, response.data.message);
            return [];
          }
        } catch (error) {
          console.error(`❌ Error fetching records for zipcode ${zipcode}:`, error);
          return [];
        }
      });
      
      const results = await Promise.all(searchPromises);
      results.forEach((zipcodeResults, index) => {
        if (zipcodeResults.length > 0) {
          allResults.push(...zipcodeResults);
          console.log(`✅ Found ${zipcodeResults.length} records for zipcode ${zipcodesToSearch[index]}`);
        } else {
          console.log(`⚠️ No records found for zipcode ${zipcodesToSearch[index]}`);
        }
      });
      
      setSearchResults(allResults);
      setOriginalSearchResults(allResults); // Store original results for filter reset
      if (allResults.length === 0) {
        setError(`No NPA NXX records found for the selected zipcodes: ${zipcodesToSearch.join(', ')}`);
      } else {
        message.success(`Found ${allResults.length} records across ${zipcodesToSearch.length} zipcode(s)`);
        
        // Check for latest telecare run (use first zipcode for now)
        try {
          const latestRunResponse = await telecareApi.getLatestRun(zipcodesToSearch[0].trim());
          if (latestRunResponse.success) {
            setLatestRun(latestRunResponse.data);
          }
        } catch (error) {
          console.log('No previous telecare runs found');
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const searchZipcodeFromFilterResults = (zipcode: string) => {
    setSearchZipcodes(prev => [...prev, zipcode]);
    setTimeout(() => handleSearch(), 100);
  };

  // Function to map all filter zipcodes to the search input
  const mapFilterZipcodesToSearch = () => {
    if (filterZipcodes.length > 0) {
      setSearchZipcodes(filterZipcodes);
      message.success(`Mapped ${filterZipcodes.length} zipcodes from filter to search`);
    }
  };

  const handleSearch = async () => {
    if (searchZipcodes.length === 0) {
      setError('Please select at least one zipcode to search');
      return;
    }

    // Use the new searchWithZipcodes function for consistency
    searchWithZipcodes(searchZipcodes);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleProcessAndSave = async () => {
    if (searchResults.length === 0) {
      message.warning('No filtered NPA NXX records to process. Please ensure there are records in the table.');
      return;
    }

    setProcessing(true);
    setProcessingStatus('Starting telecare processing...');
    setError('');

    try {
      // Get unique zipcodes from the currently filtered searchResults (displayed in table)
      const filteredZipcodes = Array.from(new Set(searchResults.map(record => record.zip)));
      console.log(`🔍 Processing ${searchResults.length} filtered NPA NXX records from ${filteredZipcodes.length} zipcodes:`, filteredZipcodes);
      
      setProcessingStatus(`Starting telecare processing for ${filteredZipcodes.length} zipcodes...`);
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each zipcode individually since telecare API expects single zipcodes
      for (const zipcode of filteredZipcodes) {
        try {
          setProcessingStatus(`Starting telecare processing for zipcode ${zipcode}...`);
          console.log(`🔍 Processing zipcode: ${zipcode}`);
          
          const processResponse = await telecareApi.processZipcode(zipcode);
          
          if (processResponse.success) {
            successCount++;
            console.log(`✅ Started telecare processing for zipcode ${zipcode}`);
          } else {
            failureCount++;
            console.error(`❌ Failed to start processing for zipcode ${zipcode}:`, processResponse.message);
          }
        } catch (error: any) {
          failureCount++;
          console.error(`❌ Error processing zipcode ${zipcode}:`, error);
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Show summary message
      if (successCount > 0 && failureCount === 0) {
        setProcessingStatus('All telecare processing started successfully. Monitoring progress...');
        message.success(`Started telecare processing for all ${successCount} zipcodes from ${searchResults.length} filtered records!`);
        
        // Poll for status updates using the first successfully processed zipcode
        await pollProcessingStatus([filteredZipcodes[0]]);
      } else if (successCount > 0) {
        setProcessingStatus(`${successCount} telecare processes started successfully, ${failureCount} failed.`);
        message.warning(`Started telecare processing for ${successCount} zipcodes, ${failureCount} failed. Check logs for details.`);
        
        // Poll for status updates using the first successfully processed zipcode
        await pollProcessingStatus([filteredZipcodes[0]]);
      } else {
        throw new Error(`Failed to start telecare processing for all ${failureCount} zipcodes.`);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during telecare processing');
      setProcessingStatus('');
    } finally {
      setProcessing(false);
    }
  };

  const pollProcessingStatus = async (zipcodesToPoll?: string[]) => {
    try {
      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use filtered zipcodes if provided, otherwise fall back to original searchZipcodes
      const zipcodesForPolling = zipcodesToPoll || searchZipcodes;
      
      // Get latest run
      const latestRunResponse = await telecareApi.getLatestRun(zipcodesForPolling.join(','));
      if (latestRunResponse.success) {
        const run = latestRunResponse.data;
        setCurrentRun(run);
        
        if (run.status === 'processing') {
          setProcessingStatus('Running Python script...');
          // Continue polling with the same zipcodes
          setTimeout(() => pollProcessingStatus(zipcodesToPoll), 3000);
        } else if (run.status === 'success') {
          setProcessingStatus('Saving to database...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          setProcessingStatus('Done.');
          setLatestRun(run);
          // Refresh the run data
          setTimeout(() => {
            setCurrentRun(null);
            setProcessingStatus('');
          }, 2000);
        } else if (run.status === 'error') {
          throw new Error('Processing failed');
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
      setProcessingStatus('Error occurred during processing');
    }
  };

  const handleDownloadInputCSV = async (run?: TelecareRun) => {
    const targetRun = run || currentRun;
    if (!targetRun) {
      console.log('No target run found for download');
      return;
    }
    
            console.log('Starting download for run:', targetRun.run_id);
    try {
      const blob = await telecareApi.downloadInputCSV(targetRun.run_id);
      console.log('Download successful, blob size:', blob.size);
      telecareApi.downloadCSV(blob, targetRun.input_csv_name);
    } catch (error) {
      console.error('Error downloading input CSV:', error);
      setError('Failed to download input CSV');
    }
  };

  const handleDownloadOutputCSV = async (run?: TelecareRun) => {
    const targetRun = run || currentRun;
    if (!targetRun) {
      console.log('No target run found for download');
      return;
    }
    
    console.log('Starting output download for run:', targetRun.run_id);
    try {
      const blob = await telecareApi.downloadOutputCSV(targetRun.run_id);
      console.log('Output download successful, blob size:', blob.size);
      telecareApi.downloadCSV(blob, targetRun.output_csv_name);
    } catch (error) {
      console.error('Error downloading output CSV:', error);
      setError('Failed to download output CSV');
    }
  };

  const handleViewFiles = (run: TelecareRun) => {
    setSelectedRun(run);
    setFileViewerVisible(true);
  };

  const handleCloseFileViewer = () => {
    setFileViewerVisible(false);
    setSelectedRun(null);
  };

  const loadProcessedZipcodes = async () => {
    setLoadingProcessed(true);
    try {
      // Get recent runs from a sample zipcode to show processed data
      const response = await telecareApi.getRunsByZip('20560', 10);
      if (response.success) {
        setProcessedZipcodes(response.data);
      }
    } catch (error) {
      console.log('Error loading processed zipcodes:', error);
    } finally {
      setLoadingProcessed(false);
    }
  };

  const handleProcessedZipcodeClick = async (run: TelecareRun) => {
    setSearchZipcodes([run.zip]);
    setError('');
    setSearchResults([]);
    setLoading(true);
    
    try {
      const response = await apiClient.get(`/records/zip/${run.zip}`);
      if (response.data.success) {
        setSearchResults(response.data.data);
        setCurrentRun(run);
        setLatestRun(run);
      } else {
        setError('No records found for this zipcode');
      }
    } catch (error) {
      setError('Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  const refreshProcessedZipcodes = () => {
    loadProcessedZipcodes();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Processing' },
      success: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Success' },
      error: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Error' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const loadPhoneNumberJobs = async () => {
    setLoadingPhoneNumberJobs(true);
    try {
      // For now, we'll load jobs for the current zipcode if available
      if (searchZipcodes.length > 0) {
        const response = await phoneNumberApi.getJobsForZip(searchZipcodes[0]);
        if (response.success) {
          setPhoneNumberJobs(response.data || []);
        } else {
          console.error('Failed to load phone number jobs');
          setPhoneNumberJobs([]);
        }
      } else {
        setPhoneNumberJobs([]);
      }
    } catch (error) {
      console.error('Error loading phone number jobs:', error);
      setPhoneNumberJobs([]);
    } finally {
      setLoadingPhoneNumberJobs(false);
    }
  };

  const refreshPhoneNumberJobs = () => {
    loadPhoneNumberJobs();
  };

  const loadPhoneNumberResults = async (jobId: string) => {
    setLoadingPhoneNumberResults(true);
    try {
      const response = await phoneNumberApi.getPhoneNumbersForJob(jobId);
      if (response.success) {
        setPhoneNumberResults(response.data || []);
      } else {
        console.error('Failed to load phone number results');
        setPhoneNumberResults([]);
      }
    } catch (error) {
      console.error('Error loading phone number results:', error);
      setPhoneNumberResults([]);
    } finally {
      setLoadingPhoneNumberResults(false);
    }
  };

  const handleGeneratePhoneNumbers = async () => {
    if (searchResults.length === 0) {
      message.warning('No filtered NPA NXX records to generate phone numbers from.');
      return;
    }

    setProcessing(true);
    setProcessingStatus('Generating phone numbers...');
    setError('');

    try {
      // Generate phone numbers directly from filtered NPA NXX records
      const filteredZipcodes = Array.from(new Set(searchResults.map(record => record.zip)));
      console.log(`🔍 Generating phone numbers for ${searchResults.length} filtered NPA NXX records from ${filteredZipcodes.length} zipcodes:`, filteredZipcodes);
      
      let successCount = 0;
      let failureCount = 0;

      for (const zip of filteredZipcodes) {
        try {
          setProcessingStatus(`Generating phone numbers for ${zip}...`);
          
          // Use the new direct NPA NXX generation (no telecare required) with filter criteria
          const response = await phoneNumberApi.generateFromNpaNxxRecords(zip, appliedFilterConfig);
          
          if (response.success) {
            successCount++;
            console.log(`✅ Phone number generation started for ${zip}`);
          } else {
            failureCount++;
            console.error(`❌ Failed for ${zip}:`, response.message);
          }
        } catch (error: any) {
          failureCount++;
          console.error(`❌ Error for ${zip}:`, error);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Show summary message
      if (successCount > 0 && failureCount === 0) {
        message.success(`Phone number generation started for all ${successCount} zipcodes from ${searchResults.length} filtered records! Check the jobs section for progress.`);
      } else if (successCount > 0) {
        message.warning(`Phone number generation started for ${successCount} zipcodes from ${searchResults.length} filtered records, ${failureCount} failed. Check the jobs section for progress.`);
      } else {
        message.error(`Phone number generation failed for all ${failureCount} zipcodes.`);
      }

      // Refresh phone number jobs
      refreshPhoneNumberJobs();
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during phone number generation');
      message.error('Failed to start phone number generation');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleGenerateFromCSV = async (csvData: string) => {
    if (!csvData.trim()) {
      message.error('Please provide CSV data');
      return;
    }

    if (searchZipcodes.length === 0) {
      message.error('Please select a zipcode for phone number generation');
      return;
    }

    setProcessing(true);
    setProcessingStatus('Generating phone numbers from CSV...');
    setError('');

    try {
      const zip = searchZipcodes[0];
      const response = await phoneNumberApi.generateFromCSV(csvData, zip);
      
      if (response.success) {
        message.success('Phone number generation started from CSV! Check the jobs section below for progress.');
        loadPhoneNumberJobs(); // Refresh job list
      } else {
        throw new Error(response.message || 'Failed to start phone number generation');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during CSV phone number generation');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <p className="text-lg">Please log in to access the comprehensive dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🔍 Comprehensive Dashboard
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Search by zipcode to retrieve NPA NXX records and generate input CSV for Python processing
          </p>
        </div>

        {/* Search Section */}
        <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2">Zipcode Search</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter 5-digit zipcodes separated by commas to find associated NPA NXX records
            </p>
            {selectedFilter && filterZipcodes.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                  <span className="mr-2">🔄</span>
                  <span>
                    Auto-search enabled: {filterZipcodes.length} zipcodes from selected filter will be automatically searched
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
              multiple
                value={searchZipcodes.join(', ')}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  console.log('🔍 Input changed:', inputValue);
                  
                  // Split by comma and clean up each zipcode
                  const zipcodes = inputValue
                    .split(',')
                    .map(z => z.trim())
                    .filter(z => z.length > 0);
                  
                  console.log('🔍 Parsed zipcodes:', zipcodes);
                  setSearchZipcodes(zipcodes);
                }}
                onPressEnter={handleSearch}
                placeholder="e.g., 20560, 10001, 90210"
                size="large"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#000000',
                  borderColor: isDarkMode ? '#4B5563' : '#D1D5DB'
                }}
              />
              <div className="mt-2 text-xs text-gray-500">
                💡 Enter multiple zipcodes separated by commas (e.g., 07662, 81232, 90210)
              </div>
              
              {/* Quick Add Zipcode */}
              <div className="mt-3 flex items-center gap-2">
                <Input
                  placeholder="Quick add zipcode"
                  size="small"
                  style={{
                    width: '150px',
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    borderColor: isDarkMode ? '#4B5563' : '#D1D5DB'
                  }}
                  onPressEnter={(e) => {
                    const zipcode = e.currentTarget.value.trim();
                    if (zipcode && /^\d{5}$/.test(zipcode)) {
                      if (!searchZipcodes.includes(zipcode)) {
                        setSearchZipcodes(prev => [...prev, zipcode]);
                        e.currentTarget.value = '';
                      } else {
                        message.warning('Zipcode already added');
                      }
                    } else {
                      message.error('Please enter a valid 5-digit zipcode');
                    }
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Quick add zipcode"]') as HTMLInputElement;
                    if (input) {
                      const zipcode = input.value.trim();
                      if (zipcode && /^\d{5}$/.test(zipcode)) {
                        if (!searchZipcodes.includes(zipcode)) {
                          setSearchZipcodes(prev => [...prev, zipcode]);
                          input.value = '';
                        } else {
                          message.warning('Zipcode already added');
                        }
                      } else {
                        message.error('Please enter a valid 5-digit zipcode');
                      }
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              size="large"
              disabled={searchZipcodes.length === 0}
            >
              {loading ? 'Searching...' : `Search ${searchZipcodes.length > 0 ? `(${searchZipcodes.length})` : ''}`}
            </Button>
          </div>

          {/* Display current zipcodes */}
          {searchZipcodes.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Selected zipcodes:</div>
                <Button
                  size="small"
                  onClick={() => setSearchZipcodes([])}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchZipcodes.map((zip, index) => (
                  <Tag
                    key={index}
                    color="blue"
                    closable
                    onClose={() => {
                      const newZipcodes = searchZipcodes.filter((_, i) => i !== index);
                      setSearchZipcodes(newZipcodes);
                    }}
                  >
                    📮 {zip}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-red-900/20 border border-red-700 text-red-400' : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Saved Filters & Zipcode Search Section */}
        <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <span className="mr-2">🔍</span>
              Search from Saved Filters
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Use your saved demographic filters to find zipcodes, then search for NPA NXX records
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={loadSavedFilters}
                disabled={loadingFilters}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-200' 
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {loadingFilters ? '🔄' : '🔄 Refresh Filters'}
              </button>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {savedFilters.length} filter{savedFilters.length !== 1 ? 's' : ''} available
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filter Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Saved Filter
              </label>
              {loadingFilters ? (
                <div className={`w-full px-3 py-2 border rounded-lg ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-sm text-gray-500">Loading filters...</span>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedFilter}
                  onChange={(e) => {
                    console.log('🔍 Filter selection changed:', e.target.value);
                    setSelectedFilter(e.target.value);
                    if (e.target.value) {
                      console.log('🔍 Calling searchZipcodesFromFilter with ID:', e.target.value);
                      searchZipcodesFromFilter(e.target.value);
                      // Automatically search for NPA NXX records after getting zipcodes
                      // setTimeout(() => { // This timeout is now handled by searchZipcodesFromFilter
                      //   if (filterZipcodes.length > 0) {
                      //     console.log('�� Auto-searching for zipcodes:', filterZipcodes);
                      //     setSearchZipcodes(filterZipcodes);
                      //     // Trigger search after a short delay to ensure zipcodes are loaded
                      //     setTimeout(() => {
                      //       handleSearch();
                      //     }, 500);
                      //   }
                      // }, 1000);
                    } else {
                      console.log('🔍 Clearing filter zipcodes');
                      setFilterZipcodes([]);
                      setSearchResults([]);
                      setCurrentRun(null);
                      setLatestRun(null);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Choose a filter...</option>
                  {savedFilters.length > 0 ? (
                    savedFilters.map((filter) => (
                      <option key={filter.id} value={filter.id}>
                        {filter.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No filters available</option>
                  )}
                </select>
              )}
            </div>

            {/* Filter Info */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Filter Details
              </label>
              {savedFilters.length === 0 ? (
                <div className={`p-3 rounded-lg text-sm ${
                  isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p>No saved filters found</p>
                    <p className="text-xs mt-1">Create filters in the View Records dashboard first</p>
                    <button
                      onClick={refreshSavedFilters}
                      className="mt-2 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-lg text-sm ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedFilter ? (
                    (() => {
                      const filter = savedFilters.find(f => f.id.toString() === selectedFilter);
                      if (!filter) return 'No filter selected';
                      
                      const config = filter.filter_config;
                      const details = [];
                      
                      // Basic filters
                      if (config.search) details.push(`🔍 Search: "${config.search}"`);
                      if (config.zipcode) details.push(`📮 Zipcode: ${config.zipcode}`);
                      if (config.state) details.push(`🌍 State: ${config.state}`);
                      if (config.county) details.push(`🏛️ County: ${config.county}`);
                      if (config.city) details.push(`🏙️ City: ${config.city}`);
                      
                      // Advanced filters
                      if (config.mhhi_min) details.push(`Median HHI ≥ $${parseInt(config.mhhi_min).toLocaleString()}`);
                      if (config.mhhi_max) details.push(`Median HHI ≤ $${parseInt(config.mhhi_max).toLocaleString()}`);
                      if (config.avg_hhi_min) details.push(`Average HHI ≥ $${parseInt(config.avg_hhi_min).toLocaleString()}`);
                      if (config.avg_hhi_max) details.push(`Average HHI ≤ $${parseInt(config.avg_hhi_max).toLocaleString()}`);
                      if (config.pc_income_min) details.push(`Per Capita ≥ $${parseInt(config.pc_income_min).toLocaleString()}`);
                      if (config.pc_income_max) details.push(`Per Capita ≤ $${parseInt(config.pc_income_max).toLocaleString()}`);
                      if (config.pct_hh_w_income_200k_plus_min) details.push(`$200k+ % ≥ ${config.pct_hh_w_income_200k_plus_min}%`);
                      if (config.pct_hh_w_income_200k_plus_max) details.push(`$200k+ % ≤ ${config.pct_hh_w_income_200k_plus_max}%`);
                      if (config.median_age_max) details.push(`Median Age ≤ ${config.median_age_max}`);
                      if (config.pop_dens_sq_mi_min) details.push(`Population Density ≥ ${parseInt(config.pop_dens_sq_mi_min).toLocaleString()}/mi²`);
                      if (config.race_ethnicity_white_min) details.push(`White Population ≥ ${parseInt(config.race_ethnicity_white_min).toLocaleString()}`);
                      if (config.race_ethnicity_black_min) details.push(`Black Population ≥ ${parseInt(config.race_ethnicity_black_min).toLocaleString()}`);
                      if (config.race_ethnicity_hispanic_min) details.push(`Hispanic Population ≥ ${parseInt(config.race_ethnicity_hispanic_min).toLocaleString()}`);
                      if (config.households_min) details.push(`Households ≥ ${parseInt(config.households_min).toLocaleString()}`);
                      if (config.family_hh_total_min) details.push(`Family HH ≥ ${parseInt(config.family_hh_total_min).toLocaleString()}`);
                      if (config.edu_att_bachelors_min) details.push(`Bachelor's ≥ ${parseInt(config.edu_att_bachelors_min).toLocaleString()}`);
                      if (config.unemployment_pct_min) details.push(`Unemployment ≥ ${config.unemployment_pct_min}%`);
                      if (config.housing_units_min) details.push(`Housing Units ≥ ${parseInt(config.housing_units_min).toLocaleString()}`);
                      if (config.owner_occupied_min) details.push(`Owner Occupied ≥ ${parseInt(config.owner_occupied_min).toLocaleString()}`);
                      
                      // Sorting preferences
                      if (config.sortBy && config.sortBy !== 'created_at') {
                        const sortLabels: { [key: string]: string } = {
                          zipcode: 'Zipcode',
                          state: 'State',
                          county: 'County',
                          city: 'City',
                          mhhi: 'Median HHI',
                          avg_hhi: 'Average HHI',
                          pc_income: 'Per Capita Income',
                          median_age: 'Median Age',
                          households: 'Households',
                          race_ethnicity_white: 'White Population',
                          race_ethnicity_black: 'Black Population',
                          race_ethnicity_hispanic: 'Hispanic Population',
                          unemployment_pct: 'Unemployment %',
                          housing_units: 'Housing Units'
                        };
                        const sortLabel = sortLabels[config.sortBy] || config.sortBy;
                        const sortOrder = config.sortOrder === 'ascend' ? 'Ascending' : 'Descending';
                        details.push(`📊 Sort: ${sortLabel} (${sortOrder})`);
                      }
                      
                      return details.length > 0 ? details.join(', ') : 'No specific criteria';
                    })()
                  ) : (
                    'Select a filter to see details'
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Zipcode Results */}
          {selectedFilter ? (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Matching Zipcodes</h3>
                <div className="flex items-center gap-2">
                  {loadingFilterZipcodes && (
                    <div className="flex items-center text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      Loading zipcodes...
                    </div>
                  )}
                  {filterZipcodes.length > 0 && !loadingFilterZipcodes && (
                    <div className="flex items-center text-sm text-green-600">
                      <span className="mr-2">✅</span>
                      {filterZipcodes.length} zipcodes found
                    </div>
                  )}
                </div>
              </div>
              
              {loadingFilterZipcodes ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Finding zipcodes...</p>
                </div>
              ) : filterZipcodes.length > 0 ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Found {filterZipcodes.length} zipcode{filterZipcodes.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                        }`}>
                          Ready to Search
                        </span>
                        <button
                          onClick={mapFilterZipcodesToSearch}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white' 
                              : 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
                          }`}
                        >
                          Map to Search
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {filterZipcodes.map((zipcode) => (
                        <button
                          key={zipcode}
                          onClick={() => searchZipcodeFromFilterResults(zipcode)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                            isDarkMode
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          📮 {zipcode}
                        </button>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500">
                      💡 Click any zipcode above to add it to search, or use "Map to Search" to add all
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-sm">No zipcodes found matching this filter</p>
                  <p className="text-xs mt-1">Try adjusting your filter criteria</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium mb-2">Select a Filter to Begin</h3>
                <p className="text-sm mb-4">Choose a saved demographic filter from the dropdown above</p>
                <div className={`inline-flex items-center px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className="mr-2">📊</span>
                  <span className="text-sm">Filters will show matching zipcodes and auto-search for NPA NXX records</span>
                </div>
                {savedFilters.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      💡 No filters available yet. Go to View Records dashboard to create your first filter!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Processed Zipcodes Section */}
        {/* <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                <span className="mr-2">⚡</span>
                Processed Zipcodes
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Zipcodes that have been processed through the telecare system
              </p>
            </div>
            <button
              onClick={refreshProcessedZipcodes}
              disabled={loadingProcessed}
              className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-gray-200' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {loadingProcessed ? '🔄' : '🔄 Refresh'}
            </button>
          </div>
          
          {loadingProcessed ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading processed zipcodes...</p>
            </div>
          ) : processedZipcodes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedZipcodes.map((run) => (
                  <div
                    key={run.run_id}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer group ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                    onClick={() => handleProcessedZipcodeClick(run)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {run.zip}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          run.status === 'success' 
                            ? (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700')
                            : run.status === 'error'
                            ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                            : (isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {run.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Started:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                          {formatDate(run.started_at)}
                        </span>
                      </div>
                      
                      {run.finished_at && (
                        <div className="flex items-center justify-between text-xs">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Finished:</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {formatDate(run.finished_at)}
                          </span>
                        </div>
                      )}
                      
                      {run.row_count > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Rows:</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {run.row_count}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Click to view details
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Processed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total processed: {processedZipcodes.length} zipcodes
                  </span>
                  <button
                    onClick={() => setProcessedZipcodes([])}
                    className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-300' 
                        : 'border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    Clear List
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-medium mb-2">No Processed Zipcodes Yet</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Process your first zipcode to see it appear here
              </p>
            </div>
          )}
        </div> */}

       
        {/* Phone Number Results Section */}
        {phoneNumberResults.length > 0 && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="mb-4">
              <h3 className="text-xl font-bold">Generated Phone Numbers</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {phoneNumberResults.length} phone numbers generated
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table
                dataSource={phoneNumberResults}
                columns={[
                  {
                    title: 'Phone Number',
                    dataIndex: 'full_phone_number',
                    key: 'full_phone_number',
                    render: (text) => <span className="font-mono">{text}</span>
                  },
                  {
                    title: 'NPA-NXX',
                    key: 'npa_nxx',
                    render: (_, record) => `${record.npa}-${record.nxx}`
                  },
                  {
                    title: 'Thousands',
                    dataIndex: 'thousands',
                    key: 'thousands'
                  },
                  {
                    title: 'State',
                    dataIndex: 'state',
                    key: 'state'
                  },
                  {
                    title: 'Timezone',
                    dataIndex: 'timezone',
                    key: 'timezone'
                  },
                  {
                    title: 'Company',
                    dataIndex: 'company',
                    key: 'company',
                    render: (text) => text || '-'
                  }
                ]}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                }}
                size="small"
                scroll={{ x: 800 }}
              />
            </div>
          </div>
        )}

        {/* Process & Save Button */}
        {searchResults.length > 0 && !processing && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Process Filtered Records (Telecare)</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Generate CSV from the <strong>{searchResults.length} filtered NPA NXX records</strong> displayed in the table above, run Python script (with ChromeDriver), and save results to database
                </p>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  💡 Only the records currently shown in the table will be processed (after applying any State, Timezone, City, or Rate Center filters)
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ <strong>Requires:</strong> Python environment + ChromeDriver setup. If this fails, use "Generate Phone Numbers" below for direct generation.
                </div>
              </div>
              <button
                onClick={handleProcessAndSave}
                disabled={processing || searchResults.length === 0}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  processing || searchResults.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                🚀 Process {searchResults.length} Records
              </button>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <div>
                <h3 className="text-lg font-semibold">Processing in Progress</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {processingStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Run Status */}
        {currentRun && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Current Run Status</h3>
              {getStatusBadge(currentRun.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Run ID</div>
                <div className="font-mono text-sm">{String(currentRun.run_id || '').slice(0, 8)}...</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Started</div>
                <div className="text-sm">{formatDate(currentRun.started_at)}</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</div>
                <div className="text-sm">{currentRun.status}</div>
              </div>
            </div>

            {currentRun.status === 'success' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => handleViewFiles(currentRun)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                >
                  👁️ View Files
                </button>
                <button
                  onClick={() => handleDownloadInputCSV(currentRun)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📥 Download Input CSV
                </button>
                <button
                  onClick={() => handleDownloadOutputCSV(currentRun)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  📥 Download Output CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* Latest Run Info */}
        {latestRun && !currentRun && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Latest Processing Run</h3>
              {getStatusBadge(latestRun.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Run ID</div>
                <div className="font-mono text-sm">{String(latestRun.run_id || '').slice(0, 8)}...</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Started</div>
                <div className="text-sm">{formatDate(latestRun.started_at)}</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Finished</div>
                <div className="text-sm">{latestRun.finished_at ? formatDate(latestRun.finished_at) : 'N/A'}</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rows Processed</div>
                <div className="text-sm">{latestRun.row_count}</div>
              </div>
            </div>

            {latestRun.status === 'success' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => handleViewFiles(latestRun)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                >
                  👁️ View Files
                </button>
                <button
                  onClick={() => handleDownloadInputCSV(latestRun)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  📥 Download Input CSV
                </button>
                <button
                  onClick={() => handleDownloadOutputCSV(latestRun)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  📥 Download Output CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {searchResults.length > 0 && (
          <div className={`mb-8 p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">NPA NXX Records</h2>
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={() => setPhoneGenerationModalVisible(true)}
                  disabled={searchResults.length === 0}
                  size="large"
                >
                  Generate Phone Numbers ({searchResults.length} records)
                </Button>
                <Button
                  type="default"
                  icon={<PhoneOutlined />}
                  onClick={handleGeneratePhoneNumbers}
                  loading={processing}
                  disabled={processing}
                  size="small"
                >
                  Quick Generate (Legacy)
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const csvContent = searchResults.map(record => {
                      const timezoneInfo = record.timezone_display_name ? 
                        `${record.timezone_display_name} (${record.abbreviation_standard})` : 
                        '';
                      return `${record.npa},${record.nxx},${record.zip},${record.state_code},${record.city},${record.rc},${timezoneInfo}`;
                    }).join('\n');
                    const csvHeader = 'NPA,NXX,ZIP,STATE,CITY,RC,TIMEZONE\n';
                    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `npa_nxx_${searchZipcodes.join('_')}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </Button>
              </div>
            </div>
            
            {/* Helpful Information */}
            <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-50 text-green-700'} border ${isDarkMode ? 'border-green-700' : 'border-green-200'}`}>
              <div className="text-sm">
                ✅ <strong>Direct Phone Generation:</strong> These buttons generate phone numbers directly from NPA NXX records - no Python/ChromeDriver required! Works independently of telecare processing.
              </div>
              <div className="text-xs mt-2 opacity-80">
                🔍 <strong>Validation:</strong> Only records with valid NPA (3 digits), NXX (3 digits), and STATE (2 chars) will generate phone numbers. Invalid records are gracefully skipped.
              </div>
              <div className="text-xs mt-1 opacity-80">
                🚫 <strong>Duplicate Prevention:</strong> Phone numbers that already exist in the database are automatically skipped to avoid duplicates.
              </div>
            </div>

            {/* NPA NXX Table Filters */}
            <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="text-lg font-semibold mb-3">Filter NPA NXX Records</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    State
                  </label>
                  <Select
                    mode="multiple"
                    placeholder="Select states"
                    style={{ width: '100%' }}
                    onChange={(values) => {
                      const filteredResults = searchResults.filter(record => 
                        values.length === 0 || values.includes(record.state_code)
                      );
                      setSearchResults(filteredResults);
                    }}
                    options={Array.from(new Set(searchResults.map(r => r.state_code))).map(state => ({
                      label: state,
                      value: state
                    }))}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Timezone
                  </label>
                  <Select
                    mode="multiple"
                    placeholder="Select timezones"
                    style={{ width: '100%' }}
                    onChange={(values) => {
                      const filteredResults = searchResults.filter(record => 
                        values.length === 0 || values.includes(record.timezone_display_name)
                      );
                      setSearchResults(filteredResults);
                    }}
                    options={Array.from(new Set(searchResults.map(r => r.timezone_display_name).filter(Boolean))).map(timezone => ({
                      label: timezone,
                      value: timezone
                    }))}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    City
                  </label>
                  <Select
                    mode="multiple"
                    placeholder="Select cities"
                    style={{ width: '100%' }}
                    onChange={(values) => {
                      const filteredResults = searchResults.filter(record => 
                        values.length === 0 || values.includes(record.city)
                      );
                      setSearchResults(filteredResults);
                    }}
                    options={Array.from(new Set(searchResults.map(r => r.city).filter(Boolean))).map(city => ({
                      label: city,
                      value: city
                    }))}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rate Center
                  </label>
                  <Select
                    mode="multiple"
                    placeholder="Select rate centers"
                    style={{ width: '100%' }}
                    onChange={(values) => {
                      const filteredResults = searchResults.filter(record => 
                        values.length === 0 || values.includes(record.rc)
                      );
                      setSearchResults(filteredResults);
                    }}
                    options={Array.from(new Set(searchResults.map(r => r.rc).filter(Boolean))).map(rc => ({
                      label: rc,
                      value: rc
                    }))}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button 
                  size="small" 
                  onClick={() => {
                    // Reset to original results
                    setSearchResults(originalSearchResults);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Filter Info Display */}
            <FilterInfoDisplay filterConfig={appliedFilterConfig} />

            {/* Results Table */}
            <div className={`overflow-hidden rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="overflow-x-auto">
                <table className={`min-w-full divide-y ${
                  isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>ID</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>NPA</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>NXX</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>ZIP</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>STATE</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>CITY</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>RC</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>TIMEZONE</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>TIMEZONE ID</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>CREATED AT</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'
                  }`}>
                    {searchResults.map((record) => (
                      <tr key={record.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {record.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">
                          {record.npa}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600 dark:text-green-400">
                          {record.nxx}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {record.zip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.state_code}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {record.city}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                          {record.rc}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {record.timezone_display_name ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {record.observes_dst && record.abbreviation_daylight ? 
                                record.abbreviation_daylight : 
                                record.abbreviation_standard || 'N/A'
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {record.timezone_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(record.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Stats */}
            <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Total Records</div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{searchResults.length}</div>
                </div>
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Unique NPAs</div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {new Set(searchResults.map(r => r.npa)).size}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Unique Cities</div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {new Set(searchResults.map(r => r.city)).size}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>States</div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {new Set(searchResults.map(r => r.state_code)).size}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && searchResults.length === 0 && !error && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium mb-2">Ready to Search</h3>
            <p>Enter a zipcode above to find NPA NXX records</p>
            
            {/* Sample Zipcodes */}
            <div className="mt-6">
              <p className="text-sm mb-2">Try these sample zipcodes:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['20560', '10001', '90210', '33101', '60601'].map((zip) => (
                  <button
                    key={zip}
                    onClick={() => {
                      setSearchZipcodes([zip]);
                      setTimeout(() => handleSearch(), 100);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {zip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {selectedRun && (
        <FileViewerModal
          visible={fileViewerVisible}
          onClose={handleCloseFileViewer}
          runId={selectedRun.run_id}
          zipcode={selectedRun.zip}
          inputFilename={selectedRun.input_csv_name}
          outputFilename={selectedRun.output_csv_name}
          hasOutput={selectedRun.status === 'success' && selectedRun.row_count > 0}
        />
      )}

      {/* Phone Generation Modal */}
      <PhoneGenerationModal
        visible={phoneGenerationModalVisible}
        onClose={() => setPhoneGenerationModalVisible(false)}
        onSuccess={(generation) => {
          console.log('🎉 Phone generation successful:', generation);
          // Optionally refresh phone number jobs or redirect to phone dashboard
          message.success('Phone numbers generated successfully! Check the Phone Dashboard for download.');
        }}
        initialFilters={appliedFilterConfig}
        sourceZipcodes={searchZipcodes}
        npaRecordsCount={searchResults.length}
      />
    </div>
  );
};

export default ComprehensiveDashboard;

