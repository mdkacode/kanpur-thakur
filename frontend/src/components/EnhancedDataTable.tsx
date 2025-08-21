import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Input, 
  Space, 
  Button, 
  Card, 
  Tag, 
  Typography, 
  Select, 
  Tooltip, 
  Modal, 
  Form, 
  DatePicker, 
  Row, 
  Col,
  message,
  Popconfirm,
  Statistic
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  FilterOutlined, 
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { recordApi, Record } from '../api/recordApi';
import { downloadApi, CSVExportRequest } from '../api/downloadApi';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface EnhancedDataTableProps {
  refreshTrigger?: number;
}

const EnhancedDataTable: React.FC<EnhancedDataTableProps> = ({ refreshTrigger }) => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [downloadHistoryVisible, setDownloadHistoryVisible] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<any[]>([]);
  const [downloadStats, setDownloadStats] = useState<any>(null);
  const [form] = Form.useForm();

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
  const [activeFilters, setActiveFilters] = useState<any>({});

  const fetchRecords = async (page = 1, pageSize = 50, search?: string, filters?: any) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching records with filters:', { search, filters, page, pageSize, sortBy, sortOrder });

      const response = await recordApi.getAllRecords(page, pageSize, search, sortBy, sortOrder, filters);
      
      setRecords(response.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.pagination.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching records:', error);
      message.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadHistory = async () => {
    try {
      const response = await downloadApi.getAllDownloads();
      setDownloadHistory(response.data);
    } catch (error) {
      console.error('Error fetching download history:', error);
    }
  };

  const fetchDownloadStats = async () => {
    try {
      const response = await downloadApi.getDownloadStats();
      setDownloadStats(response.data);
    } catch (error) {
      console.error('Error fetching download stats:', error);
    }
  };

  useEffect(() => {
    fetchRecords(pagination.current, pagination.pageSize, searchText, activeFilters);
  }, [refreshTrigger, sortBy, sortOrder, activeFilters]);

  useEffect(() => {
    if (downloadHistoryVisible) {
      fetchDownloadHistory();
      fetchDownloadStats();
    }
  }, [downloadHistoryVisible]);

  const handleTableChange = (newPagination: any, filters: any, sorter: any) => {
    const newSortBy = sorter.field || 'created_at';
    const newSortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC';
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    fetchRecords(newPagination.current, newPagination.pageSize, searchText, activeFilters);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRecords(1, pagination.pageSize, value, activeFilters);
  };

  const handleRefresh = () => {
    fetchRecords(pagination.current, pagination.pageSize, searchText, activeFilters);
  };

  const handleFilterSubmit = (values: any) => {
    const filters = { ...values };
    
    // Convert date range to ISO strings
    if (values.dateRange && values.dateRange.length === 2) {
      filters.date_from = values.dateRange[0].toISOString();
      filters.date_to = values.dateRange[1].toISOString();
      delete filters.dateRange;
    }

    // Remove empty values
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    setActiveFilters(filters);
    setFilterModalVisible(false);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRecords(1, pagination.pageSize, searchText, filters);
    // Don't reset form immediately - let the user see their applied filters
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const exportRequest: CSVExportRequest = {
        search: searchText,
        sortBy,
        sortOrder,
        filters: activeFilters,
        filterName: `Export_${new Date().toISOString().split('T')[0]}`
      };

      const response = await downloadApi.exportToCSV(exportRequest);
      
      if (response.success) {
        downloadApi.downloadCSV(response.data.csv, response.data.filename);
        message.success(`CSV exported successfully! ${response.data.recordCount} records`);
      } else {
        message.error(response.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setActiveFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchRecords(1, pagination.pageSize, searchText, {});
  };

  const getActiveFiltersCount = () => {
    return Object.keys(activeFilters).length;
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
    },
    {
      title: 'NXX',
      dataIndex: 'nxx',
      key: 'nxx',
      width: 100,
      sorter: true,
    },
    {
      title: 'ZIP',
      dataIndex: 'zip',
      key: 'zip',
      width: 120,
      sorter: true,
    },
    {
      title: 'State',
      dataIndex: 'state_code',
      key: 'state_code',
      width: 100,
      sorter: true,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 200,
      sorter: true,
    },
    {
      title: 'RC',
      dataIndex: 'rc',
      key: 'rc',
      width: 200,
      sorter: true,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: true,
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy'),
    },
  ];

  const downloadHistoryColumns = [
    {
      title: 'Filter Name',
      dataIndex: 'filter_name',
      key: 'filter_name',
    },
    {
      title: 'Download Count',
      dataIndex: 'download_count',
      key: 'download_count',
      sorter: true,
    },
    {
      title: 'Records',
      dataIndex: 'total_records',
      key: 'total_records',
      sorter: true,
    },
    {
      title: 'File Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => `${(size / 1024).toFixed(1)} KB`,
    },
    {
      title: 'Last Downloaded',
      dataIndex: 'last_downloaded_at',
      key: 'last_downloaded_at',
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Tooltip title="View Filter Criteria">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => {
                Modal.info({
                  title: 'Filter Criteria',
                  content: (
                    <pre>{JSON.stringify(record.filter_criteria, null, 2)}</pre>
                  ),
                  width: 600,
                });
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this download record?"
            onConfirm={async () => {
              try {
                await downloadApi.deleteDownload(record.id);
                message.success('Download record deleted');
                fetchDownloadHistory();
              } catch (error) {
                message.error('Failed to delete download record');
              }
            }}
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Search
                placeholder="Search records..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ maxWidth: 400 }}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterModalVisible(true)}
                  type={getActiveFiltersCount() > 0 ? 'primary' : 'default'}
                >
                  Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
                </Button>
                {getActiveFiltersCount() > 0 && (
                  <Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Active: {Object.keys(activeFilters).join(', ')}
                    </Text>
                    <Button 
                      size="small" 
                      onClick={clearFilters}
                      type="text"
                      danger
                    >
                      Clear All
                    </Button>
                  </Space>
                )}
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportCSV}
                  loading={exportLoading}
                  type="primary"
                >
                  Export CSV
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setDownloadHistoryVisible(true)}
                >
                  Download History
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Filter Modal */}
              <Modal
          title="Advanced Filters"
          open={filterModalVisible}
          onCancel={() => {
            setFilterModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFilterSubmit}
          initialValues={activeFilters}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="npa" label="NPA">
                <Input placeholder="Enter NPA" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nxx" label="NXX">
                <Input placeholder="Enter NXX" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="zip" label="ZIP Code">
                <Input placeholder="Enter ZIP" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state_code" label="State">
                <Input placeholder="Enter State Code" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="Enter City" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rc" label="RC">
                <Input placeholder="Enter RC" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="dateRange" label="Date Range">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Apply Filters
              </Button>
              <Button onClick={clearFilters}>
                Clear All
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Download History Modal */}
      <Modal
        title="Download History & Statistics"
        open={downloadHistoryVisible}
        onCancel={() => setDownloadHistoryVisible(false)}
        footer={null}
        width={1000}
      >
        {downloadStats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic title="Total Downloads" value={downloadStats.total_downloads} />
            </Col>
            <Col span={6}>
              <Statistic title="Total Records Downloaded" value={downloadStats.total_records_downloaded} />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Downloads/Filter" value={downloadStats.avg_downloads_per_filter?.toFixed(1)} />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Last Download" 
                value={downloadStats.last_download ? format(new Date(downloadStats.last_download), 'MMM dd, yyyy') : 'Never'} 
              />
            </Col>
          </Row>
        )}
        
        <Table
          columns={downloadHistoryColumns}
          dataSource={downloadHistory}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default EnhancedDataTable;
