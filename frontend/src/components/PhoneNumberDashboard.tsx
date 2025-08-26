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
  Progress
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  HistoryOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import {
  phoneGenerationApi,
  PhoneNumberGeneration,
  PhoneGenerationStats,
  DownloadRecord
} from '../api/phoneGenerationApi';
import { timezoneApi } from '../api/timezoneApi';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PhoneNumberDashboardProps {
  refreshTrigger?: number;
}

const PhoneNumberDashboard: React.FC<PhoneNumberDashboardProps> = ({ refreshTrigger }) => {
  const [generations, setGenerations] = useState<PhoneNumberGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PhoneGenerationStats | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadRecord[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [statusOptions] = useState(['generated', 'completed', 'failed', 'processing']);

  // Modal states
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<PhoneNumberGeneration | null>(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `${range[0]}-${range[1]} of ${total} generations`,
  });

  // Fetch data
  const fetchGenerations = async (page = 1, pageSize = 20, search?: string, filterParams?: any) => {
    setLoading(true);
    try {
      const response = await phoneGenerationApi.getAllGenerations(
        page,
        pageSize,
        search,
        'created_at',
        'DESC',
        filterParams
      );

      setGenerations(response.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error('Error fetching phone generations:', error);
      message.error('Failed to fetch phone generations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await phoneGenerationApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [timezones, users] = await Promise.all([
        timezoneApi.getTimezoneOptions(),
        phoneGenerationApi.getUniqueValues('user_name')
      ]);

      setTimezoneOptions(timezones);
      setUserOptions(users);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    fetchGenerations();
    fetchStats();
    fetchFilterOptions();
  }, [refreshTrigger]);

  // Handle actions
  const handleDownload = async (generation: PhoneNumberGeneration) => {
    try {
      const userName = prompt('Enter your name for download tracking:') || 'Anonymous User';
      const blob = await phoneGenerationApi.downloadCSV(generation.id, userName);
      phoneGenerationApi.downloadAndSaveCSV(blob, generation.csv_filename || `phone_numbers_${generation.id}.csv`);
      message.success('CSV downloaded successfully!');
      
      // Refresh data to update download count
      fetchGenerations(pagination.current, pagination.pageSize, searchText, filters);
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download CSV file');
    }
  };

  const handleViewDetails = (generation: PhoneNumberGeneration) => {
    setSelectedGeneration(generation);
    setDetailsModalVisible(true);
  };

  const handleViewHistory = async (generation: PhoneNumberGeneration) => {
    try {
      const response = await phoneGenerationApi.getDownloadHistory(generation.id);
      setDownloadHistory(response.data);
      setSelectedGeneration(generation);
      setHistoryModalVisible(true);
    } catch (error) {
      console.error('Error fetching download history:', error);
      message.error('Failed to fetch download history');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await phoneGenerationApi.deleteGeneration(id);
      message.success('Phone number generation deleted successfully');
      fetchGenerations(pagination.current, pagination.pageSize, searchText, filters);
      fetchStats();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete phone number generation');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchGenerations(1, pagination.pageSize, value, filters);
  };

  const handleFilterChange = (filterName: string, value: any) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    fetchGenerations(1, pagination.pageSize, searchText, newFilters);
  };

  const handleTableChange = (newPagination: any) => {
    fetchGenerations(newPagination.current, newPagination.pageSize, searchText, filters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    fetchGenerations(1, pagination.pageSize, '', {});
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Table columns
  const columns = [
    {
      title: 'Generation Name',
      dataIndex: 'generation_name',
      key: 'generation_name',
      width: 200,
      render: (text: string, record: PhoneNumberGeneration) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </div>
      ),
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 120,
      render: (text: string, record: PhoneNumberGeneration) => (
        <div>
          <UserOutlined /> {text || 'Anonymous'}
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.user_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Records',
      dataIndex: 'total_records',
      key: 'total_records',
      width: 100,
      render: (count: number) => (
        <Statistic
          value={count}
          prefix={<PhoneOutlined />}
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: 'File Info',
      key: 'file_info',
      width: 120,
      render: (_: any, record: PhoneNumberGeneration) => (
        <div>
          <Text>{formatFileSize(record.file_size)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.csv_filename?.substring(0, 20)}...
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors = {
          completed: 'green',
          generated: 'blue',
          processing: 'orange',
          failed: 'red'
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Downloads',
      dataIndex: 'download_count_actual',
      key: 'downloads',
      width: 100,
      render: (count: number, record: PhoneNumberGeneration) => (
        <div>
          <Text strong>{count}</Text>
          {record.last_downloaded_at && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Last: {format(new Date(record.last_downloaded_at), 'MM/dd HH:mm')}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <div>
          <CalendarOutlined /> {format(new Date(date), 'MM/dd/yyyy')}
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {format(new Date(date), 'HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: PhoneNumberGeneration) => (
        <Space size="small">
          <Tooltip title="Download CSV">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="View Details">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Download History">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => handleViewHistory(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this generation?"
            description="This will also delete the CSV file. This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <PhoneOutlined /> Phone Number Dashboard
          </Title>
          <Text type="secondary">
            Track and manage generated phone number collections
          </Text>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchGenerations();
              fetchStats();
            }}
            loading={loading}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Generations"
                value={stats.total_generations}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Phone Numbers"
                value={stats.total_phone_numbers}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Downloads"
                value={stats.total_downloads}
                prefix={<DownloadOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Unique Users"
                value={stats.unique_users}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search generations..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              {statusOptions.map(status => (
                <Option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="User"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('user_id', value)}
              showSearch
            >
              {userOptions.map(user => (
                <Option key={user} value={user}>
                  {user}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates.length === 2) {
                  handleFilterChange('date_from', dates[0]?.toISOString());
                  handleFilterChange('date_to', dates[1]?.toISOString());
                } else {
                  handleFilterChange('date_from', undefined);
                  handleFilterChange('date_to', undefined);
                }
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Button onClick={clearFilters}>Clear</Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={generations}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title={`Generation Details: ${selectedGeneration?.generation_name}`}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (selectedGeneration) {
                handleDownload(selectedGeneration);
                setDetailsModalVisible(false);
              }
            }}
          >
            Download CSV
          </Button>,
        ]}
        width={700}
      >
        {selectedGeneration && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Generation ID:</Text>
                <br />
                <Text>{selectedGeneration.id}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Created By:</Text>
                <br />
                <Text>{selectedGeneration.user_name || 'Anonymous'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Total Records:</Text>
                <br />
                <Text>{selectedGeneration.total_records.toLocaleString()}</Text>
              </Col>
              <Col span={12}>
                <Text strong>File Size:</Text>
                <br />
                <Text>{formatFileSize(selectedGeneration.file_size)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Downloads:</Text>
                <br />
                <Text>{selectedGeneration.download_count_actual}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <br />
                <Tag color={selectedGeneration.status === 'completed' ? 'green' : 'blue'}>
                  {selectedGeneration.status.toUpperCase()}
                </Tag>
              </Col>
            </Row>
            
            <Divider />
            
            <Text strong>Source ZIP Codes ({selectedGeneration.source_zipcodes?.length || 0}):</Text>
            <div style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto' }}>
              {selectedGeneration.source_zipcodes?.map(zip => (
                <Tag key={zip} style={{ margin: '2px' }}>{zip}</Tag>
              ))}
            </div>

            <Divider />

            <Text strong>Filter Criteria:</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px', 
              marginTop: '8px',
              fontSize: '12px'
            }}>
              {JSON.stringify(selectedGeneration.filter_criteria, null, 2)}
            </pre>
          </div>
        )}
      </Modal>

      {/* Download History Modal */}
      <Modal
        title={`Download History: ${selectedGeneration?.generation_name}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={downloadHistory}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'User',
              dataIndex: 'user_name',
              key: 'user_name',
              render: (text: string, record: DownloadRecord) => (
                <div>
                  <Text>{text || 'Anonymous'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {record.user_id}
                  </Text>
                </div>
              ),
            },
            {
              title: 'Downloaded At',
              dataIndex: 'downloaded_at',
              key: 'downloaded_at',
              render: (date: string) => format(new Date(date), 'MMM dd, yyyy HH:mm:ss'),
            },
            {
              title: 'IP Address',
              dataIndex: 'ip_address',
              key: 'ip_address',
              render: (ip: string) => ip || '-',
            },
            {
              title: 'User Agent',
              dataIndex: 'user_agent',
              key: 'user_agent',
              render: (agent: string) => (
                <Tooltip title={agent}>
                  <Text ellipsis style={{ maxWidth: 200 }}>
                    {agent?.substring(0, 50)}...
                  </Text>
                </Tooltip>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default PhoneNumberDashboard;
