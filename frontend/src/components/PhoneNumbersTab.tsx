import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Tooltip,
  Popconfirm,
  Divider,
  Progress,
  Checkbox,
  Drawer
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  PhoneOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PhoneNumber {
  id: number;
  job_id: number;
  npa: string;
  nxx: string;
  full_phone_number: string;
  zip: string;
  state_code: string;
  city: string;
  county: string;
  timezone_id: number;
  timezone_display_name: string;
  created_at: string;
  thousands: string;
}

interface PhoneNumberResponse {
  success: boolean;
  data: PhoneNumber[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: any;
}

const PhoneNumbersTab: React.FC = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `${range[0]}-${range[1]} of ${total} phone numbers`,
  });

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Filter options
  const [npaOptions, setNpaOptions] = useState<string[]>([]);
  const [nxxOptions, setNxxOptions] = useState<string[]>([]);
  const [thousandsOptions, setThousandsOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [zipOptions, setZipOptions] = useState<string[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<any[]>([]);

  // Download states
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'full_phone_number', 'npa', 'nxx', 'thousands', 'state_code', 'zip', 'timezone_display_name'
  ]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Column options for download
  const columnOptions = [
    { label: 'Full Phone Number', value: 'full_phone_number' },
    { label: 'NPA', value: 'npa' },
    { label: 'NXX', value: 'nxx' },
    { label: 'Thousands', value: 'thousands' },
    { label: 'State', value: 'state_code' },
    { label: 'Zip Code', value: 'zip' },
    { label: 'City', value: 'city' },
    { label: 'County', value: 'county' },
    { label: 'Timezone', value: 'timezone_display_name' },
    { label: 'Created At', value: 'created_at' }
  ];

  // Fetch phone numbers
  const fetchPhoneNumbers = async (page = 1, pageSize = 50, search?: string, filterParams?: any) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });

      if (search) {
        params.append('search', search);
      }

      if (filterParams) {
        Object.keys(filterParams).forEach(key => {
          if (filterParams[key] && filterParams[key].length > 0) {
            if (Array.isArray(filterParams[key])) {
              filterParams[key].forEach((value: string) => {
                params.append(key, value);
              });
            } else {
              params.append(key, filterParams[key]);
            }
          }
        });
      }

      const response = await apiClient.get<PhoneNumberResponse>(`/phone-numbers/numbers?${params.toString()}`);

      setPhoneNumbers(response.data.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.data.pagination.total,
      }));
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      message.error('Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [npaRes, nxxRes, thousandsRes, stateRes, zipRes, timezoneRes] = await Promise.all([
        apiClient.get('/phone-numbers/numbers/unique/npa?limit=1000'),
        apiClient.get('/phone-numbers/numbers/unique/nxx?limit=1000'),
        apiClient.get('/phone-numbers/numbers/unique/thousands?limit=1000'),
        apiClient.get('/phone-numbers/numbers/unique/state_code?limit=1000'),
        apiClient.get('/phone-numbers/numbers/unique/zip?limit=1000'),
        apiClient.get('/phone-numbers/numbers/unique/timezone_id?limit=1000')
      ]);

      setNpaOptions(npaRes.data.data || []);
      setNxxOptions(nxxRes.data.data || []);
      setThousandsOptions(thousandsRes.data.data || []);
      setStateOptions(stateRes.data.data || []);
      setZipOptions(zipRes.data.data || []);
      setTimezoneOptions(timezoneRes.data.data || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  // Handle table change
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const newFilters = { ...advancedFilters };
    
    // Convert Ant Design filters to our format
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key].length > 0) {
        newFilters[key] = filters[key];
      } else {
        delete newFilters[key];
      }
    });

    setAdvancedFilters(newFilters);
    fetchPhoneNumbers(pagination.current, pagination.pageSize, searchText, newFilters);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchPhoneNumbers(1, pagination.pageSize, value, advancedFilters);
  };

  // Handle filter apply
  const applyFilters = () => {
    setAdvancedFilters(filters);
    fetchPhoneNumbers(1, pagination.pageSize, searchText, filters);
    setFilterDrawerVisible(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({});
    setAdvancedFilters({});
    setSearchText('');
    fetchPhoneNumbers(1, pagination.pageSize, '', {});
  };

  // Download CSV
  const handleDownload = async () => {
    if (selectedColumns.length === 0) {
      message.error('Please select at least one column for download');
      return;
    }

    setDownloadLoading(true);
    try {
      const params = new URLSearchParams({
        columns: selectedColumns.join(','),
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });

      if (searchText) {
        params.append('search', searchText);
      }

      if (Object.keys(advancedFilters).length > 0) {
        Object.keys(advancedFilters).forEach(key => {
          if (advancedFilters[key] && advancedFilters[key].length > 0) {
            if (Array.isArray(advancedFilters[key])) {
              advancedFilters[key].forEach((value: string) => {
                params.append(key, value);
              });
            } else {
              params.append(key, advancedFilters[key]);
            }
          }
        });
      }

      const response = await apiClient.get(`/phone-numbers/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `phone_numbers_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Phone numbers downloaded successfully');
      setDownloadModalVisible(false);
    } catch (error) {
      console.error('Error downloading phone numbers:', error);
      message.error('Failed to download phone numbers');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Phone Number',
      dataIndex: 'full_phone_number',
      key: 'full_phone_number',
      width: 150,
      fixed: 'left' as const,
      sorter: true,
      render: (text: string) => (
        <Text code>{text}</Text>
      ),
    },
    {
      title: 'NPA',
      dataIndex: 'npa',
      key: 'npa',
      width: 80,
      sorter: true,
      filters: npaOptions.map(value => ({ text: value, value })),
      filteredValue: advancedFilters.npa,
      filterSearch: true,
    },
    {
      title: 'NXX',
      dataIndex: 'nxx',
      key: 'nxx',
      width: 80,
      sorter: true,
      filters: nxxOptions.map(value => ({ text: value, value })),
      filteredValue: advancedFilters.nxx,
      filterSearch: true,
    },
    {
      title: 'Thousands',
      dataIndex: 'thousands',
      key: 'thousands',
      width: 100,
      sorter: true,
      filters: thousandsOptions.map(value => ({ text: value, value })),
      filteredValue: advancedFilters.thousands,
      filterSearch: true,
    },
    {
      title: 'State',
      dataIndex: 'state_code',
      key: 'state_code',
      width: 100,
      sorter: true,
      filters: stateOptions.map(value => ({ text: value, value })),
      filteredValue: advancedFilters.state_code,
      filterSearch: true,
    },
    {
      title: 'Zip Code',
      dataIndex: 'zip',
      key: 'zip',
      width: 120,
      sorter: true,
      filters: zipOptions.map(value => ({ text: value, value })),
      filteredValue: advancedFilters.zip,
      filterSearch: true,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 150,
      sorter: true,
    },
    {
      title: 'County',
      dataIndex: 'county',
      key: 'county',
      width: 150,
      sorter: true,
    },
    {
      title: 'Timezone',
      dataIndex: 'timezone_display_name',
      key: 'timezone_display_name',
      width: 200,
      sorter: true,
      filters: timezoneOptions.map(option => ({ text: option.label, value: option.value })),
      filteredValue: advancedFilters.timezone_id,
      filterSearch: true,
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: true,
      render: (text: string) => format(new Date(text), 'yyyy-MM-dd HH:mm'),
    },
  ];

  // Load data on component mount
  useEffect(() => {
    fetchPhoneNumbers();
    loadFilterOptions();
  }, []);

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Title level={4}>
              <PhoneOutlined /> Phone Numbers
            </Title>
          </Col>
          <Col>
            <Space>
              <Statistic
                title="Total Phone Numbers"
                value={totalCount}
                valueStyle={{ fontSize: '16px' }}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerVisible(true)}
              >
                Filters
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => setDownloadModalVisible(true)}
              >
                Download CSV
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchPhoneNumbers(pagination.current, pagination.pageSize, searchText, advancedFilters)}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Search
              placeholder="Search phone numbers, NPA, NXX, zip, state..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={phoneNumbers}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* Filter Drawer */}
      <Drawer
        title="Advanced Filters"
        placement="right"
        width={400}
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        extra={
          <Space>
            <Button onClick={clearAllFilters}>Clear All</Button>
            <Button type="primary" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="NPA">
            <Select
              mode="multiple"
              placeholder="Select NPAs"
              value={filters.npa}
              onChange={(value) => setFilters({ ...filters, npa: value })}
              options={npaOptions.map(value => ({ label: value, value }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="NXX">
            <Select
              mode="multiple"
              placeholder="Select NXXs"
              value={filters.nxx}
              onChange={(value) => setFilters({ ...filters, nxx: value })}
              options={nxxOptions.map(value => ({ label: value, value }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Thousands">
            <Select
              mode="multiple"
              placeholder="Select thousands digits"
              value={filters.thousands}
              onChange={(value) => setFilters({ ...filters, thousands: value })}
              options={thousandsOptions.map(value => ({ label: value, value }))}
            />
          </Form.Item>

          <Form.Item label="State">
            <Select
              mode="multiple"
              placeholder="Select states"
              value={filters.state_code}
              onChange={(value) => setFilters({ ...filters, state_code: value })}
              options={stateOptions.map(value => ({ label: value, value }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Zip Code">
            <Select
              mode="multiple"
              placeholder="Select zip codes"
              value={filters.zip}
              onChange={(value) => setFilters({ ...filters, zip: value })}
              options={zipOptions.map(value => ({ label: value, value }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Timezone">
            <Select
              mode="multiple"
              placeholder="Select timezones"
              value={filters.timezone_id}
              onChange={(value) => setFilters({ ...filters, timezone_id: value })}
              options={timezoneOptions.map(option => ({ label: option.label, value: option.value }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Download Modal */}
      <Modal
        title="Download Phone Numbers"
        open={downloadModalVisible}
        onOk={handleDownload}
        onCancel={() => setDownloadModalVisible(false)}
        confirmLoading={downloadLoading}
        width={500}
      >
        <div>
          <Text>Select columns to include in the CSV file:</Text>
          <Divider />
          <Checkbox.Group
            options={columnOptions}
            value={selectedColumns}
            onChange={(checkedValues) => setSelectedColumns(checkedValues as string[])}
          />
          <Divider />
          <Text type="secondary">
            {searchText && `Search: "${searchText}"`}
            {Object.keys(advancedFilters).length > 0 && (
              <div>
                Filters: {Object.keys(advancedFilters).map(key => 
                  `${key}: ${Array.isArray(advancedFilters[key]) ? advancedFilters[key].join(', ') : advancedFilters[key]}`
                ).join(', ')}
              </div>
            )}
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default PhoneNumbersTab;
