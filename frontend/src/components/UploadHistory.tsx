import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Space, Typography, Modal, message } from 'antd';
import { DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { uploadApi, UploadStatus } from '../api/uploadApi';
import { format } from 'date-fns';

const { Text, Title } = Typography;

const UploadHistory: React.FC = () => {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  const fetchUploads = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await uploadApi.getAllUploads(page, pageSize);
      setUploads(response.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error('Error fetching uploads:', error);
      message.error('Failed to fetch upload history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleTableChange = (newPagination: any) => {
    fetchUploads(newPagination.current, newPagination.pageSize);
  };

  const handleDelete = async (uploadId: number) => {
    Modal.confirm({
      title: 'Delete Upload',
      content: 'Are you sure you want to delete this upload? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await uploadApi.deleteUpload(uploadId);
          message.success('Upload deleted successfully');
          fetchUploads(pagination.current, pagination.pageSize);
        } catch (error) {
          console.error('Error deleting upload:', error);
          message.error('Failed to delete upload');
        }
      },
    });
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      processing: { color: 'processing', text: 'Processing' },
      completed: { color: 'success', text: 'Completed' },
      failed: { color: 'error', text: 'Failed' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Filename',
      dataIndex: 'original_name',
      key: 'original_name',
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Records',
      dataIndex: 'records_count',
      key: 'records_count',
      width: 100,
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => format(new Date(date), 'MMM dd, yyyy HH:mm'),
    },
    {
      title: 'Completed',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 150,
      render: (date: string) => 
        date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record: UploadStatus) => (
        <Space>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            danger
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>Upload History</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchUploads(pagination.current, pagination.pageSize)}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
        </Space>
      }
      style={{ margin: '16px 0' }}
    >
      <Table
        columns={columns}
        dataSource={uploads}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
        size="middle"
      />
    </Card>
  );
};

export default UploadHistory;
