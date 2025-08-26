import React, { useState, useEffect } from 'react';
import { Table, Input, Space, Button, Card, Tag, Typography, Select, Tooltip, message } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined, PhoneOutlined } from '@ant-design/icons';
import { recordApi, Record } from '../api/recordApi';
import { recordFilterApi, RecordFilterConfig } from '../api/recordFilterApi';
import RecordFilterModal from './RecordFilterModal';
import { format } from 'date-fns';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DataTableProps {
  refreshTrigger?: number;
}

const DataTable: React.FC<DataTableProps> = ({ refreshTrigger }) => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `${range[0]}-${range[1]} of ${total} records`,
  });
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<RecordFilterConfig>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Record[]>([]);

  const fetchRecords = async (page = 1, pageSize = 50, search?: string, filters?: RecordFilterConfig) => {
    setLoading(true);
    try {
      const response = await recordApi.getAllRecords(
        page,
        pageSize,
        search,
        sortBy,
        sortOrder,
        filters
      );
      
      setRecords(response.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(pagination.current, pagination.pageSize, searchText);
  }, [refreshTrigger, sortBy, sortOrder]);

  const handleTableChange = (newPagination: any, filters: any, sorter: any) => {
    const newSortBy = sorter.field || 'created_at';
    const newSortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC';
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    fetchRecords(newPagination.current, newPagination.pageSize, searchText);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRecords(1, pagination.pageSize, value);
  };

  const handleRefresh = () => {
    fetchRecords(pagination.current, pagination.pageSize, searchText, currentFilters);
  };

  const handleApplyFilters = (filters: RecordFilterConfig) => {
    setCurrentFilters(filters);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRecords(1, pagination.pageSize, searchText, filters);
  };

  const handleGeneratePhoneNumbers = async () => {
    if (selectedRecords.length === 0) {
      message.warning('Please select records to generate phone numbers');
      return;
    }

    try {
      // Extract unique zipcodes from selected records
      const zipcodes = Array.from(new Set(selectedRecords.map(record => record.zip)));
      
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[], selectedRows: Record[]) => {
      setSelectedRowKeys(selectedKeys);
      setSelectedRecords(selectedRows);
    },
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: 'green', text: 'Active' },
      inactive: { color: 'red', text: 'Inactive' },
      pending: { color: 'orange', text: 'Pending' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: true,
    },
    {
      title: 'NPA',
      dataIndex: 'npa',
      key: 'npa',
      width: 100,
      sorter: true,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'NXX',
      dataIndex: 'nxx',
      key: 'nxx',
      width: 100,
      sorter: true,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'ZIP',
      dataIndex: 'zip',
      key: 'zip',
      width: 120,
      sorter: true,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      sorter: true,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      sorter: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'RC',
      dataIndex: 'rc',
      key: 'rc',
      sorter: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Timezone',
      dataIndex: 'timezone_display_name',
      key: 'timezone',
      width: 150,
      sorter: true,
      render: (text: string, record: Record) => {
        if (!record.timezone_display_name) {
          return <Text type="secondary">-</Text>;
        }
        
        // Determine current abbreviation based on DST
        const isDST = record.observes_dst && record.abbreviation_daylight;
        const currentAbbr = isDST ? record.abbreviation_daylight : record.abbreviation_standard;
        
        return (
          <Tooltip title={`${record.timezone_display_name} (${currentAbbr})`}>
            <Tag color="purple">
              {currentAbbr || record.abbreviation_standard}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: true,
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy'),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      sorter: true,
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy'),
    },
  ];

  return (
    <Card title="Records Data" style={{ margin: '16px 0' }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Search
            placeholder="Search records..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
          <Select
            value={sortBy}
            style={{ width: 150 }}
            onChange={(value) => setSortBy(value)}
            size="large"
          >
            <Option value="created_at">Created Date</Option>
            <Option value="npa">NPA</Option>
            <Option value="nxx">NXX</Option>
            <Option value="zip">ZIP</Option>
            <Option value="state_code">State</Option>
            <Option value="city">City</Option>
            <Option value="timezone_display_name">Timezone</Option>
          </Select>
          <Select
            value={sortOrder}
            style={{ width: 100 }}
            onChange={(value) => setSortOrder(value)}
            size="large"
          >
            <Option value="DESC">Desc</Option>
            <Option value="ASC">Asc</Option>
          </Select>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterModalVisible(true)}
            size="large"
          >
            Filters
          </Button>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PhoneOutlined />}
            onClick={handleGeneratePhoneNumbers}
            disabled={selectedRecords.length === 0}
          >
            Generate Phone Numbers ({selectedRecords.length})
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Space>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        size="middle"
        bordered
        rowSelection={rowSelection}
      />

      <RecordFilterModal
        visible={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
        onSaveFilter={(name, filters) => {
          // This will be handled by the modal itself
        }}
      />
    </Card>
  );
};

export default DataTable;
