import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Input, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Tag, 
  Tooltip,
  Dropdown,
  Menu,
  message,
  Spin,
  Empty,
  Statistic,
  Divider,
  Badge
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  SettingOutlined,
  EyeOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';
import AdvancedFilters from './AdvancedFilters';
import { FilterConfig } from '../api/filterApi';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

export interface DemographicRecord {
  id: number;
  zip_code: string;
  state: string;
  county: string;
  city: string;
  timezone_id: number;
  timezone_name: string;
  timezone_display_name: string;
  abbreviation_standard: string;
  abbreviation_daylight?: string;
  utc_offset_standard: number;
  utc_offset_daylight?: number;
  observes_dst: boolean;
  timezone_description?: string;
  timezone_states: string[];
  mhhi: string;
  mhhi_moe: string;
  avg_hhi: string;
  avg_hhi_moe: string;
  pc_income: string;
  pc_income_moe: string;
  pct_hh_w_income_200k_plus: string;
  pct_hh_w_income_200k_plus_moe: string;
  median_age: string;
  households: string;
  family_hh_total: string;
  unemployment_pct: string;
  housing_units: string;
  owner_occupied: string;
  edu_att_bachelors: string;
  pop_dens_sq_mi: string;
  race_ethnicity_white: string;
  race_ethnicity_black: string;
  race_ethnicity_hispanic: string;
  created_at: string;
  updated_at: string;
}

interface RecordsResponse {
  success: boolean;
  data: DemographicRecord[];
  filteredZipcodes?: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DemographicRecords: React.FC = () => {
  const [records, setRecords] = useState<DemographicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [zipcodeFilter, setZipcodeFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [states, setStates] = useState<string[]>([]);
  const [filteredZipcodes, setFilteredZipcodes] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterConfig>({});
  
  // New state for Excel-like functionality
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  const [filteredRecords, setFilteredRecords] = useState<DemographicRecord[]>([]);
  
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchStates();
      fetchRecords();
    }
  }, [isAuthenticated, currentPage, pageSize, searchQuery, stateFilter, zipcodeFilter, sortBy, sortOrder, advancedFilters]);

  // Update filtered records when records or table filters change
  useEffect(() => {
    setFilteredRecords(records);
  }, [records]);

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
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder: sortOrder === 'ascend' ? 'ASC' : 'DESC',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (stateFilter) {
        params.append('state', stateFilter);
      }

      if (zipcodeFilter) {
        params.append('zipcode', zipcodeFilter);
      }

      // Add advanced filters
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/demographic/records?${params}`);
      const result: RecordsResponse = response.data;

      if (result.success) {
        setRecords(result.data);
        setTotal(result.pagination.total);
        if (result.filteredZipcodes) {
          setFilteredZipcodes(result.filteredZipcodes);
        }
      } else {
        setError('Failed to fetch records');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch records');
      message.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter.field) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order);
    }
    if (pagination.current !== currentPage) {
      setCurrentPage(pagination.current);
    }
    if (pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setCurrentPage(1);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleAdvancedFiltersChange = (filters: FilterConfig) => {
    setAdvancedFilters(filters);
    setCurrentPage(1);
  };

  const handleApplyAdvancedFilters = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({});
    setCurrentPage(1);
  };

  const clearBasicFilters = () => {
    setSearchQuery('');
    setStateFilter('');
    setZipcodeFilter('');
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    clearBasicFilters();
    handleClearAdvancedFilters();
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

  const formatPercentage = (value: string) => {
    if (!value || value === '-$1' || value === '') return '-';
    return `${value}%`;
  };

  const formatDensity = (value: string) => {
    if (!value || value === '-$1' || value === '') return '-';
    return `${parseInt(value).toLocaleString()}/mi²`;
  };

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[], selectedRows: DemographicRecord[]) => {
      setSelectedRowKeys(selectedKeys);
      console.log('Selected rows:', selectedRows);
    },
    onSelectAll: (selected: boolean, selectedRows: DemographicRecord[], changeRows: DemographicRecord[]) => {
      console.log(selected ? 'Selected all rows' : 'Deselected all rows');
    },
    getCheckboxProps: (record: DemographicRecord) => ({
      disabled: false,
              name: record.zip_code,
    }),
  };

  // Generate unique filter options for each column
  const getUniqueValues = (key: keyof DemographicRecord) => {
    const values = records.map(record => record[key]).filter(Boolean);
    const uniqueValues = Array.from(new Set(values));
    return uniqueValues.map(value => ({ 
      text: value?.toString() || '', 
      value: value?.toString() || '' 
    }));
  };

  // Custom filter function for Excel-like behavior
  const getColumnSearchProps = (dataIndex: keyof DemographicRecord, title: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search ${title}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              clearFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: DemographicRecord) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes(value.toString().toLowerCase()) ?? false,
  });

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
        const selectedRecords = records.filter(record => selectedRowKeys.includes(record.id));
        const zipcodes = selectedRecords.map(r => r.zip_code);
        message.success(`Selected ${zipcodes.length} zipcodes for filter creation`);
        // Could integrate with filter creation logic here
        break;
      default:
        message.info(`Action "${action}" not implemented yet`);
    }
  };

  // Export function
  const exportToCSV = (data: DemographicRecord[], filename: string) => {
    const headers = [
      'Zipcode', 'State', 'County', 'City', 'Median HHI', 'Avg HHI', 'Per Capita Income',
      'Age', 'Households', 'White %', 'Black %', 'Hispanic %'
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(record => [
        record.zip_code,
        record.state,
        record.county,
        record.city,
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

  // Table columns configuration with Excel-like filtering
  const columns: ColumnsType<DemographicRecord> = [
    {
      title: 'Zipcode',
              dataIndex: 'zip_code',
      key: 'zip_code',
      sorter: true,
      width: 100,
      fixed: 'left' as const,
      ...getColumnSearchProps('zip_code', 'Zipcode'),
      filters: getUniqueValues('zip_code'),
      onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.zip_code === value.toString(),
      render: (text: string) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Location',
      children: [
        {
          title: 'State',
          dataIndex: 'state',
          key: 'state',
          sorter: true,
          width: 120,
          ...getColumnSearchProps('state', 'State'),
          filters: getUniqueValues('state'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.state === value.toString(),
        },
        {
          title: 'County',
          dataIndex: 'county',
          key: 'county',
          width: 150,
          ellipsis: true,
          ...getColumnSearchProps('county', 'County'),
          filters: getUniqueValues('county'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.county === value.toString(),
        },
        {
          title: 'City',
          dataIndex: 'city',
          key: 'city',
          width: 150,
          ellipsis: true,
          ...getColumnSearchProps('city', 'City'),
          filters: getUniqueValues('city'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.city === value.toString(),
        },
      ],
    },
    {
      title: 'Income & Economics',
      children: [
        {
          title: 'Median HHI',
          dataIndex: 'mhhi',
          key: 'mhhi',
          sorter: true,
          width: 120,
          render: (text: string) => formatCurrency(text),
          ...getColumnSearchProps('mhhi', 'Median HHI'),
          filters: getUniqueValues('mhhi'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.mhhi === value.toString(),
        },
        {
          title: 'Avg HHI',
          dataIndex: 'avg_hhi',
          key: 'avg_hhi',
          sorter: true,
          width: 120,
          render: (text: string) => formatCurrency(text),
          ...getColumnSearchProps('avg_hhi', 'Average HHI'),
          filters: getUniqueValues('avg_hhi'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.avg_hhi === value.toString(),
        },
        {
          title: 'Per Capita',
          dataIndex: 'pc_income',
          key: 'pc_income',
          sorter: true,
          width: 120,
          render: (text: string) => formatCurrency(text),
          ...getColumnSearchProps('pc_income', 'Per Capita Income'),
          filters: getUniqueValues('pc_income'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.pc_income === value.toString(),
        },
        {
          title: '$200k+ %',
          dataIndex: 'pct_hh_w_income_200k_plus',
          key: 'pct_hh_w_income_200k_plus',
          width: 100,
          render: (text: string) => formatPercentage(text),
          ...getColumnSearchProps('pct_hh_w_income_200k_plus', '$200k+ %'),
          filters: getUniqueValues('pct_hh_w_income_200k_plus'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.pct_hh_w_income_200k_plus === value.toString(),
        },
      ],
    },
    {
      title: 'Demographics',
      children: [
        {
          title: 'Median Age',
          dataIndex: 'median_age',
          key: 'median_age',
          sorter: true,
          width: 100,
          render: (text: string) => text || '-',
          ...getColumnSearchProps('median_age', 'Median Age'),
          filters: getUniqueValues('median_age'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.median_age === value.toString(),
        },
        {
          title: 'Population Density',
          dataIndex: 'pop_dens_sq_mi',
          key: 'pop_dens_sq_mi',
          sorter: true,
          width: 140,
          render: (text: string) => formatDensity(text),
          ...getColumnSearchProps('pop_dens_sq_mi', 'Population Density'),
          filters: getUniqueValues('pop_dens_sq_mi'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.pop_dens_sq_mi === value.toString(),
        },
        {
          title: 'White',
          dataIndex: 'race_ethnicity_white',
          key: 'race_ethnicity_white',
          width: 100,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('race_ethnicity_white', 'White Population'),
          filters: getUniqueValues('race_ethnicity_white'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.race_ethnicity_white === value.toString(),
        },
        {
          title: 'Black',
          dataIndex: 'race_ethnicity_black',
          key: 'race_ethnicity_black',
          width: 100,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('race_ethnicity_black', 'Black Population'),
          filters: getUniqueValues('race_ethnicity_black'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.race_ethnicity_black === value.toString(),
        },
        {
          title: 'Hispanic',
          dataIndex: 'race_ethnicity_hispanic',
          key: 'race_ethnicity_hispanic',
          width: 120,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('race_ethnicity_hispanic', 'Hispanic Population'),
          filters: getUniqueValues('race_ethnicity_hispanic'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.race_ethnicity_hispanic === value.toString(),
        },
      ],
    },
    {
      title: 'Households & Families',
      children: [
        {
          title: 'Total HH',
          dataIndex: 'households',
          key: 'households',
          sorter: true,
          width: 100,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('households', 'Total Households'),
          filters: getUniqueValues('households'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.households === value.toString(),
        },
        {
          title: 'Family HH',
          dataIndex: 'family_hh_total',
          key: 'family_hh_total',
          width: 100,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('family_hh_total', 'Family Households'),
          filters: getUniqueValues('family_hh_total'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.family_hh_total === value.toString(),
        },
      ],
    },
    {
      title: 'Education & Employment',
      children: [
        {
          title: "Bachelor's",
          dataIndex: 'edu_att_bachelors',
          key: 'edu_att_bachelors',
          width: 100,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('edu_att_bachelors', "Bachelor's Education"),
          filters: getUniqueValues('edu_att_bachelors'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.edu_att_bachelors === value.toString(),
        },
        {
          title: 'Unemployment %',
          dataIndex: 'unemployment_pct',
          key: 'unemployment_pct',
          width: 140,
          render: (text: string) => formatPercentage(text),
          ...getColumnSearchProps('unemployment_pct', 'Unemployment Percentage'),
          filters: getUniqueValues('unemployment_pct'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.unemployment_pct === value.toString(),
        },
      ],
    },
    {
      title: 'Housing',
      children: [
        {
          title: 'Total Units',
          dataIndex: 'housing_units',
          key: 'housing_units',
          width: 120,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('housing_units', 'Housing Units'),
          filters: getUniqueValues('housing_units'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.housing_units === value.toString(),
        },
        {
          title: 'Owner Occupied',
          dataIndex: 'owner_occupied',
          key: 'owner_occupied',
          width: 140,
          render: (text: string) => formatNumber(text),
          ...getColumnSearchProps('owner_occupied', 'Owner Occupied'),
          filters: getUniqueValues('owner_occupied'),
          onFilter: (value: boolean | React.Key, record: DemographicRecord) => record.owner_occupied === value.toString(),
        },
      ],
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (text: string, record: DemographicRecord) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => message.info(`Viewing details for ${record.zip_code}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
    <div className="space-y-6">
      {/* Header */}
      <Card className={`${isDarkMode ? 'dark' : 'light'}`}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Demographic Records
            </Title>
            <Text type="secondary">
              Comprehensive demographic data with advanced filtering and analysis
            </Text>
          </Col>
          <Col>
            <Space>
              <Badge count={filteredZipcodes.length} showZero>
                <Tag color="green">Filtered Zipcodes</Tag>
              </Badge>
              <Statistic 
                title="Total Records" 
                value={total} 
                valueStyle={{ fontSize: '16px' }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Basic Filters */}
      {/* 
      COMMENTED OUT - LEGACY SIDE FILTERS (Use Excel-like table filters instead)
      
      <Card 
        title="Quick Filters" 
        size="small"
        className={`${isDarkMode ? 'dark' : 'light'}`}
        extra={
          <Space>
            <Button
              type={showAdvancedFilters ? 'primary' : 'default'}
              icon={<FilterOutlined />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRecords}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Search zipcode, state, county, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="All States"
              value={stateFilter}
              onChange={setStateFilter}
              allowClear
              style={{ width: '100%' }}
            >
              {states.map((state) => (
                <Option key={state} value={state}>
                  {state}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Input
              placeholder="Zipcode"
              value={zipcodeFilter}
              onChange={(e) => setZipcodeFilter(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col span={10}>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                Search
              </Button>
              <Button onClick={clearBasicFilters}>
                Clear Basic
              </Button>
              <Button onClick={clearAllFilters}>
                Clear All
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {showAdvancedFilters && (
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          onApplyFilters={handleApplyAdvancedFilters}
          onClearFilters={handleClearAdvancedFilters}
          loading={loading}
        />
      )}
      */}

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
                  Create Filter
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
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="error-card">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </Card>
      )}

      {/* Records Table */}
      <Card 
        title="Demographic Data" 
        size="small"
        className={`${isDarkMode ? 'dark' : 'light'}`}
        extra={
          <Space>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="export" icon={<DownloadOutlined />}>
                    Export to CSV
                  </Menu.Item>
                  <Menu.Item key="columns" icon={<SettingOutlined />}>
                    Column Settings
                  </Menu.Item>
                </Menu>
              }
            >
              <Button icon={<SettingOutlined />}>
                Actions
              </Button>
            </Dropdown>
          </Space>
        }
      >
        <Table
        
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1500 }}
          size="small"
          bordered
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={columns.length}>
                <Text strong>
                  Showing {records.length} of {total} records
                  {filteredZipcodes.length > 0 && (
                    <span> • {filteredZipcodes.length} zipcodes match current filters</span>
                  )}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
                      locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No records found"
                />
              ),
            }}
        />
      </Card>

      {/* Filtered Zipcodes Summary */}
      {filteredZipcodes.length > 0 && (
        <Card 
          title="Filtered Zipcodes" 
          size="small"
          className={`${isDarkMode ? 'dark' : 'light'}`}
        >
          <div className="flex flex-wrap gap-2">
            {filteredZipcodes.slice(0, 50).map((zipcode) => (
              <Tag key={zipcode} color="blue">
                {zipcode}
              </Tag>
            ))}
            {filteredZipcodes.length > 50 && (
              <Tag color="default">
                +{filteredZipcodes.length - 50} more
              </Tag>
            )}
          </div>
          <Divider />
          <Text type="secondary">
            These zipcodes match your current filter criteria and can be used in the Comprehensive Dashboard for telecare processing.
          </Text>
        </Card>
      )}
    </div>
  );
};

export default DemographicRecords;
