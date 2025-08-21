import React, { useState, useEffect } from 'react';
import { Table, Input, Space, Button, Card, Tag, Typography, Select, Tooltip, Modal, Form, message } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { stateApi, State } from '../api/stateApi';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

const States: React.FC = () => {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [form] = Form.useForm();

  const fetchStates = async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const response = await stateApi.getAllStates(
        page,
        pageSize,
        regionFilter,
        searchText
      );
      setStates(response.data);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: response.pagination.total,
      }));
    } catch (error) {
      message.error('Failed to fetch states');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await stateApi.getRegions();
      setRegions(response.data);
    } catch (error) {
      message.error('Failed to fetch regions');
    }
  };

  useEffect(() => {
    fetchStates();
    fetchRegions();
  }, []);

  useEffect(() => {
    fetchStates(1, pagination.pageSize);
  }, [searchText, regionFilter]);

  const handleTableChange = (pagination: any) => {
    fetchStates(pagination.current, pagination.pageSize);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRegionFilter = (value: string) => {
    setRegionFilter(value);
  };

  const handleRefresh = () => {
    setSearchText('');
    setRegionFilter('');
    fetchStates(1, pagination.pageSize);
  };

  const handleAdd = () => {
    setEditingState(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: State) => {
    setEditingState(record);
    form.setFieldsValue({
      state_code: record.state_code,
      state_name: record.state_name,
      region: record.region,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await stateApi.deleteState(id);
      message.success('State deleted successfully');
      fetchStates(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Failed to delete state');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingState) {
        await stateApi.updateState(editingState.id, values);
        message.success('State updated successfully');
      } else {
        await stateApi.createState(values);
        message.success('State created successfully');
      }
      setIsModalVisible(false);
      fetchStates(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Failed to save state');
    }
  };

  const columns = [
    {
      title: 'State Code',
      dataIndex: 'state_code',
      key: 'state_code',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'State Name',
      dataIndex: 'state_name',
      key: 'state_name',
      sorter: true,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      width: 150,
      render: (text: string) => <Tag color="green">{text}</Tag>,
      filters: regions.map(region => ({ text: region, value: region })),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: State) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card title={<Title level={3}>States Management</Title>}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Search
          placeholder="Search states..."
          allowClear
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Filter by region"
          allowClear
          style={{ width: 200 }}
          onChange={handleRegionFilter}
          value={regionFilter}
        >
          {regions.map(region => (
            <Option key={region} value={region}>
              {region}
            </Option>
          ))}
        </Select>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Add State
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={states}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingState ? 'Edit State' : 'Add State'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ region: '' }}
        >
          <Form.Item
            name="state_code"
            label="State Code"
            rules={[
              { required: true, message: 'Please enter state code' },
              { max: 2, message: 'State code must be 2 characters' },
            ]}
          >
            <Input placeholder="e.g., CA" maxLength={2} />
          </Form.Item>
          <Form.Item
            name="state_name"
            label="State Name"
            rules={[
              { required: true, message: 'Please enter state name' },
            ]}
          >
            <Input placeholder="e.g., California" />
          </Form.Item>
          <Form.Item
            name="region"
            label="Region"
          >
            <Select placeholder="Select region">
              {regions.map(region => (
                <Option key={region} value={region}>
                  {region}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default States;
