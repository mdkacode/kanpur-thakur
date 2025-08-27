import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Drawer,
  List,
  Typography,
  Badge,
  Tooltip,
  Progress,
  Empty,
  Spin,
  message
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import apiClient from '../api/client';
// import apiClient from '../api/apiClient';

const { Text, Title } = Typography;

interface ProcessingSession {
  id: number;
  session_id: string;
  user_id: number;
  filter_id: number;
  filter_name: string;
  filter_description: string;
  filter_criteria: any;
  source_zipcodes: string[];
  total_records: number;
  processed_records: number;
  status: string;
  session_type: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  generated_files_count: number;
  generated_files?: GeneratedFile[];
}

interface GeneratedFile {
  id: number;
  session_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  record_count: number;
  description: string;
  created_at: string;
}

interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  processing_sessions: number;
  failed_sessions: number;
  total_records_processed: number;
  avg_records_per_session: number;
  unique_users: number;
}

const ProcessingSessionsTab: React.FC = () => {
  const [sessions, setSessions] = useState<ProcessingSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ProcessingSession | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  const fetchSessions = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/processing/sessions', {
        params: {
          page,
          limit: pagination.pageSize
        }
      });

      if (response.data.success) {
        setSessions(response.data.sessions);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: response.data.pagination.total
        }));
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      message.error('Failed to fetch processing sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/processing/sessions/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/processing/sessions/${sessionId}`);
      if (response.data.success) {
        setSelectedSession(response.data.session);
        setDrawerVisible(true);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
      message.error('Failed to fetch session details');
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'processing';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined />;
      case 'processing':
        return <ClockCircleOutlined />;
      case 'failed':
        return <ExclamationCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const columns = [
    {
      title: 'Session ID',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 200,
      render: (sessionId: string) => (
        <Tooltip title={sessionId}>
          <Text code style={{ fontSize: '12px' }}>
            {sessionId.substring(0, 8)}...
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Type',
      dataIndex: 'session_type',
      key: 'session_type',
      width: 120,
      render: (sessionType: string) => {
        const typeMap: { [key: string]: string } = {
          'npa_nxx_processing': 'NPA NXX',
          'python_script_processing': 'Python Script',
          'batch_python_processing': 'Batch Python',
          'demographic_upload': 'Demographic Upload'
        };
        return typeMap[sessionType] || sessionType;
      }
    },
    {
      title: 'Zipcodes',
      dataIndex: 'source_zipcodes',
      key: 'source_zipcodes',
      width: 120,
      render: (zipcodes: string[]) => (
        <Tooltip title={zipcodes.join(', ')}>
          <Text>{zipcodes.length} zipcode{zipcodes.length !== 1 ? 's' : ''}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Filter',
      dataIndex: 'filter_name',
      key: 'filter_name',
      width: 150,
      render: (filterName: string) => filterName || 'Custom Filter'
    },
    {
      title: 'Records',
      key: 'records',
      width: 120,
      render: (record: ProcessingSession) => (
        <Space direction="vertical" size={0}>
          <Text>{record.processed_records.toLocaleString()}</Text>
          {record.total_records > 0 && (
            <Progress
              percent={Math.round((record.processed_records / record.total_records) * 100)}
              size="small"
              showInfo={false}
            />
          )}
        </Space>
      )
    },
    {
      title: 'Files',
      dataIndex: 'generated_files_count',
      key: 'generated_files_count',
      width: 80,
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }}>
          <FileTextOutlined style={{ fontSize: '16px' }} />
        </Badge>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => format(new Date(date), 'MMM dd, HH:mm')
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (record: ProcessingSession) => {
        if (record.status === 'processing') {
          return <Text type="secondary">Running...</Text>;
        }
        if (record.completed_at) {
          const duration = Math.round(
            (new Date(record.completed_at).getTime() - new Date(record.created_at).getTime()) / 1000
          );
          return formatDuration(duration);
        }
        return '-';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record: ProcessingSession) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => fetchSessionDetails(record.session_id)}
          >
            Details
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Sessions"
                value={stats.total_sessions}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed_sessions}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Processing"
                value={stats.processing_sessions}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Records Processed"
                value={stats.total_records_processed.toLocaleString()}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Sessions Table */}
      <Card
        title="Processing Sessions"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchSessions();
              fetchStats();
            }}
          >
            Refresh
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="session_id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: fetchSessions,
            showSizeChanger: false
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Session Details Drawer */}
      <Drawer
        title="Session Details"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedSession && (
          <div>
            <Title level={4}>Session Information</Title>
            <List
              size="small"
              dataSource={[
                { label: 'Session ID', value: selectedSession.session_id },
                { label: 'Filter', value: selectedSession.filter_name || 'Custom Filter' },
                { label: 'Status', value: selectedSession.status.toUpperCase() },
                { label: 'Type', value: selectedSession.session_type },
                { label: 'Created', value: format(new Date(selectedSession.created_at), 'PPP p') },
                { label: 'Updated', value: format(new Date(selectedSession.updated_at), 'PPP p') },
                { label: 'Zipcodes', value: selectedSession.source_zipcodes.join(', ') },
                { label: 'Records Processed', value: selectedSession.processed_records.toLocaleString() },
                { label: 'Total Records', value: selectedSession.total_records.toLocaleString() }
              ]}
              renderItem={item => (
                <List.Item>
                  <Text strong>{item.label}:</Text> {item.value}
                </List.Item>
              )}
            />

            {selectedSession.filter_criteria && (
              <>
                <Title level={4} style={{ marginTop: 24 }}>Filter Criteria</Title>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: '12px' }}>
                  {JSON.stringify(selectedSession.filter_criteria, null, 2)}
                </pre>
              </>
            )}

            {selectedSession.generated_files && selectedSession.generated_files.length > 0 && (
              <>
                <Title level={4} style={{ marginTop: 24 }}>Generated Files</Title>
                <List
                  dataSource={selectedSession.generated_files}
                  renderItem={file => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            // Handle file download
                            message.info('Download functionality to be implemented');
                          }}
                        >
                          Download
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={file.file_name}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{file.description}</Text>
                            <Text type="secondary">
                              {formatFileSize(file.file_size)} • {file.record_count.toLocaleString()} records
                            </Text>
                            <Text type="secondary">
                              {format(new Date(file.created_at), 'MMM dd, yyyy HH:mm')}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}

            {selectedSession.error_message && (
              <>
                <Title level={4} style={{ marginTop: 24, color: '#ff4d4f' }}>Error</Title>
                <Text type="danger">{selectedSession.error_message}</Text>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ProcessingSessionsTab;
