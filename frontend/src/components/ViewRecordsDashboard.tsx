import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, Button, Row, Col, Form, Input, Select, message, Collapse, Divider, Typography, Space, Badge, Tooltip, Layout, Tag, Table } from 'antd';
import { ReloadOutlined, SaveOutlined, BookFilled, EyeOutlined, FilterOutlined, MenuOutlined, DownloadOutlined, SearchOutlined, PhoneOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import AdvancedFilters from './AdvancedFilters';
import { FilterConfig } from '../api/filterApi';
import { DemographicRecord } from './DemographicRecords';
import timezoneApi from '../api/timezoneApi';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const ViewRecordsDashboard: React.FC = () => {
  const [records, setRecords] = useState<DemographicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setCurrentPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zipcodeFilter, setZipcodeFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    county: [] as string[],
    city: [] as string[],
    timezone: [] as string[],
    mhhi: [] as string[],
    avg_hhi: [] as string[],
    median_age: [] as string[],
    households: [] as string[],
    race_ethnicity_white: [] as string[],
    race_ethnicity_black: [] as string[],
    race_ethnicity_hispanic: [] as string[],
    mhhi_min: '',
    mhhi_max: '',
    avg_hhi_min: '',
    avg_hhi_max: '',
    pc_income_min: '',
    pc_income_max: '',
    pct_hh_w_income_200k_plus_min: '',
    pct_hh_w_income_200k_plus_max: '',
    median_age_min: '',
    median_age_max: '',
    pop_dens_sq_mi_min: '',
    pop_dens_sq_mi_max: '',
    race_ethnicity_white_min: '',
    race_ethnicity_white_max: '',
    race_ethnicity_black_min: '',
    race_ethnicity_black_max: '',
    race_ethnicity_hispanic_min: '',
    race_ethnicity_hispanic_max: '',
    households_min: '',
    households_max: '',
    family_hh_total_min: '',
    family_hh_total_max: '',
    edu_att_bachelors_min: '',
    edu_att_bachelors_max: '',
    unemployment_pct_min: '',
    unemployment_pct_max: '',
    housing_units_min: '',
    housing_units_max: '',
    owner_occupied_min: '',
    owner_occupied_max: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [states, setStates] = useState<string[]>([]);
  const [filteredZipcodes, setFilteredZipcodes] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [loadingSavedFilters, setLoadingSavedFilters] = useState(false);
  const [zipcodeOptions, setZipcodeOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [countyOptions, setCountyOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingZipcodes, setLoadingZipcodes] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // New state for Excel-like functionality
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // State for storing all unique filter values (not just current page)
  const [allZipcodes, setAllZipcodes] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);
  const [allCounties, setAllCounties] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [allTimezoneOptions, setAllTimezoneOptions] = useState<any[]>([]);
  const [allMhhiValues, setAllMhhiValues] = useState<string[]>([]);
  const [allAvgHhiValues, setAllAvgHhiValues] = useState<string[]>([]);
  const [allMedianAgeValues, setAllMedianAgeValues] = useState<string[]>([]);
  const [allHouseholdsValues, setAllHouseholdsValues] = useState<string[]>([]);
  const [allRaceWhiteValues, setAllRaceWhiteValues] = useState<string[]>([]);
  const [allRaceBlackValues, setAllRaceBlackValues] = useState<string[]>([]);
  const [allRaceHispanicValues, setAllRaceHispanicValues] = useState<string[]>([]);

  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const [form] = Form.useForm();

  // Load saved filters and unique values on component mount
  useEffect(() => {
    loadSavedFilters();
    if (isAuthenticated) {
      loadAllUniqueValues();
    }
  }, [isAuthenticated]);

  // Fetch records when filters change
  useEffect(() => {
    console.log('🔄 Filters changed, refetching data...');
    fetchRecords();
  }, [zipcodeFilter, stateFilter, advancedFilters, currentPage, pageSize]);

  // Function to load all unique values for filters
  const loadAllUniqueValues = async () => {
    if (!isAuthenticated) {
      console.log('⚠️ User not authenticated, skipping unique values load');
      return;
    }
    try {
      // Fetch all unique zipcodes
      const zipcodesResponse = await apiClient.get('/demographic/records/unique/zip_code?limit=1000');
      if (zipcodesResponse.data.success) {
        const zipcodes = zipcodesResponse.data.data || [];
        setAllZipcodes(zipcodes);
        console.log(`✅ Loaded ${zipcodes.length} unique zipcodes for filters`);
      }

      // Fetch all unique states
      const statesResponse = await apiClient.get('/demographic/records/unique/state?limit=100');
      if (statesResponse.data.success) {
        const states = statesResponse.data.data || [];
        setAllStates(states);
        console.log(`✅ Loaded ${states.length} unique states for filters`);
      }

      // Fetch all unique counties
      const countiesResponse = await apiClient.get('/demographic/records/unique/county?limit=1000');
      if (countiesResponse.data.success) {
        const counties = countiesResponse.data.data || [];
        setAllCounties(counties);
        console.log(`✅ Loaded ${counties.length} unique counties for filters`);
      }

      // Fetch all unique cities
      const citiesResponse = await apiClient.get('/demographic/records/unique/city?limit=1000');
      if (citiesResponse.data.success) {
        const cities = citiesResponse.data.data || [];
        setAllCities(cities);
        console.log(`✅ Loaded ${cities.length} unique cities for filters`);
      }

      // Fetch all timezone options
      const timezoneOptions = await timezoneApi.getTimezoneOptions();
      setAllTimezoneOptions(timezoneOptions);
      console.log(`✅ Loaded ${timezoneOptions.length} timezone options for filters`);


      // Fetch all unique numeric values
      const mhhiResponse = await apiClient.get('/demographic/records/unique/mhhi?limit=1000');
      if (mhhiResponse.data.success) {
        const mhhiValues = mhhiResponse.data.data || [];
        setAllMhhiValues(mhhiValues);
        console.log(`✅ Loaded ${mhhiValues.length} unique Median HHI values for filters`);
      }

      const avgHhiResponse = await apiClient.get('/demographic/records/unique/avg_hhi?limit=1000');
      if (avgHhiResponse.data.success) {
        const avgHhiValues = avgHhiResponse.data.data || [];
        setAllAvgHhiValues(avgHhiValues);
        console.log(`✅ Loaded ${avgHhiValues.length} unique Average HHI values for filters`);
      }

      const medianAgeResponse = await apiClient.get('/demographic/records/unique/median_age?limit=1000');
      if (medianAgeResponse.data.success) {
        const medianAgeValues = medianAgeResponse.data.data || [];
        setAllMedianAgeValues(medianAgeValues);
        console.log(`✅ Loaded ${medianAgeValues.length} unique Median Age values for filters`);
      }

      const householdsResponse = await apiClient.get('/demographic/records/unique/households?limit=1000');
      if (householdsResponse.data.success) {
        const householdsValues = householdsResponse.data.data || [];
        setAllHouseholdsValues(householdsValues);
        console.log(`✅ Loaded ${householdsValues.length} unique Households values for filters`);
      }

      const raceWhiteResponse = await apiClient.get('/demographic/records/unique/race_ethnicity_white?limit=1000');
      if (raceWhiteResponse.data.success) {
        const raceWhiteValues = raceWhiteResponse.data.data || [];
        setAllRaceWhiteValues(raceWhiteValues);
        console.log(`✅ Loaded ${raceWhiteValues.length} unique White population values for filters`);
      }

      const raceBlackResponse = await apiClient.get('/demographic/records/unique/race_ethnicity_black?limit=1000');
      if (raceBlackResponse.data.success) {
        const raceBlackValues = raceBlackResponse.data.data || [];
        setAllRaceBlackValues(raceBlackValues);
        console.log(`✅ Loaded ${raceBlackValues.length} unique Black population values for filters`);
      }

      const raceHispanicResponse = await apiClient.get('/demographic/records/unique/race_ethnicity_hispanic?limit=1000');
      if (raceHispanicResponse.data.success) {
        const raceHispanicValues = raceHispanicResponse.data.data || [];
        setAllRaceHispanicValues(raceHispanicValues);
        console.log(`✅ Loaded ${raceHispanicValues.length} unique Hispanic population values for filters`);
      }
          } catch (error: any) {
        console.error('Error loading unique values for filters:', error);
        if (error.response?.status === 401) {
          console.error('Authentication error - user may need to log in');
        } else if (error.response?.status === 403) {
          console.error('Access denied - insufficient permissions');
        } else {
          console.error('Network or server error:', error.message);
        }
        
        // Fallback: use current page data for filters if server-side loading fails
        console.log('🔄 Using fallback filter values from current page data');
        if (records.length > 0) {
          setAllMhhiValues(Array.from(new Set(records.map(record => record.mhhi).filter(Boolean))));
          setAllAvgHhiValues(Array.from(new Set(records.map(record => record.avg_hhi).filter(Boolean))));
          setAllMedianAgeValues(Array.from(new Set(records.map(record => record.median_age).filter(Boolean))));
          setAllHouseholdsValues(Array.from(new Set(records.map(record => record.households).filter(Boolean))));
          setAllRaceWhiteValues(Array.from(new Set(records.map(record => record.race_ethnicity_white).filter(Boolean))));
          setAllRaceBlackValues(Array.from(new Set(records.map(record => record.race_ethnicity_black).filter(Boolean))));
          setAllRaceHispanicValues(Array.from(new Set(records.map(record => record.race_ethnicity_hispanic).filter(Boolean))));
        }
      }
  };

  const loadSavedFilters = async () => {
    setLoadingSavedFilters(true);
    try {
      const response = await apiClient.get('/filters');
      if (response.data.success) {
        setSavedFilters(response.data.data || []);
      }
    } catch (error) {
      console.log('No saved filters found or error loading filters');
      setSavedFilters([]);
    } finally {
      setLoadingSavedFilters(false);
    }
  };

  const fetchZipcodeOptions = async (query: string) => {
    console.log('🔍 fetchZipcodeOptions called with query:', query);
    if (query.length < 3) {
      console.log('⚠️ Query too short, clearing options');
      setZipcodeOptions([]);
      return;
    }
    
    setLoadingZipcodes(true);
    try {
      const url = `/demographic/records/unique/zip_code?search=${encodeURIComponent(query)}&limit=10`;
      console.log('🌐 Calling API:', url);
      const response = await apiClient.get(url);
      console.log('✅ Zipcode API response:', response.data);
      if (response.data.success) {
        setZipcodeOptions(response.data.data || []);
        console.log('📮 Set zipcode options:', response.data.data);
      } else {
        console.log('❌ API returned success: false');
        setZipcodeOptions([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching zipcode options:', error);
      console.error('❌ Error response:', error.response?.data);
      setZipcodeOptions([]);
    } finally {
      setLoadingZipcodes(false);
    }
  };

  const fetchStateOptions = async (query: string) => {
    console.log('🔍 fetchStateOptions called with query:', query);
    if (query.length < 2) {
      console.log('⚠️ Query too short, clearing options');
      setStateOptions([]);
      return;
    }
    
    setLoadingStates(true);
    try {
      const url = `/demographic/records/unique/state?search=${encodeURIComponent(query)}&limit=10`;
      console.log('🌐 Calling API:', url);
      const response = await apiClient.get(url);
      console.log('✅ State API response:', response.data);
      if (response.data.success) {
        setStateOptions(response.data.data || []);
        console.log('🌍 Set state options:', response.data.data);
      } else {
        console.log('❌ API returned success: false');
        setStateOptions([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching state options:', error);
      console.error('❌ Error response:', error.response?.data);
      setStateOptions([]);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCountyOptions = async (query: string) => {
    console.log('🔍 fetchCountyOptions called with query:', query);
    if (query.length < 2) {
      console.log('⚠️ Query too short, clearing options');
      setCountyOptions([]);
      return;
    }
    
    setLoadingCounties(true);
    try {
      const url = `/demographic/records/unique/county?search=${encodeURIComponent(query)}&limit=10`;
      console.log('🌐 Calling API:', url);
      const response = await apiClient.get(url);
      console.log('✅ County API response:', response.data);
      if (response.data.success) {
        setCountyOptions(response.data.data || []);
        console.log('🏛️ Set county options:', response.data.data);
      } else {
        console.log('❌ API returned success: false');
        setCountyOptions([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching county options:', error);
      console.error('❌ Error response:', error.response?.data);
      setCountyOptions([]);
    } finally {
      setLoadingCounties(false);
    }
  };

  const fetchCityOptions = async (query: string) => {
    console.log('🔍 fetchCityOptions called with query:', query);
    if (query.length < 2) {
      console.log('⚠️ Query too short, clearing options');
      setCityOptions([]);
      return;
    }
    
    setLoadingCities(true);
    try {
      const url = `/demographic/records/unique/city?search=${encodeURIComponent(query)}&limit=10`;
      console.log('🌐 Calling API:', url);
      const response = await apiClient.get(url);
      console.log('✅ City API response:', response.data);
      if (response.data.success) {
        setCityOptions(response.data.data || []);
        console.log('🏙️ Set city options:', response.data.data);
      } else {
        console.log('❌ API returned success: false');
        setCityOptions([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching city options:', error);
      console.error('❌ Error response:', error.response?.data);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const deleteSavedFilter = async (filterId: number) => {
    try {
      const response = await apiClient.delete(`/filters/${filterId}`);
      if (response.data.success) {
        message.success('Filter deleted successfully');
        await loadSavedFilters(); // Refresh the list
      } else {
        message.error(response.data.message || 'Failed to delete filter');
      }
    } catch (error: any) {
      console.error('Error deleting filter:', error);
      message.error('Failed to delete filter');
    }
  };

  const hasActiveFilters = () => {
    return searchQuery.trim() || 
           zipcodeFilter.length > 0 || 
           stateFilter.length > 0 || 
           advancedFilters.county.length > 0 ||
           advancedFilters.city.length > 0 ||
           Object.entries(advancedFilters).some(([key, value]) => 
             key !== 'county' && key !== 'city' && value && value.toString().trim() !== ''
           );
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStates();
      fetchRecords();
    }
  }, [isAuthenticated, currentPage, pageSize, sortBy, sortOrder]);

  // Separate useEffect for filters to avoid infinite loops
  useEffect(() => {
    if (isAuthenticated && (searchQuery || stateFilter.length > 0 || zipcodeFilter.length > 0 || Object.keys(advancedFilters).length > 0)) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchRecords();
    }
  }, [searchQuery, stateFilter, zipcodeFilter, advancedFilters]);

  const fetchStates = async () => {
    try {
      const response = await apiClient.get('/demographic/records/states/list');
      if (response.data.success) {
        setStates(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching records with params:', { currentPage, pageSize, searchQuery, stateFilter, zipcodeFilter, advancedFilters });
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder: sortOrder === 'ascend' ? 'ASC' : 'DESC',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (stateFilter.length > 0) params.append('state', stateFilter.join(','));
      if (zipcodeFilter.length > 0) params.append('zip_code', zipcodeFilter.join(','));

      // Add advanced filters
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            // Handle multiselect arrays (county, city)
            params.append(key, value.join(','));
          } else if (typeof value === 'string' && value.trim() !== '') {
            // Handle string values
            params.append(key, value);
          }
        }
      });

      console.log('🔍 API URL:', `/demographic/records?${params}`);
      const response = await apiClient.get(`/demographic/records?${params}`);
      
      console.log('🔍 API Response:', response.data);
      const result = response.data;

      if (result.success) {
        setRecords(result.data);
        setTotal(result.pagination.total);
        if (result.filteredZipcodes) {
          setFilteredZipcodes(result.filteredZipcodes);
        }
        console.log('✅ Records loaded:', result.data.length, 'Total:', result.pagination.total);
      } else {
        setError('Failed to fetch records');
        console.error('❌ API returned error:', result);
      }
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      setError(error.response?.data?.message || 'Failed to fetch records');
      message.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedFiltersChange = (filters: FilterConfig) => {
    //@ts-ignore
    setAdvancedFilters(filters);
    setCurrentPage(1);
  };

  const handleApplyAdvancedFilters = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleClearAdvancedFilters = () => {
    //@ts-ignore
    setAdvancedFilters({});
    setCurrentPage(1);
  };

  const clearBasicFilters = () => {
    setSearchQuery('');
    setStateFilter([]);
    setZipcodeFilter([]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    // Reset all filter states
    setSearchQuery('');
    setZipcodeFilter([]);
    setStateFilter([]);
    setAdvancedFilters({
      county: [],
      city: [],
      timezone: [],
      mhhi: [],
      avg_hhi: [],
      median_age: [],
      households: [],
      race_ethnicity_white: [],
      race_ethnicity_black: [],
      race_ethnicity_hispanic: [],
      mhhi_min: '',
      mhhi_max: '',
      avg_hhi_min: '',
      avg_hhi_max: '',
      pc_income_min: '',
      pc_income_max: '',
      pct_hh_w_income_200k_plus_min: '',
      pct_hh_w_income_200k_plus_max: '',
      median_age_min: '',
      median_age_max: '',
      pop_dens_sq_mi_min: '',
      pop_dens_sq_mi_max: '',
      race_ethnicity_white_min: '',
      race_ethnicity_white_max: '',
      race_ethnicity_black_min: '',
      race_ethnicity_black_max: '',
      race_ethnicity_hispanic_min: '',
      race_ethnicity_hispanic_max: '',
      households_min: '',
      households_max: '',
      family_hh_total_min: '',
      family_hh_total_max: '',
      edu_att_bachelors_min: '',
      edu_att_bachelors_max: '',
      unemployment_pct_min: '',
      unemployment_pct_max: '',
      housing_units_min: '',
      housing_units_max: '',
      owner_occupied_min: '',
      owner_occupied_max: ''
    });
    
    // Reset sorting to defaults
    setSortBy('created_at');
    setSortOrder('descend');
    
    // Reset form fields
    form.resetFields();
    
    // Reset current page and fetch records
    setCurrentPage(1);
    fetchRecords();
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      message.error('Please enter a filter name');
      return;
    }

    try {
      // Combine basic and advanced filters with sorting preferences
      const allFilters: any = {};
      
      // Basic filters - only include if they have values
      if (searchQuery.trim()) allFilters.search = searchQuery.trim();
      if (zipcodeFilter.length > 0) allFilters.zip_code = zipcodeFilter.join(',');
      if (stateFilter.length > 0) allFilters.state = stateFilter.join(',');
      if (advancedFilters.county?.length > 0) allFilters.county = advancedFilters.county.join(',');
      if (advancedFilters.city?.length > 0) allFilters.city = advancedFilters.city.join(',');
      if (advancedFilters.timezone?.length > 0) allFilters.timezone = advancedFilters.timezone.join(',');
      
      console.log('🔍 Timezone filters being saved:', advancedFilters.timezone);
      console.log('🔍 All filters being saved:', allFilters);
      if (advancedFilters.mhhi?.length > 0) allFilters.mhhi = advancedFilters.mhhi.join(',');
      if (advancedFilters.avg_hhi?.length > 0) allFilters.avg_hhi = advancedFilters.avg_hhi.join(',');
      if (advancedFilters.median_age?.length > 0) allFilters.median_age = advancedFilters.median_age.join(',');
      if (advancedFilters.households?.length > 0) allFilters.households = advancedFilters.households.join(',');
      if (advancedFilters.race_ethnicity_white?.length > 0) allFilters.race_ethnicity_white = advancedFilters.race_ethnicity_white.join(',');
      if (advancedFilters.race_ethnicity_black?.length > 0) allFilters.race_ethnicity_black = advancedFilters.race_ethnicity_black.join(',');
      if (advancedFilters.race_ethnicity_hispanic?.length > 0) allFilters.race_ethnicity_hispanic = advancedFilters.race_ethnicity_hispanic.join(',');
      
      // Advanced filters - only include if they have values
      if (advancedFilters.mhhi_min?.trim()) allFilters.mhhi_min = advancedFilters.mhhi_min.trim();
      if (advancedFilters.mhhi_max?.trim()) allFilters.mhhi_max = advancedFilters.mhhi_max.trim();
      if (advancedFilters.avg_hhi_min?.trim()) allFilters.avg_hhi_min = advancedFilters.avg_hhi_min.trim();
      if (advancedFilters.avg_hhi_max?.trim()) allFilters.avg_hhi_max = advancedFilters.avg_hhi_max.trim();
      if (advancedFilters.pc_income_min?.trim()) allFilters.pc_income_min = advancedFilters.pc_income_min.trim();
      if (advancedFilters.pc_income_max?.trim()) allFilters.pc_income_max = advancedFilters.pc_income_max.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_min?.trim()) allFilters.pct_hh_w_income_200k_plus_min = advancedFilters.pct_hh_w_income_200k_plus_min.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_max?.trim()) allFilters.pct_hh_w_income_200k_plus_max = advancedFilters.pct_hh_w_income_200k_plus_max.trim();
      if (advancedFilters.median_age_min?.trim()) allFilters.median_age_min = advancedFilters.median_age_min.trim();
      if (advancedFilters.median_age_max?.trim()) allFilters.median_age_max = advancedFilters.median_age_max.trim();
      if (advancedFilters.pop_dens_sq_mi_min?.trim()) allFilters.pop_dens_sq_mi_min = advancedFilters.pop_dens_sq_mi_min.trim();
      if (advancedFilters.pop_dens_sq_mi_max?.trim()) allFilters.pop_dens_sq_mi_max = advancedFilters.pop_dens_sq_mi_max.trim();
      if (advancedFilters.race_ethnicity_white_min?.trim()) allFilters.race_ethnicity_white_min = advancedFilters.race_ethnicity_white_min.trim();
      if (advancedFilters.race_ethnicity_white_max?.trim()) allFilters.race_ethnicity_white_max = advancedFilters.race_ethnicity_white_max.trim();
      if (advancedFilters.race_ethnicity_black_min?.trim()) allFilters.race_ethnicity_black_min = advancedFilters.race_ethnicity_black_min.trim();
      if (advancedFilters.race_ethnicity_black_max?.trim()) allFilters.race_ethnicity_black_max = advancedFilters.race_ethnicity_black_max.trim();
      if (advancedFilters.race_ethnicity_hispanic_min?.trim()) allFilters.race_ethnicity_hispanic_min = advancedFilters.race_ethnicity_hispanic_min.trim();
      if (advancedFilters.race_ethnicity_hispanic_max?.trim()) allFilters.race_ethnicity_hispanic_max = advancedFilters.race_ethnicity_hispanic_max.trim();
      if (advancedFilters.households_min?.trim()) allFilters.households_min = advancedFilters.households_min.trim();
      if (advancedFilters.households_max?.trim()) allFilters.households_max = advancedFilters.households_max.trim();
      if (advancedFilters.family_hh_total_min?.trim()) allFilters.family_hh_total_min = advancedFilters.family_hh_total_min.trim();
      if (advancedFilters.family_hh_total_max?.trim()) allFilters.family_hh_total_max = advancedFilters.family_hh_total_max.trim();
      if (advancedFilters.edu_att_bachelors_min?.trim()) allFilters.edu_att_bachelors_min = advancedFilters.edu_att_bachelors_min.trim();
      if (advancedFilters.edu_att_bachelors_max?.trim()) allFilters.edu_att_bachelors_max = advancedFilters.edu_att_bachelors_max.trim();
      if (advancedFilters.unemployment_pct_min?.trim()) allFilters.unemployment_pct_min = advancedFilters.unemployment_pct_min.trim();
      if (advancedFilters.unemployment_pct_max?.trim()) allFilters.unemployment_pct_max = advancedFilters.unemployment_pct_max.trim();
      if (advancedFilters.housing_units_min?.trim()) allFilters.housing_units_min = advancedFilters.housing_units_min.trim();
      if (advancedFilters.housing_units_max?.trim()) allFilters.housing_units_max = advancedFilters.housing_units_max.trim();
      if (advancedFilters.owner_occupied_min?.trim()) allFilters.owner_occupied_min = advancedFilters.owner_occupied_min.trim();
      if (advancedFilters.owner_occupied_max?.trim()) allFilters.owner_occupied_max = advancedFilters.owner_occupied_max.trim();
      
      // Sorting preferences - always include
      allFilters.sortBy = sortBy;
      allFilters.sortOrder = sortOrder === 'ascend' ? 'ASC' : 'DESC';

      // Call the actual save filter API
      const response = await apiClient.post('/filters', {
        name: filterName,
        filter_type: 'demographic',
        filter_config: allFilters
      });

      if (response.data.success) {
        message.success('Filter and sorting preferences saved successfully');
        setFilterName('');
        setSaveModalVisible(false);
        
        // Refresh the saved filters list
        await loadSavedFilters();
      } else {
        message.error(response.data.message || 'Failed to save filter');
      }
    } catch (error: any) {
      console.error('Error saving filter:', error);
      message.error(error.response?.data?.message || 'Failed to save filter');
    }
  };

  const handleLoadFilter = (filter: any) => {
    // Load filters
    if (filter.filter_config) {
      const config = filter.filter_config;
      
      // Load basic filters
      setSearchQuery(config.search || '');
      setZipcodeFilter(config.zip_code ? (Array.isArray(config.zip_code) ? config.zip_code : config.zip_code.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : []);
      setStateFilter(config.state ? (Array.isArray(config.state) ? config.state : config.state.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : []);
      
      // Load advanced filters
      setAdvancedFilters({
        county: config.county ? (Array.isArray(config.county) ? config.county : config.county.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        city: config.city ? (Array.isArray(config.city) ? config.city : config.city.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        timezone: config.timezone ? (Array.isArray(config.timezone) ? config.timezone : config.timezone.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        mhhi: config.mhhi ? (Array.isArray(config.mhhi) ? config.mhhi : config.mhhi.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        avg_hhi: config.avg_hhi ? (Array.isArray(config.avg_hhi) ? config.avg_hhi : config.avg_hhi.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        median_age: config.median_age ? (Array.isArray(config.median_age) ? config.median_age : config.median_age.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        households: config.households ? (Array.isArray(config.households) ? config.households : config.households.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        race_ethnicity_white: config.race_ethnicity_white ? (Array.isArray(config.race_ethnicity_white) ? config.race_ethnicity_white : config.race_ethnicity_white.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        race_ethnicity_black: config.race_ethnicity_black ? (Array.isArray(config.race_ethnicity_black) ? config.race_ethnicity_black : config.race_ethnicity_black.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        race_ethnicity_hispanic: config.race_ethnicity_hispanic ? (Array.isArray(config.race_ethnicity_hispanic) ? config.race_ethnicity_hispanic : config.race_ethnicity_hispanic.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        mhhi_min: config.mhhi_min || '',
        mhhi_max: config.mhhi_max || '',
        avg_hhi_min: config.avg_hhi_min || '',
        avg_hhi_max: config.avg_hhi_max || '',
        pc_income_min: config.pc_income_min || '',
        pc_income_max: config.pc_income_max || '',
        pct_hh_w_income_200k_plus_min: config.pct_hh_w_income_200k_plus_min || '',
        pct_hh_w_income_200k_plus_max: config.pct_hh_w_income_200k_plus_max || '',
        median_age_min: config.median_age_min || '',
        median_age_max: config.median_age_max || '',
        pop_dens_sq_mi_min: config.pop_dens_sq_mi_min || '',
        pop_dens_sq_mi_max: config.pop_dens_sq_mi_max || '',
        race_ethnicity_white_min: config.race_ethnicity_white_min || '',
        race_ethnicity_white_max: config.race_ethnicity_white_max || '',
        race_ethnicity_black_min: config.race_ethnicity_black_min || '',
        race_ethnicity_black_max: config.race_ethnicity_black_max || '',
        race_ethnicity_hispanic_min: config.race_ethnicity_hispanic_min || '',
        race_ethnicity_hispanic_max: config.race_ethnicity_hispanic_max || '',
        households_min: config.households_min || '',
        households_max: config.households_max || '',
        family_hh_total_min: config.family_hh_total_min || '',
        family_hh_total_max: config.family_hh_total_max || '',
        edu_att_bachelors_min: config.edu_att_bachelors_min || '',
        edu_att_bachelors_max: config.edu_att_bachelors_max || '',
        unemployment_pct_min: config.unemployment_pct_min || '',
        unemployment_pct_max: config.unemployment_pct_max || '',
        housing_units_min: config.housing_units_min || '',
        housing_units_max: config.housing_units_max || '',
        owner_occupied_min: config.owner_occupied_min || '',
        owner_occupied_max: config.owner_occupied_max || ''
      });
      
      // Load sorting preferences
      if (config.sortBy) setSortBy(config.sortBy);
      if (config.sortOrder) setSortOrder(config.sortOrder === 'ASC' ? 'ascend' : 'descend');
      
      message.success(`Loaded filter: ${filter.name}`);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'ascend' ? 'descend' : 'ascend');
    } else {
      // Set new field with default descending order
      setSortBy(field);
      setSortOrder('descend');
    }
  };



  const formatNumberString = (value: string) => {
    if (!value || value === '-$1' || value === '') return '-';
    return parseInt(value).toLocaleString();
  };

  const formatCurrency = (value: number | string) => {
    if (value == null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const formatNumber = (value: number | string) => {
    if (value == null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US').format(numValue);
  };

  // Helper function to determine if daylight saving time is currently in effect
  const isDaylightSavingTime = (date: Date) => {
    const year = date.getFullYear();
    
    // DST starts on the second Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const firstSundayMarch = new Date(year, 2, 1 + (7 - march.getDay()) % 7);
    const dstStart = new Date(year, 2, firstSundayMarch.getDate() + 7);
    
    // DST ends on the first Sunday in November
    const november = new Date(year, 10, 1); // November 1st
    const dstEnd = new Date(year, 10, 1 + (7 - november.getDay()) % 7);
    
    return date >= dstStart && date < dstEnd;
  };



  // Handle bulk actions on selected rows
  const handleBulkExport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select rows to export');
      return;
    }
    
    const selectedRecords = records.filter(record => selectedRowKeys.includes(record.id));
    exportToCSV(selectedRecords, 'selected_demographic_records.csv');
    message.success(`Exported ${selectedRecords.length} selected records`);
  };

  const handleBulkAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select rows first');
      return;
    }
    
    switch (action) {
      case 'export':
        handleBulkExport();
        break;
      case 'createFilter':
        handleSaveFilterFromSelected();
        break;
      case 'saveCurrentFilters':
        handleSaveCurrentTableFilters();
        break;
      case 'generatePhoneNumbers':
        handleGeneratePhoneNumbers();
        break;
      default:
        message.info(`Action "${action}" not implemented yet`);
    }
  };

  const handleGeneratePhoneNumbers = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select records to generate phone numbers');
      return;
    }

    try {
      // Extract unique zipcodes from selected records
      const selectedRecords = records.filter(record => selectedRowKeys.includes(record.id));
      const zipcodes = Array.from(new Set(selectedRecords.map(record => record.zip_code)));
      
      if (zipcodes.length === 0) {
        message.error('No valid zipcodes found in selected records');
        return;
      }

      // Navigate to Comprehensive Dashboard with the zipcodes
      const params = new URLSearchParams({
        zipcodes: zipcodes.join(',')
      });
      
      window.location.href = `/dashboard?${params.toString()}`;
    } catch (error) {
      console.error('Error generating phone numbers:', error);
      message.error('Failed to generate phone numbers');
    }
  };

  const handleSaveFilterFromSelected = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select records to create a filter');
      return;
    }

    try {
      const selectedRecords = records.filter(record => selectedRowKeys.includes(record.id));
      const zipcodes = Array.from(new Set(selectedRecords.map(record => record.zip_code)));
      const timezones = Array.from(new Set(selectedRecords.map(record => record.timezone_id).filter(Boolean)));
      
      if (zipcodes.length === 0) {
        message.error('No valid zipcodes found in selected records');
        return;
      }

      // Create a filter configuration based on selected records AND current filters
      const filterConfig: any = {
        zip_code: zipcodes.join(','),
        sortBy: sortBy,
        sortOrder: sortOrder === 'ascend' ? 'ASC' : 'DESC'
      };

      // Add timezones from selected records
      if (timezones.length > 0) {
        filterConfig.timezone = timezones.join(',');
      }

      // Add current filters if they have values
      if (searchQuery.trim()) filterConfig.search = searchQuery.trim();
      if (stateFilter.length > 0) filterConfig.state = stateFilter.join(',');
      if (advancedFilters.county?.length > 0) filterConfig.county = advancedFilters.county.join(',');
      if (advancedFilters.city?.length > 0) filterConfig.city = advancedFilters.city.join(',');
      if (advancedFilters.timezone?.length > 0) filterConfig.timezone = advancedFilters.timezone.join(',');
      if (advancedFilters.mhhi?.length > 0) filterConfig.mhhi = advancedFilters.mhhi.join(',');
      if (advancedFilters.avg_hhi?.length > 0) filterConfig.avg_hhi = advancedFilters.avg_hhi.join(',');
      if (advancedFilters.median_age?.length > 0) filterConfig.median_age = advancedFilters.median_age.join(',');
      if (advancedFilters.households?.length > 0) filterConfig.households = advancedFilters.households.join(',');
      if (advancedFilters.race_ethnicity_white?.length > 0) filterConfig.race_ethnicity_white = advancedFilters.race_ethnicity_white.join(',');
      if (advancedFilters.race_ethnicity_black?.length > 0) filterConfig.race_ethnicity_black = advancedFilters.race_ethnicity_black.join(',');
      if (advancedFilters.race_ethnicity_hispanic?.length > 0) filterConfig.race_ethnicity_hispanic = advancedFilters.race_ethnicity_hispanic.join(',');

      // Add range filters
      if (advancedFilters.mhhi_min?.trim()) filterConfig.mhhi_min = advancedFilters.mhhi_min.trim();
      if (advancedFilters.mhhi_max?.trim()) filterConfig.mhhi_max = advancedFilters.mhhi_max.trim();
      if (advancedFilters.avg_hhi_min?.trim()) filterConfig.avg_hhi_min = advancedFilters.avg_hhi_min.trim();
      if (advancedFilters.avg_hhi_max?.trim()) filterConfig.avg_hhi_max = advancedFilters.avg_hhi_max.trim();
      if (advancedFilters.pc_income_min?.trim()) filterConfig.pc_income_min = advancedFilters.pc_income_min.trim();
      if (advancedFilters.pc_income_max?.trim()) filterConfig.pc_income_max = advancedFilters.pc_income_max.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_min?.trim()) filterConfig.pct_hh_w_income_200k_plus_min = advancedFilters.pct_hh_w_income_200k_plus_min.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_max?.trim()) filterConfig.pct_hh_w_income_200k_plus_max = advancedFilters.pct_hh_w_income_200k_plus_max.trim();
      if (advancedFilters.median_age_min?.trim()) filterConfig.median_age_min = advancedFilters.median_age_min.trim();
      if (advancedFilters.median_age_max?.trim()) filterConfig.median_age_max = advancedFilters.median_age_max.trim();
      if (advancedFilters.pop_dens_sq_mi_min?.trim()) filterConfig.pop_dens_sq_mi_min = advancedFilters.pop_dens_sq_mi_min.trim();
      if (advancedFilters.pop_dens_sq_mi_max?.trim()) filterConfig.pop_dens_sq_mi_max = advancedFilters.pop_dens_sq_mi_max.trim();
      if (advancedFilters.race_ethnicity_white_min?.trim()) filterConfig.race_ethnicity_white_min = advancedFilters.race_ethnicity_white_min.trim();
      if (advancedFilters.race_ethnicity_white_max?.trim()) filterConfig.race_ethnicity_white_max = advancedFilters.race_ethnicity_white_max.trim();
      if (advancedFilters.race_ethnicity_black_min?.trim()) filterConfig.race_ethnicity_black_min = advancedFilters.race_ethnicity_black_min.trim();
      if (advancedFilters.race_ethnicity_black_max?.trim()) filterConfig.race_ethnicity_black_max = advancedFilters.race_ethnicity_black_max.trim();
      if (advancedFilters.race_ethnicity_hispanic_min?.trim()) filterConfig.race_ethnicity_hispanic_min = advancedFilters.race_ethnicity_hispanic_min.trim();
      if (advancedFilters.race_ethnicity_hispanic_max?.trim()) filterConfig.race_ethnicity_hispanic_max = advancedFilters.race_ethnicity_hispanic_max.trim();
      if (advancedFilters.households_min?.trim()) filterConfig.households_min = advancedFilters.households_min.trim();
      if (advancedFilters.households_max?.trim()) filterConfig.households_max = advancedFilters.households_max.trim();
      if (advancedFilters.family_hh_total_min?.trim()) filterConfig.family_hh_total_min = advancedFilters.family_hh_total_min.trim();
      if (advancedFilters.family_hh_total_max?.trim()) filterConfig.family_hh_total_max = advancedFilters.family_hh_total_max.trim();
      if (advancedFilters.edu_att_bachelors_min?.trim()) filterConfig.edu_att_bachelors_min = advancedFilters.edu_att_bachelors_min.trim();
      if (advancedFilters.edu_att_bachelors_max?.trim()) filterConfig.edu_att_bachelors_max = advancedFilters.edu_att_bachelors_max.trim();
      if (advancedFilters.unemployment_pct_min?.trim()) filterConfig.unemployment_pct_min = advancedFilters.unemployment_pct_min.trim();
      if (advancedFilters.unemployment_pct_max?.trim()) filterConfig.unemployment_pct_max = advancedFilters.unemployment_pct_max.trim();
      if (advancedFilters.housing_units_min?.trim()) filterConfig.housing_units_min = advancedFilters.housing_units_min.trim();
      if (advancedFilters.housing_units_max?.trim()) filterConfig.housing_units_max = advancedFilters.housing_units_max.trim();
      if (advancedFilters.owner_occupied_min?.trim()) filterConfig.owner_occupied_min = advancedFilters.owner_occupied_min.trim();
      if (advancedFilters.owner_occupied_max?.trim()) filterConfig.owner_occupied_max = advancedFilters.owner_occupied_max.trim();

      console.log('🔍 Saving filter config with selected zipcodes and current filters:', filterConfig);
      console.log('🔍 Current advancedFilters state:', advancedFilters);
      console.log('🔍 Timezone filters in advancedFilters:', advancedFilters.timezone);

      // Prompt user for filter name
      const filterName = prompt(`Enter a name for this filter (${zipcodes.length} zipcodes, ${timezones.length} timezones + current filters):`);
      if (!filterName || !filterName.trim()) {
        message.info('Filter creation cancelled');
        return;
      }

      // Save the filter
      const response = await apiClient.post('/filters', {
        name: filterName.trim(),
        filter_type: 'demographic',
        filter_config: filterConfig
      });

      if (response.data.success) {
        message.success(`Filter "${filterName}" saved successfully with ${zipcodes.length} zipcodes, ${timezones.length} timezones and current filters`);
        await loadSavedFilters(); // Refresh the saved filters list
      } else {
        message.error(response.data.message || 'Failed to save filter');
      }
    } catch (error) {
      console.error('Error saving filter from selected records:', error);
      message.error('Failed to save filter');
    }
  };

  // Save current table filters
  const handleSaveCurrentTableFilters = async () => {
    console.log('🔍 handleSaveCurrentTableFilters called');
    console.log('🔍 Current advancedFilters:', advancedFilters);
    console.log('🔍 Current timezone filters:', advancedFilters.timezone);
    
    try {
      // Create a filter configuration based on current table filters
      const filterConfig: any = {
        sortBy: sortBy,
        sortOrder: sortOrder === 'ascend' ? 'ASC' : 'DESC'
      };

      // Add current filters if they have values
      if (zipcodeFilter.length > 0) {
        filterConfig.zip_code = zipcodeFilter.join(',');
      }
      if (stateFilter.length > 0) {
        filterConfig.state = stateFilter.join(',');
      }
      if (advancedFilters.county?.length > 0) {
        filterConfig.county = advancedFilters.county.join(',');
      }
      if (advancedFilters.city?.length > 0) {
        filterConfig.city = advancedFilters.city.join(',');
      }
      if (advancedFilters.timezone?.length > 0) {
        filterConfig.timezone = advancedFilters.timezone.join(',');
      }
      if (advancedFilters.mhhi?.length > 0) {
        filterConfig.mhhi = advancedFilters.mhhi.join(',');
      }
      if (advancedFilters.avg_hhi?.length > 0) {
        filterConfig.avg_hhi = advancedFilters.avg_hhi.join(',');
      }
      if (advancedFilters.median_age?.length > 0) {
        filterConfig.median_age = advancedFilters.median_age.join(',');
      }
      if (advancedFilters.households?.length > 0) {
        filterConfig.households = advancedFilters.households.join(',');
      }
      if (advancedFilters.race_ethnicity_white?.length > 0) {
        filterConfig.race_ethnicity_white = advancedFilters.race_ethnicity_white.join(',');
      }
      if (advancedFilters.race_ethnicity_black?.length > 0) {
        filterConfig.race_ethnicity_black = advancedFilters.race_ethnicity_black.join(',');
      }
      if (advancedFilters.race_ethnicity_hispanic?.length > 0) {
        filterConfig.race_ethnicity_hispanic = advancedFilters.race_ethnicity_hispanic.join(',');
      }

      // Add range filters
      if (advancedFilters.mhhi_min?.trim()) filterConfig.mhhi_min = advancedFilters.mhhi_min.trim();
      if (advancedFilters.mhhi_max?.trim()) filterConfig.mhhi_max = advancedFilters.mhhi_max.trim();
      if (advancedFilters.avg_hhi_min?.trim()) filterConfig.avg_hhi_min = advancedFilters.avg_hhi_min.trim();
      if (advancedFilters.avg_hhi_max?.trim()) filterConfig.avg_hhi_max = advancedFilters.avg_hhi_max.trim();
      if (advancedFilters.pc_income_min?.trim()) filterConfig.pc_income_min = advancedFilters.pc_income_min.trim();
      if (advancedFilters.pc_income_max?.trim()) filterConfig.pc_income_max = advancedFilters.pc_income_max.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_min?.trim()) filterConfig.pct_hh_w_income_200k_plus_min = advancedFilters.pct_hh_w_income_200k_plus_min.trim();
      if (advancedFilters.pct_hh_w_income_200k_plus_max?.trim()) filterConfig.pct_hh_w_income_200k_plus_max = advancedFilters.pct_hh_w_income_200k_plus_max.trim();
      if (advancedFilters.median_age_min?.trim()) filterConfig.median_age_min = advancedFilters.median_age_min.trim();
      if (advancedFilters.median_age_max?.trim()) filterConfig.median_age_max = advancedFilters.median_age_max.trim();
      if (advancedFilters.pop_dens_sq_mi_min?.trim()) filterConfig.pop_dens_sq_mi_min = advancedFilters.pop_dens_sq_mi_min.trim();
      if (advancedFilters.pop_dens_sq_mi_max?.trim()) filterConfig.pop_dens_sq_mi_max = advancedFilters.pop_dens_sq_mi_max.trim();
      if (advancedFilters.race_ethnicity_white_min?.trim()) filterConfig.race_ethnicity_white_min = advancedFilters.race_ethnicity_white_min.trim();
      if (advancedFilters.race_ethnicity_white_max?.trim()) filterConfig.race_ethnicity_white_max = advancedFilters.race_ethnicity_white_max.trim();
      if (advancedFilters.race_ethnicity_black_min?.trim()) filterConfig.race_ethnicity_black_min = advancedFilters.race_ethnicity_black_min.trim();
      if (advancedFilters.race_ethnicity_black_max?.trim()) filterConfig.race_ethnicity_black_max = advancedFilters.race_ethnicity_black_max.trim();
      if (advancedFilters.race_ethnicity_hispanic_min?.trim()) filterConfig.race_ethnicity_hispanic_min = advancedFilters.race_ethnicity_hispanic_min.trim();
      if (advancedFilters.race_ethnicity_hispanic_max?.trim()) filterConfig.race_ethnicity_hispanic_max = advancedFilters.race_ethnicity_hispanic_max.trim();
      if (advancedFilters.households_min?.trim()) filterConfig.households_min = advancedFilters.households_min.trim();
      if (advancedFilters.households_max?.trim()) filterConfig.households_max = advancedFilters.households_max.trim();
      if (advancedFilters.family_hh_total_min?.trim()) filterConfig.family_hh_total_min = advancedFilters.family_hh_total_min.trim();
      if (advancedFilters.family_hh_total_max?.trim()) filterConfig.family_hh_total_max = advancedFilters.family_hh_total_max.trim();
      if (advancedFilters.edu_att_bachelors_min?.trim()) filterConfig.edu_att_bachelors_min = advancedFilters.edu_att_bachelors_min.trim();
      if (advancedFilters.edu_att_bachelors_max?.trim()) filterConfig.edu_att_bachelors_max = advancedFilters.edu_att_bachelors_max.trim();
      if (advancedFilters.unemployment_pct_min?.trim()) filterConfig.unemployment_pct_min = advancedFilters.unemployment_pct_min.trim();
      if (advancedFilters.unemployment_pct_max?.trim()) filterConfig.unemployment_pct_max = advancedFilters.unemployment_pct_max.trim();
      if (advancedFilters.housing_units_min?.trim()) filterConfig.housing_units_min = advancedFilters.housing_units_min.trim();
      if (advancedFilters.housing_units_max?.trim()) filterConfig.housing_units_max = advancedFilters.housing_units_max.trim();
      if (advancedFilters.owner_occupied_min?.trim()) filterConfig.owner_occupied_min = advancedFilters.owner_occupied_min.trim();
      if (advancedFilters.owner_occupied_max?.trim()) filterConfig.owner_occupied_max = advancedFilters.owner_occupied_max.trim();

      // Check if there are any active filters
      const hasFilters = Object.keys(filterConfig).length > 2; // More than just sortBy and sortOrder
      
      if (!hasFilters) {
        message.warning('No active filters to save. Please apply some filters first.');
        return;
      }

      // Prompt user for filter name
      const filterName = prompt('Enter a name for this filter:');
      if (!filterName || !filterName.trim()) {
        message.info('Filter creation cancelled');
        return;
      }

      // Save the filter
      const response = await apiClient.post('/filters', {
        name: filterName.trim(),
        filter_type: 'demographic',
        filter_config: filterConfig
      });

      if (response.data.success) {
        message.success(`Filter "${filterName}" saved successfully`);
        await loadSavedFilters(); // Refresh the saved filters list
      } else {
        message.error(response.data.message || 'Failed to save filter');
      }
    } catch (error) {
      console.error('Error saving current table filters:', error);
      message.error('Failed to save filter');
    }
  };

  // Apply table filters server-side
  const applyTableFilters = (filters: any) => {
    console.log('🔍 Applying table filters:', filters);
    console.log('🔍 Timezone filters in incoming filters:', filters.timezone);
    
    // Convert Ant Design filters to our filter format
    const newZipcodeFilter: string[] = [];
    const newStateFilter: string[] = [];
    const newCountyFilter: string[] = [];
    const newCityFilter: string[] = [];
    const newTimezoneFilter: string[] = [];
    const newMhhiFilter: string[] = [];
    const newAvgHhiFilter: string[] = [];
    const newMedianAgeFilter: string[] = [];
    const newHouseholdsFilter: string[] = [];
    const newRaceWhiteFilter: string[] = [];
    const newRaceBlackFilter: string[] = [];
    const newRaceHispanicFilter: string[] = [];

    if (filters.zip_code) {
      newZipcodeFilter.push(...filters.zip_code);
    }
    if (filters.state) {
      newStateFilter.push(...filters.state);
    }
    if (filters.county) {
      newCountyFilter.push(...filters.county);
    }
    if (filters.city) {
      newCityFilter.push(...filters.city);
    }
    if (filters.timezone) {
      newTimezoneFilter.push(...filters.timezone);
    }
    if (filters.mhhi) {
      newMhhiFilter.push(...filters.mhhi);
    }
    if (filters.avg_hhi) {
      newAvgHhiFilter.push(...filters.avg_hhi);
    }
    if (filters.median_age) {
      newMedianAgeFilter.push(...filters.median_age);
    }
    if (filters.households) {
      newHouseholdsFilter.push(...filters.households);
    }
    if (filters.race_ethnicity_white) {
      newRaceWhiteFilter.push(...filters.race_ethnicity_white);
    }
    if (filters.race_ethnicity_black) {
      newRaceBlackFilter.push(...filters.race_ethnicity_black);
    }
    if (filters.race_ethnicity_hispanic) {
      newRaceHispanicFilter.push(...filters.race_ethnicity_hispanic);
    }

    // Update state with new filters
    setZipcodeFilter(newZipcodeFilter);
    setStateFilter(newStateFilter);
    
    // Update advanced filters for all columns
    setAdvancedFilters(prev => ({
      ...prev,
      county: newCountyFilter,
      city: newCityFilter,
      timezone: newTimezoneFilter,
      mhhi: newMhhiFilter,
      avg_hhi: newAvgHhiFilter,
      median_age: newMedianAgeFilter,
      households: newHouseholdsFilter,
      race_ethnicity_white: newRaceWhiteFilter,
      race_ethnicity_black: newRaceBlackFilter,
      race_ethnicity_hispanic: newRaceHispanicFilter
    }));

    console.log('🔍 Applied filters - Zipcodes:', newZipcodeFilter, 'States:', newStateFilter, 'Counties:', newCountyFilter, 'Cities:', newCityFilter, 'Timezones:', newTimezoneFilter);
    console.log('🔍 Applied numeric filters - MHHI:', newMhhiFilter, 'Avg HHI:', newAvgHhiFilter, 'Age:', newMedianAgeFilter, 'Households:', newHouseholdsFilter);
  };

  // Export function
  const exportToCSV = (data: DemographicRecord[], filename: string) => {
    const headers = [
      'Zipcode', 'State', 'County', 'City', 'Timezone', 'Median HHI', 'Avg HHI', 'Per Capita Income',
      'Age', 'Households', 'White %', 'Black %', 'Hispanic %'
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(record => [
        record.zip_code,
        record.state,
        record.county,
        record.city,
        record.timezone_display_name || record.timezone_name,
        record.mhhi,
        record.avg_hhi,
        record.pc_income,
        record.median_age,
        record.households,
        record.race_ethnicity_white,
        record.race_ethnicity_black,
        record.race_ethnicity_hispanic
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <Card className={`${isDarkMode ? 'dark' : 'light'}`}>
        <div className="text-center">
          <p className="text-lg">Please log in to view demographic records.</p>
        </div>
      </Card>
    );
  }

  return (
    <Layout style={{ background: 'transparent', height: '100%' }}>
      {/* Compact Filters Section - Left Side - COMMENTED OUT FOR EXCEL-LIKE EXPERIENCE */}
      {false && sidebarVisible && (
        <Layout.Sider 
          width={350} 
          style={{ 
            background: 'transparent',
            paddingRight: '16px',
            transition: 'all 0.3s ease'
          }}
        >
          <Card 
            title={
              <Space>
                <FilterOutlined />
                <span>Filters</span>
                <Badge count={Object.keys(advancedFilters).length} showZero />
              </Space>
            }
            size="small"
            className={`${isDarkMode ? 'dark' : 'light'}`}
            extra={
              <Space>
                <Tooltip title="Toggle Filters">
                  <Button
                    size="small"
                    icon={<FilterOutlined />}
                    onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                  />
                </Tooltip>
                <Tooltip title="Refresh">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={fetchRecords}
                    loading={loading}
                  />
                </Tooltip>
              </Space>
            }
          >
            {!filtersCollapsed && (
              <>
                {/* Quick Search Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={16}>
                    <input
                      type="text"
                      placeholder="🔍 Search zipcode, state, county, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full px-2 py-1 text-sm border rounded ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </Col>
                  <Col span={8}>
                    <div className="relative">
                      <Select
                        mode="multiple"
                        placeholder="📮 Zipcode (type 3+ digits)"
                        value={zipcodeFilter}
                        onChange={setZipcodeFilter}
                        onSearch={(query) => {
                          console.log('🔍 Zipcode Select onSearch triggered with:', query);
                          fetchZipcodeOptions(query);
                        }}
                        onFocus={() => {
                          console.log('🔍 Zipcode Select onFocus triggered');
                          if (zipcodeOptions.length === 0) {
                            fetchZipcodeOptions('');
                          }
                        }}
                        loading={loadingZipcodes}
                        showSearch
                        filterOption={false}
                        notFoundContent={loadingZipcodes ? 'Loading...' : 'No zipcodes found'}
                        className="w-full"
                        size="small"
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                        dropdownStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                      >
                        {zipcodeOptions.map((zipcode) => (
                          <Select.Option key={zipcode} value={zipcode}>
                            📮 {zipcode}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                </Row>

                {/* Basic Filters Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={8}>
                    <div className="relative">
                      <Select
                        mode="multiple"
                        placeholder="🌍 Select States"
                        value={stateFilter}
                        onChange={setStateFilter}
                        onSearch={(query) => {
                          console.log('🔍 State Select onSearch triggered with:', query);
                          fetchStateOptions(query);
                        }}
                        onFocus={() => {
                          console.log('🔍 State Select onFocus triggered');
                          if (stateOptions.length === 0) {
                            fetchStateOptions('');
                          }
                        }}
                        loading={loadingStates}
                        showSearch
                        filterOption={false}
                        notFoundContent={loadingStates ? 'Loading...' : 'No states found'}
                        className="w-full"
                        size="small"
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                        dropdownStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                      >
                        {stateOptions.map((state) => (
                          <Select.Option key={state} value={state}>
                            🌍 {state}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="relative">
                      <Select
                        mode="multiple"
                        placeholder="🏛️ County (type 2+ chars)"
                        value={advancedFilters.county}
                        onChange={(values) => setAdvancedFilters(prev => ({ ...prev, county: values }))}
                        onSearch={(query) => {
                          console.log('🔍 County Select onSearch triggered with:', query);
                          fetchCountyOptions(query);
                        }}
                        onFocus={() => {
                          console.log('🔍 County Select onFocus triggered');
                          if (advancedFilters.county.length === 0) {
                            fetchCountyOptions('');
                          }
                        }}
                        loading={loadingCounties}
                        showSearch
                        filterOption={false}
                        notFoundContent={loadingCounties ? 'Loading...' : 'No counties found'}
                        className="w-full"
                        size="small"
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                        dropdownStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                      >
                        {countyOptions.map((county) => (
                          <Select.Option key={county} value={county}>
                            🏛️ {county}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="relative">
                      <Select
                        mode="multiple"
                        placeholder="🏙️ City (type 2+ chars)"
                        value={advancedFilters.city}
                        onChange={(values) => setAdvancedFilters(prev => ({ ...prev, city: values }))}
                        onSearch={(query) => {
                          console.log('🔍 City Select onSearch triggered with:', query);
                          fetchCityOptions(query);
                        }}
                        onFocus={() => {
                          console.log('🔍 City Select onFocus triggered');
                          if (advancedFilters.city.length === 0) {
                            fetchCityOptions('');
                          }
                        }}
                        loading={loadingCities}
                        showSearch
                        filterOption={false}
                        notFoundContent={loadingCities ? 'Loading...' : 'No cities found'}
                        className="w-full"
                        size="small"
                        style={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                        dropdownStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                          color: isDarkMode ? '#ffffff' : '#000000'
                        }}
                      >
                        {cityOptions.map((city) => (
                          <Select.Option key={city} value={city}>
                            🏙️ {city}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                </Row>

                {/* Selected Values Display */}
                {(zipcodeFilter.length > 0 || stateFilter.length > 0 || advancedFilters.county.length > 0 || advancedFilters.city.length > 0) && (
                  <Row gutter={8} style={{ marginBottom: '12px' }}>
                    <Col span={24}>
                      <div className={`p-2 rounded text-xs ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <div className="font-medium mb-1">Filter Summary:</div>
                        
                        {/* Summary counts */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {zipcodeFilter.length > 0 && (
                            <span className="text-blue-600">📮 {zipcodeFilter.length} zipcode{zipcodeFilter.length !== 1 ? 's' : ''}</span>
                          )}
                          {stateFilter.length > 0 && (
                            <span className="text-green-600">🌍 {stateFilter.length} state{stateFilter.length !== 1 ? 's' : ''}</span>
                          )}
                          {advancedFilters.county.length > 0 && (
                            <span className="text-purple-600">🏛️ {advancedFilters.county.length} count{advancedFilters.county.length !== 1 ? 'ies' : 'y'}</span>
                          )}
                          {advancedFilters.city.length > 0 && (
                            <span className="text-orange-600">🏙️ {advancedFilters.city.length} cit{advancedFilters.city.length !== 1 ? 'ies' : 'y'}</span>
                          )}
                        </div>
                        
                        {/* Quick clear buttons */}
                        <div className="mt-2 flex gap-1">
                          {zipcodeFilter.length > 0 && (
                            <Button 
                              size="small" 
                              type="text" 
                              onClick={() => setZipcodeFilter([])}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 h-6"
                            >
                              Clear Zipcodes
                            </Button>
                          )}
                          {stateFilter.length > 0 && (
                            <Button 
                              size="small" 
                              type="text" 
                              onClick={() => setStateFilter([])}
                              className="text-green-600 hover:text-green-800 text-xs px-2 py-1 h-6"
                            >
                              Clear States
                            </Button>
                          )}
                          {advancedFilters.county.length > 0 && (
                            <Button 
                              size="small" 
                              type="text" 
                              onClick={() => setAdvancedFilters(prev => ({ ...prev, county: [] }))}
                              className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 h-6"
                            >
                              Clear Counties
                            </Button>
                          )}
                          {advancedFilters.city.length > 0 && (
                            <Button 
                              size="small" 
                              type="text" 
                              onClick={() => setAdvancedFilters(prev => ({ ...prev, city: [] }))}
                              className="text-orange-600 hover:text-orange-800 text-xs px-2 py-1 h-6"
                            >
                              Clear Cities
                            </Button>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}



                {/* Income Filters Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">💰 Median HHI</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.mhhi_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, mhhi_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.mhhi_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, mhhi_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">💵 Average HHI</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.avg_hhi_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, avg_hhi_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.avg_hhi_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, avg_hhi_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Per Capita & $200k+ Income Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">👤 Per Capita Income</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.pc_income_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pc_income_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.pc_income_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pc_income_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">💎 $200k+ Income %</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.pct_hh_w_income_200k_plus_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pct_hh_w_income_200k_plus_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.pct_hh_w_income_200k_plus_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pct_hh_w_income_200k_plus_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Demographics Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">👥 Median Age</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.median_age_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, median_age_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.median_age_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, median_age_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">📊 Population Density</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.pop_dens_sq_mi_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pop_dens_sq_mi_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.pop_dens_sq_mi_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, pop_dens_sq_mi_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Race & Population Filters Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">⚪ White Population</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.race_ethnicity_white_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_white_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.race_ethnicity_white_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_white_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">⚫ Black Population</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.race_ethnicity_black_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_black_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.race_ethnicity_black_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_black_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Hispanic Population & Family Households Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🌮 Hispanic Population</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.race_ethnicity_hispanic_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_hispanic_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.race_ethnicity_hispanic_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, race_ethnicity_hispanic_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">👨‍👩‍👧‍👦 Family Households</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.family_hh_total_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, family_hh_total_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.family_hh_total_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, family_hh_total_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Household & Education Filters Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🏠 Total Households</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.households_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, households_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.households_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, households_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🎓 Bachelor's Degree</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.edu_att_bachelors_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, edu_att_bachelors_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.edu_att_bachelors_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, edu_att_bachelors_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Unemployment & Housing Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">📉 Unemployment %</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.unemployment_pct_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, unemployment_pct_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.unemployment_pct_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, unemployment_pct_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🏘️ Total Housing Units</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.housing_units_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, housing_units_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.housing_units_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, housing_units_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Owner Occupied Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🔑 Owner Occupied</div>
                    <Row gutter={4}>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Min"
                          value={advancedFilters.owner_occupied_min || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, owner_occupied_min: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                      <Col span={12}>
                        <input
                          type="number"
                          placeholder="Max"
                          value={advancedFilters.owner_occupied_max || ''}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, owner_occupied_max: e.target.value }))}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col span={12}>
                    {/* Empty space for balance */}
                  </Col>
                </Row>

                {/* Sorting Options Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">📊 Sort By</div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`w-full px-2 py-1 text-sm border rounded ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="created_at">🕒 Created Date</option>
                      <option value="zip_code">📮 Zipcode</option>
                      <option value="state">🌍 State</option>
                      <option value="county">🏛️ County</option>
                      <option value="city">🏙️ City</option>
                      <option value="mhhi">💰 Median HHI</option>
                      <option value="avg_hhi">💵 Average HHI</option>
                      <option value="pc_income">👤 Per Capita Income</option>
                      <option value="median_age">👥 Median Age</option>
                      <option value="households">🏠 Total Households</option>
                      <option value="race_ethnicity_white">⚪ White Population</option>
                      <option value="race_ethnicity_black">⚫ Black Population</option>
                      <option value="race_ethnicity_hispanic">🌮 Hispanic Population</option>
                      <option value="unemployment_pct">📉 Unemp %</option>
                      <option value="housing_units">🏘️ Housing Units</option>
                    </select>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-gray-500 mb-1">🔄 Sort Order</div>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'ascend' | 'descend')}
                      className={`w-full px-2 py-1 text-sm border rounded ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="descend">⬇️ Descending</option>
                      <option value="ascend">⬆️ Ascending</option>
                    </select>
                  </Col>
                </Row>

                {/* Action Buttons Row */}
                <Row gutter={8} style={{ marginBottom: '12px' }}>
                  <Col span={8}>
                    <Button 
                      size="small" 
                      type="primary" 
                      onClick={fetchRecords}
                      style={{ width: '100%' }}
                      icon={<ReloadOutlined />}
                    >
                      Apply
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button 
                      size="small" 
                      onClick={clearAllFilters}
                      style={{ width: '100%' }}
                      danger
                    >
                      Clear All
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button 
                      size="small" 
                      icon={<SaveOutlined />}
                      onClick={() => setSaveModalVisible(true)}
                      style={{ width: '100%' }}
                      disabled={!hasActiveFilters()}
                    >
                      Save
                    </Button>
                  </Col>
                </Row>

                {/* Saved Filters Section */}
                <div style={{ marginBottom: '12px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">💾 Saved Filters</div>
                    <button
                      onClick={loadSavedFilters}
                      disabled={loadingSavedFilters}
                      className="text-xs text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                      title="Refresh saved filters"
                    >
                      {loadingSavedFilters ? '🔄' : '🔄'}
                    </button>
                  </div>
                  {loadingSavedFilters ? (
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                      Loading filters...
                    </div>
                  ) : savedFilters.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {savedFilters.map((filter) => (
                        <div key={filter.id} className="flex items-center gap-1">
                          <Button
                            size="small"
                            icon={<BookFilled />}
                            onClick={() => handleLoadFilter(filter)}
                            style={{ fontSize: '10px', padding: '0 6px' }}
                          >
                            {filter.name}
                          </Button>
                          <button
                            onClick={() => deleteSavedFilter(filter.id)}
                            className="text-xs text-red-500 hover:text-red-600 px-1"
                            title="Delete filter"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      No saved filters yet. Save your first filter above!
                    </div>
                  )}
                </div>

                {/* Filter Summary */}
                {filteredZipcodes.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Text strong className="text-blue-600 dark:text-blue-400">
                      {filteredZipcodes.length} zipcodes match current filters
                    </Text>
                  </div>
                )}
              </>
            )}
          </Card>
        </Layout.Sider>
      )}

      {/* Main Content - Right Side */}
      <Layout.Content style={{ 
        padding: '16px',
        background: 'transparent',
        width: '100%',
        maxWidth: '100%'
      }}>
        {/* Header Stats */}
        <Card size="small" className={`${isDarkMode ? 'dark' : 'light'} mb-4`}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
              <Title level={4} style={{ margin: 0 }}>
                  📊 Demographic Records
              </Title>
                <Badge count={records.length} showZero style={{ backgroundColor: '#52c41a' }}>
                  <Tag color="green">
                    {records.length} Records
                  </Tag>
                </Badge>
              </Space>
            </Col>
            <Col>
              <Space>
                <Badge count={filteredZipcodes.length} showZero>
                  <Tag color="blue">
                    {filteredZipcodes.length} Zipcodes
                  </Tag>
                </Badge>
                <Button size="small" icon={<DownloadOutlined />}>
                  Export All
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchRecords}
                  loading={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* New Excel-like Table Header with Bulk Actions */}
        <Card 
          title={
            <Space>
              <span>Demographic Records</span>
              {selectedRowKeys.length > 0 && (
                <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#52c41a' }}>
                  <Tag color="green">Selected</Tag>
                </Badge>
              )}
            </Space>
          }
          size="small"
          className={`${isDarkMode ? 'dark' : 'light'}`}
          extra={
                <Space>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    onClick={() => handleBulkAction('generatePhoneNumbers')}
                    size="small"
                  >
                    Generate Phone Numbers ({selectedRowKeys.length})
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleBulkAction('export')}
                    size="small"
                  >
                    Export Selected ({selectedRowKeys.length})
                  </Button>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => handleBulkAction('createFilter')}
                    size="small"
                  >
                    Save Filter from Selected
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveCurrentTableFilters}
                    size="small"
                  >
                    Save Current Filters
                  </Button>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => {
                      console.log('🔍 Current advancedFilters:', advancedFilters);
                      console.log('🔍 Current timezone filters:', advancedFilters.timezone);
                      console.log('🔍 Current zipcodeFilter:', zipcodeFilter);
                      console.log('🔍 Current stateFilter:', stateFilter);
                      message.info(`Current timezone filters: ${advancedFilters.timezone?.join(', ') || 'None'}`);
                    }}
                    size="small"
                  >
                    Debug Filters
                  </Button>
                </>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchRecords}
                loading={loading}
                size="small"
              >
                Refresh
                  </Button>
                </Space>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              🔍 Use column filters to search and filter data • ✅ Select rows for bulk actions • 📊 Showing {records.length} of {total} records
            </Text>
          </div>
          


          <Table
            dataSource={records}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setCurrentPageSize(size || 20);
              },
              onShowSizeChange: (current, size) => {
                setCurrentPageSize(size);
                setCurrentPage(1);
              },
            }}
            onChange={(pagination, filters, sorter) => {
              console.log('Table change detected:', { pagination, filters, sorter });
              
              // Reset to page 1 when filters change
              if (filters && Object.keys(filters).length > 0) {
                setCurrentPage(1);
              }
              
              // Apply filters server-side
              applyTableFilters(filters);
            }}
            rowKey="id"
            scroll={{ x: 1500, y: 600 }}
            size="small"
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys,
              onChange: (selectedKeys: React.Key[]) => {
                setSelectedRowKeys(selectedKeys);
                console.log('Selected rows changed:', selectedKeys);
              },
              getCheckboxProps: (record: DemographicRecord) => ({
                disabled: false,
                name: record.zip_code,
              }),
            }}
            columns={[
              {
                title: 'Zipcode',
                dataIndex: 'zip_code',
                key: 'zip_code',
                width: 120,
                fixed: 'left',
                sorter: (a: DemographicRecord, b: DemographicRecord) => a.zip_code.localeCompare(b.zip_code),
                render: (text: string) => (
                  <Tag color="blue" style={{ fontWeight: 'bold' }}>
                    {text}
                  </Tag>
                ),
                filters: allZipcodes.map(zipcode => ({
                  text: zipcode,
                  value: zipcode,
                })),
                filteredValue: zipcodeFilter,
                filterSearch: true,
              },
              {
                title: 'State',
                dataIndex: 'state',
                key: 'state',
                width: 100,
                sorter: (a: DemographicRecord, b: DemographicRecord) => a.state.localeCompare(b.state),
                filters: allStates.map(state => ({
                  text: state,
                  value: state,
                })),
                filteredValue: stateFilter,
                filterSearch: true,
              },
              {
                title: 'County',
                dataIndex: 'county',
                key: 'county',
                width: 150,
                sorter: (a: DemographicRecord, b: DemographicRecord) => a.county.localeCompare(b.county),
                filters: allCounties.filter(Boolean).map(county => ({
                  text: county,
                  value: county,
                })),
                filteredValue: advancedFilters.county,
                filterSearch: true,
              },
              {
                title: 'City',
                dataIndex: 'city',
                key: 'city',
                width: 150,
                sorter: (a: DemographicRecord, b: DemographicRecord) => a.city.localeCompare(b.city),
                filters: allCities.filter(Boolean).map(city => ({
                  text: city,
                  value: city,
                })),
                filteredValue: advancedFilters.city,
                filterSearch: true,
              },
              {
                title: 'Timezone',
                dataIndex: 'timezone_name',
                key: 'timezone',
                width: 180,
                sorter: (a: DemographicRecord, b: DemographicRecord) => 
                  (a.timezone_display_name || '').localeCompare(b.timezone_display_name || ''),
                render: (timezoneName: string, record: DemographicRecord) => {
                  if (!timezoneName || !record.timezone_display_name) return '-';
                  
                  // Determine current abbreviation based on DST status
                  const isDST = record.observes_dst && isDaylightSavingTime(new Date());
                  const abbreviation = isDST && record.abbreviation_daylight ? 
                    record.abbreviation_daylight : record.abbreviation_standard;
                  
                  const displayText = `${record.timezone_display_name} (${abbreviation})`;
                  
                  // Color mapping for different timezone types
                  const colorMap: { [key: string]: string } = {
                    'Eastern': 'blue',
                    'Central': 'green', 
                    'Mountain': 'orange',
                    'Pacific': 'purple',
                    'Alaska': 'cyan',
                    'Hawaii': 'magenta',
                    'Atlantic': 'red',
                    'Chamorro': 'gold',
                    'Samoa': 'lime'
                  };
                  
                  // Find color based on display name
                  const color = Object.keys(colorMap).find(key => 
                    record.timezone_display_name.includes(key)
                  );
                  
                  return (
                    <Tag color={color ? colorMap[color] : 'default'} style={{ fontSize: '11px' }}>
                      {displayText}
                    </Tag>
                  );
                },
                filters: allTimezoneOptions.map(option => ({
                  text: option.label,
                  value: option.value,
                })),
                filteredValue: advancedFilters.timezone,
                filterSearch: true,
              },
              {
                title: 'Median HHI',
                dataIndex: 'mhhi',
                key: 'mhhi',
                width: 120,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.mhhi === 'number' ? a.mhhi : parseFloat(a.mhhi || '0');
                  const bVal = typeof b.mhhi === 'number' ? b.mhhi : parseFloat(b.mhhi || '0');
                  return aVal - bVal;
                },
                filters: allMhhiValues.map(value => ({
                  text: formatCurrency(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.mhhi,
                filterSearch: true,
                render: (value: number | string) => formatCurrency(value),
              },
              {
                title: 'Avg HHI',
                dataIndex: 'avg_hhi',
                key: 'avg_hhi',
                width: 120,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.avg_hhi === 'number' ? a.avg_hhi : parseFloat(a.avg_hhi || '0');
                  const bVal = typeof b.avg_hhi === 'number' ? b.avg_hhi : parseFloat(b.avg_hhi || '0');
                  return aVal - bVal;
                },
                filters: allAvgHhiValues.map(value => ({
                  text: formatCurrency(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.avg_hhi,
                filterSearch: true,
                render: (value: number | string) => formatCurrency(value),
              },
              {
                title: 'Median Age',
                dataIndex: 'median_age',
                key: 'median_age',
                width: 100,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.median_age === 'number' ? a.median_age : parseFloat(a.median_age || '0');
                  const bVal = typeof b.median_age === 'number' ? b.median_age : parseFloat(b.median_age || '0');
                  return aVal - bVal;
                },
                filters: allMedianAgeValues.map(value => ({
                  text: value.toString(),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.median_age,
                filterSearch: true,
              },
              {
                title: 'Households',
                dataIndex: 'households',
                key: 'households',
                width: 120,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.households === 'number' ? a.households : parseFloat(a.households || '0');
                  const bVal = typeof b.households === 'number' ? b.households : parseFloat(b.households || '0');
                  return aVal - bVal;
                },
                filters: allHouseholdsValues.map(value => ({
                  text: formatNumber(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.households,
                filterSearch: true,
                render: (value: number | string) => formatNumber(value),
              },
              {
                title: 'White %',
                dataIndex: 'race_ethnicity_white',
                key: 'race_ethnicity_white',
                width: 100,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.race_ethnicity_white === 'number' ? a.race_ethnicity_white : parseFloat(a.race_ethnicity_white || '0');
                  const bVal = typeof b.race_ethnicity_white === 'number' ? b.race_ethnicity_white : parseFloat(b.race_ethnicity_white || '0');
                  return aVal - bVal;
                },
                filters: allRaceWhiteValues.map(value => ({
                  text: formatNumber(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.race_ethnicity_white,
                filterSearch: true,
                render: (value: number | string) => formatNumber(value),
              },
              {
                title: 'Black %',
                dataIndex: 'race_ethnicity_black',
                key: 'race_ethnicity_black',
                width: 100,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.race_ethnicity_black === 'number' ? a.race_ethnicity_black : parseFloat(a.race_ethnicity_black || '0');
                  const bVal = typeof b.race_ethnicity_black === 'number' ? b.race_ethnicity_black : parseFloat(b.race_ethnicity_black || '0');
                  return aVal - bVal;
                },
                filters: allRaceBlackValues.map(value => ({
                  text: formatNumber(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.race_ethnicity_black,
                filterSearch: true,
                render: (value: number | string) => formatNumber(value),
              },
              {
                title: 'Hispanic %',
                dataIndex: 'race_ethnicity_hispanic',
                key: 'race_ethnicity_hispanic',
                width: 120,
                sorter: (a: DemographicRecord, b: DemographicRecord) => {
                  const aVal = typeof a.race_ethnicity_hispanic === 'number' ? a.race_ethnicity_hispanic : parseFloat(a.race_ethnicity_hispanic || '0');
                  const bVal = typeof b.race_ethnicity_hispanic === 'number' ? b.race_ethnicity_hispanic : parseFloat(b.race_ethnicity_hispanic || '0');
                  return aVal - bVal;
                },
                filters: allRaceHispanicValues.map(value => ({
                  text: formatNumber(value),
                  value: value.toString(),
                })),
                filteredValue: advancedFilters.race_ethnicity_hispanic,
                filterSearch: true,
                render: (value: number | string) => formatNumber(value),
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 100,
                fixed: 'right',
                render: (_, record: DemographicRecord) => (
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    type="text"
                    onClick={() => {
                      console.log('View record:', record);
                      message.info(`Viewing record for ${record.zip_code}`);
                    }}
                  >
                    View
                  </Button>
                ),
              },
            ]}
          />
          </Card>


      </Layout.Content>
      
      {/* Floating Action Button when sidebar is hidden */}
      {!sidebarVisible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 1000
        }}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<FilterOutlined />}
            onClick={() => setSidebarVisible(true)}
            title="Show Filters"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
        </div>
      )}
      
      {/* Save Filter Modal */}
      {saveModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Title level={5} style={{ margin: '0 0 16px 0' }}>Save Filter</Title>
            <Input
              placeholder="Enter filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="mb-3"
              size="small"
            />
            <Space>
              <Button type="primary" onClick={handleSaveFilter} size="small">
                Save
              </Button>
              <Button onClick={() => setSaveModalVisible(false)} size="small">
                Cancel
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ViewRecordsDashboard;
