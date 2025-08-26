import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Typography,
  message,
  Row,
  Col,
  DatePicker,
  Card,
  List,
  Popconfirm,
  Tag
} from 'antd';
import {
  SaveOutlined,
  FilterOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { recordFilterApi, RecordFilterConfig, SavedRecordFilter, RecordFilterFormValues } from '../api/recordFilterApi';
import { format } from 'date-fns';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface RecordFilterModalProps {
  visible: boolean;
  onCancel: () => void;
  onApply: (filters: RecordFilterConfig) => void;
  currentFilters: RecordFilterConfig;
  onSaveFilter: (filterName: string, filters: RecordFilterConfig) => void;
}

const RecordFilterModal: React.FC<RecordFilterModalProps> = ({
  visible,
  onCancel,
  onApply,
  currentFilters,
  onSaveFilter
}) => {
  const [form] = Form.useForm();
  const [savedFilters, setSavedFilters] = useState<SavedRecordFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveForm] = Form.useForm();
  const [npaOptions, setNpaOptions] = useState<string[]>([]);
  const [nxxOptions, setNxxOptions] = useState<string[]>([]);
  const [zipOptions, setZipOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadSavedFilters();
      loadFilterOptions();
      form.setFieldsValue(currentFilters);
    }
  }, [visible, currentFilters]);

  const loadFilterOptions = async () => {
    try {
      const [npaRes, nxxRes, zipRes, stateRes, timezoneRes] = await Promise.all([
        recordFilterApi.getUniqueValues('npa'),
        recordFilterApi.getUniqueValues('nxx'),
        recordFilterApi.getUniqueValues('zip'),
        recordFilterApi.getUniqueValues('state_code'),
        recordFilterApi.getUniqueValues('timezone_id')
      ]);
      
      setNpaOptions(npaRes);
      setNxxOptions(nxxRes);
      setZipOptions(zipRes);
      setStateOptions(stateRes);
      setTimezoneOptions(timezoneRes);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const response = await recordFilterApi.getUserFilters();
      if (response.success) {
        setSavedFilters(response.data);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleApply = () => {
    form.validateFields().then((values: RecordFilterFormValues) => {
      // Convert date range to individual fields
      if (values.dateRange && values.dateRange.length === 2) {
        values.date_from = values.dateRange[0].toISOString();
        values.date_to = values.dateRange[1].toISOString();
        delete values.dateRange;
      }

      // Convert form values to filter config
      const filters: RecordFilterConfig = {};
      Object.keys(values).forEach(key => {
        const value = (values as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            (filters as any)[key] = value;
          } else {
            (filters as any)[key] = [value];
          }
        }
      });

      onApply(filters);
      onCancel();
    });
  };

  const handleSaveFilter = async () => {
    try {
      const filterName = saveForm.getFieldValue('name');
      if (!filterName) {
        message.error('Please enter a filter name');
        return;
      }

      const values = form.getFieldsValue() as RecordFilterFormValues;
      
      // Convert date range to individual fields
      if (values.dateRange && values.dateRange.length === 2) {
        values.date_from = values.dateRange[0].toISOString();
        values.date_to = values.dateRange[1].toISOString();
        delete values.dateRange;
      }

      // Convert form values to filter config
      const filterConfig: RecordFilterConfig = {};
      Object.keys(values).forEach(key => {
        const value = (values as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            (filterConfig as any)[key] = value;
          } else {
            (filterConfig as any)[key] = [value];
          }
        }
      });

      const response = await recordFilterApi.createFilter({
        name: filterName,
        filter_config: filterConfig
      });

      if (response.success) {
        message.success('Filter saved successfully!');
        setSaveModalVisible(false);
        saveForm.resetFields();
        loadSavedFilters();
      } else {
        message.error(response.message || 'Failed to save filter');
      }
    } catch (error) {
      console.error('Error saving filter:', error);
      message.error('Failed to save filter');
    }
  };

  const handleLoadFilter = async (filter: SavedRecordFilter) => {
    try {
      const config:any = filter.filter_config;
      
      // Convert arrays back to single values for form
      const formValues: any = {};
      Object.keys(config).forEach(key => {
        const value = config[key];
        if (value && Array.isArray(value)) {
          if (value.length === 1) {
            formValues[key] = value[0];
          } else {
            formValues[key] = value;
          }
        } else {
          formValues[key] = value;
        }
      });

      // Handle date range
      if (config.date_from && config.date_to) {
        formValues.dateRange = [new Date(config.date_from), new Date(config.date_to)];
      }

      form.setFieldsValue(formValues);
      message.success(`Filter "${filter.name}" loaded successfully!`);
    } catch (error) {
      console.error('Error loading filter:', error);
      message.error('Failed to load filter');
    }
  };

  const handleDeleteFilter = async (filterId: number) => {
    try {
      const response = await recordFilterApi.deleteFilter(filterId);
      if (response.success) {
        message.success('Filter deleted successfully!');
        loadSavedFilters();
      } else {
        message.error(response.message || 'Failed to delete filter');
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      message.error('Failed to delete filter');
    }
  };

  const clearFilters = () => {
    form.resetFields();
  };

  return (
    <>
      <Modal
        title="Record Filters"
        open={visible}
        onCancel={onCancel}
        width={800}
        footer={[
          <Button key="clear" onClick={clearFilters}>
            Clear All
          </Button>,
          <Button key="save" icon={<SaveOutlined />} onClick={() => setSaveModalVisible(true)}>
            Save Filter
          </Button>,
          <Button key="apply" type="primary" onClick={handleApply}>
            Apply Filters
          </Button>
        ]}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="npa" label="NPA">
                    <Select
                      mode="multiple"
                      placeholder="Select NPA"
                      allowClear
                      showSearch
                      loading={loading}
                    >
                      {npaOptions.map(npa => (
                        <Option key={npa} value={npa}>{npa}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="nxx" label="NXX">
                    <Select
                      mode="multiple"
                      placeholder="Select NXX"
                      allowClear
                      showSearch
                      loading={loading}
                    >
                      {nxxOptions.map(nxx => (
                        <Option key={nxx} value={nxx}>{nxx}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="zip" label="ZIP Code">
                    <Select
                      mode="multiple"
                      placeholder="Select ZIP"
                      allowClear
                      showSearch
                    >
                      {zipOptions.map(zip => (
                        <Option key={zip} value={zip}>{zip}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="state_code" label="State">
                    <Select
                      mode="multiple"
                      placeholder="Select State"
                      allowClear
                      showSearch
                    >
                      {stateOptions.map(state => (
                        <Option key={state} value={state}>{state}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="timezone_id" label="Timezone">
                    <Select
                      mode="multiple"
                      placeholder="Select Timezone"
                      allowClear
                      showSearch
                    >
                      {timezoneOptions.map(timezone => (
                        <Option key={timezone} value={timezone}>{timezone}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="city" label="City">
                    <Input placeholder="Enter city name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="rc" label="Rate Center">
                    <Input placeholder="Enter rate center" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="dateRange" label="Date Range">
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="search" label="Search">
                    <Input placeholder="Search in all fields" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Col>

          <Col span={8}>
            <Card title="Saved Filters" size="small">
              <List
                size="small"
                dataSource={savedFilters}
                renderItem={(filter) => (
                  <List.Item
                    actions={[
                      <Button
                        key="load"
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleLoadFilter(filter)}
                      >
                        Load
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="Are you sure you want to delete this filter?"
                        onConfirm={() => handleDeleteFilter(filter.id)}
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={filter.name}
                      description={`Created ${format(new Date(filter.created_at), 'MMM dd, yyyy')}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Modal>

      <Modal
        title="Save Filter"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onOk={handleSaveFilter}
        okText="Save"
      >
        <Form form={saveForm} layout="vertical">
          <Form.Item
            name="name"
            label="Filter Name"
            rules={[{ required: true, message: 'Please enter a filter name' }]}
          >
            <Input placeholder="Enter filter name" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RecordFilterModal;
