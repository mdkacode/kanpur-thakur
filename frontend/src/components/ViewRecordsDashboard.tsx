import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, Button, Row, Col, Form, Input, Select, message, Collapse, Divider, Typography, Space, Badge, Tooltip, Layout } from 'antd';
import { ReloadOutlined, SaveOutlined, BookFilled, EyeOutlined, FilterOutlined, MenuOutlined, DownloadOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import AdvancedFilters from './AdvancedFilters';
import { FilterConfig } from '../api/filterApi';
import { DemographicRecord } from './DemographicRecords';

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

  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const [form] = Form.useForm();

  // Load saved filters on component mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

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
      const url = `/demographic/records/unique/zipcode?search=${encodeURIComponent(query)}&limit=10`;
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
      if (zipcodeFilter.length > 0) params.append('zipcode', zipcodeFilter.join(','));

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
      if (zipcodeFilter.length > 0) allFilters.zipcode = zipcodeFilter.join(',');
      if (stateFilter.length > 0) allFilters.state = stateFilter.join(',');
      if (advancedFilters.county?.length > 0) allFilters.county = advancedFilters.county.join(',');
      if (advancedFilters.city?.length > 0) allFilters.city = advancedFilters.city.join(',');
      
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
      setZipcodeFilter(config.zipcode ? (Array.isArray(config.zipcode) ? config.zipcode : config.zipcode.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : []);
      setStateFilter(config.state ? (Array.isArray(config.state) ? config.state : config.state.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : []);
      
      // Load advanced filters
      setAdvancedFilters({
        county: config.county ? (Array.isArray(config.county) ? config.county : config.county.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
        city: config.city ? (Array.isArray(config.city) ? config.city : config.city.split(',').map((s: string) => s.trim()).filter((s: string) => s)) : [],
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

  const formatCurrency = (value: string) => {
    if (!value || value === '-$1' || value === '') return '-';
    if (value.startsWith('$')) return value;
    return `$${parseInt(value).toLocaleString()}`;
  };

  const formatNumber = (value: string) => {
    if (!value || value === '-$1' || value === '') return '-';
    return parseInt(value).toLocaleString();
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
      {/* Compact Filters Section - Left Side */}
      {sidebarVisible && (
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
                      <option value="zipcode">📮 Zipcode</option>
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
        paddingLeft: sidebarVisible ? '16px' : '0px',
        transition: 'all 0.3s ease',
        width: sidebarVisible ? 'auto' : '100%',
        maxWidth: sidebarVisible ? 'none' : '100vw'
      }}>
        {/* Header Stats */}
        <Card size="small" className={`${isDarkMode ? 'dark' : 'light'} mb-4`}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Demographic Records
              </Title>
              <Text type="secondary">
                Showing {records.length} of {total} records
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  size="small"
                  icon={<FilterOutlined />}
                  onClick={() => setSidebarVisible(!sidebarVisible)}
                  type={sidebarVisible ? 'primary' : 'default'}
                >
                  {sidebarVisible ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <Badge count={filteredZipcodes.length} showZero>
                  <Button size="small" icon={<EyeOutlined />}>
                    Filtered Zipcodes
                  </Button>
                </Badge>
                <Button size="small" icon={<DownloadOutlined />}>
                  Export
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Records Table */}
        <Card size="small" className={`${isDarkMode ? 'dark' : 'light'}`}>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No records found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                <thead>
                  <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" 
                        onClick={() => handleSort('zipcode')}>
                      📮 Zipcode {sortBy === 'zipcode' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('state')}>
                      🌍 State {sortBy === 'state' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('county')}>
                      🏛️ County {sortBy === 'county' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('city')}>
                      🏙️ City {sortBy === 'city' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('mhhi')}>
                      💰 Median HHI {sortBy === 'mhhi' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('avg_hhi')}>
                      💵 Avg HHI {sortBy === 'avg_hhi' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('pc_income')}>
                      👤 Per Capita {sortBy === 'pc_income' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('median_age')}>
                      👥 Age {sortBy === 'median_age' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('households')}>
                      🏠 HH {sortBy === 'households' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('race_ethnicity_white')}>
                      ⚪ White {sortBy === 'race_ethnicity_white' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('race_ethnicity_black')}>
                      ⚫ Black {sortBy === 'race_ethnicity_black' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('race_ethnicity_hispanic')}>
                      🌮 Hispanic {sortBy === 'race_ethnicity_hispanic' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('unemployment_pct')}>
                      📉 Unemp % {sortBy === 'unemployment_pct' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSort('housing_units')}>
                      🏘️ Units {sortBy === 'housing_units' && (sortOrder === 'ascend' ? '⬆️' : '⬇️')}
                    </th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="px-3 py-2 font-medium">{record.zipcode}</td>
                      <td className="px-3 py-2">{record.state}</td>
                      <td className="px-3 py-2">{record.county}</td>
                      <td className="px-3 py-2">{record.city}</td>
                      <td className="px-3 py-2">{formatCurrency(record.mhhi)}</td>
                      <td className="px-3 py-2">{formatCurrency(record.avg_hhi)}</td>
                      <td className="px-3 py-2">{formatCurrency(record.pc_income)}</td>
                      <td className="px-3 py-2">{record.median_age || '-'}</td>
                      <td className="px-3 py-2">{formatNumber(record.households)}</td>
                      <td className="px-3 py-2">{formatNumber(record.race_ethnicity_white)}</td>
                      <td className="px-3 py-2">{formatNumber(record.race_ethnicity_black)}</td>
                      <td className="px-3 py-2">{formatNumber(record.race_ethnicity_hispanic)}</td>
                      <td className="px-3 py-2">{record.unemployment_pct ? `${record.unemployment_pct}%` : '-'}</td>
                      <td className="px-3 py-2">{formatNumber(record.housing_units)}</td>
                      <td className="px-3 py-2">
                        <Button size="small" icon={<EyeOutlined />} type="text">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {total > pageSize && (
          <Card size="small" className={`${isDarkMode ? 'dark' : 'light'} mt-4`}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text>
                  Page {currentPage} of {Math.ceil(total / pageSize)}
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button
                    size="small"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        )}
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
