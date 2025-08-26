import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Select,
  Card,
  Divider,
  Tag,
  Typography
} from 'antd';
import {
  PhoneOutlined,
  FileTextOutlined,
  UserOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { phoneGenerationApi, GeneratePhoneNumbersRequest } from '../api/phoneGenerationApi';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface PhoneGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (generation: any) => void;
  initialFilters?: any;
  sourceZipcodes?: string[];
  npaRecordsCount?: number;
}

const PhoneGenerationModal: React.FC<PhoneGenerationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialFilters,
  sourceZipcodes = [],
  npaRecordsCount = 0
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      // Prepare preview data
      setPreviewData({
        sourceZipcodes,
        filterCriteria: initialFilters,
        estimatedRecords: npaRecordsCount
      });

      // Auto-populate generation name
      const timestamp = new Date().toLocaleDateString();
      const defaultName = `Phone Numbers ${sourceZipcodes.slice(0, 3).join(', ')}${sourceZipcodes.length > 3 ? '...' : ''} - ${timestamp}`;
      form.setFieldsValue({
        generation_name: defaultName,
        user_name: 'Current User'
      });
    }
  }, [visible, sourceZipcodes, initialFilters, npaRecordsCount, form]);

  const handleGenerate = async (values: any) => {
    setLoading(true);
    try {
      const request: GeneratePhoneNumbersRequest = {
        generation_name: values.generation_name,
        filter_criteria: initialFilters || {},
        user_name: values.user_name
      };

      console.log('🔍 Generating phone numbers with request:', request);

      const response = await phoneGenerationApi.generatePhoneNumbers(request);

      if (response.success) {
        const validationSummary = response.data.validation_summary;
        let successMessage = `Successfully generated ${response.data.phone_numbers_count} phone numbers!`;
        
        if (validationSummary) {
          successMessage += `\n📊 Validation: ${validationSummary.valid_records} valid records processed, ${validationSummary.invalid_records} invalid records skipped`;
          if (validationSummary.duplicate_records > 0) {
            successMessage += `, ${validationSummary.duplicate_records} duplicates skipped`;
          }
        }
        
        message.success(successMessage);
        
        if (onSuccess) {
          onSuccess(response.data.generation);
        }
        
        form.resetFields();
        onClose();
      } else {
        throw new Error('Failed to generate phone numbers');
      }
    } catch (error: any) {
      console.error('Error generating phone numbers:', error);
      message.error(error.response?.data?.message || 'Failed to generate phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const formatFilterCriteria = (filters: any) => {
    if (!filters) return 'No filters applied';
    
    const criteriaList = [];
    
    if (filters.timezone) {
      const timezoneValues = Array.isArray(filters.timezone) 
        ? filters.timezone 
        : [filters.timezone];
      criteriaList.push(`Timezone: ${timezoneValues.join(', ')}`);
    }
    
    if (filters.state) {
      const stateValues = Array.isArray(filters.state) 
        ? filters.state 
        : [filters.state];
      criteriaList.push(`State: ${stateValues.join(', ')}`);
    }
    
    if (filters.city) {
      const cityValues = Array.isArray(filters.city) 
        ? filters.city 
        : [filters.city];
      criteriaList.push(`City: ${cityValues.join(', ')}`);
    }
    
    if (filters.zipcode) {
      criteriaList.push(`Zipcode: ${filters.zipcode}`);
    }
    
    return criteriaList.length > 0 ? criteriaList.join(', ') : 'No specific criteria';
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Generate Phone Numbers
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        style={{ marginTop: '16px' }}
      >
        {/* Generation Preview */}
        <Card 
          size="small" 
          style={{ marginBottom: '24px', backgroundColor: '#f8f9fa' }}
        >
          <Title level={5} style={{ marginBottom: '16px' }}>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            Generation Preview
          </Title>
          
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Source ZIP Codes ({sourceZipcodes.length}):</Text>
            <div style={{ marginTop: '4px' }}>
              {sourceZipcodes.slice(0, 10).map((zip, index) => (
                <Tag key={index} style={{ margin: '2px' }}>{zip}</Tag>
              ))}
              {sourceZipcodes.length > 10 && (
                <Tag style={{ margin: '2px' }}>+{sourceZipcodes.length - 10} more</Tag>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong>Filter Criteria:</Text>
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary">
                <FilterOutlined style={{ marginRight: '4px' }} />
                {formatFilterCriteria(initialFilters)}
              </Text>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong>Estimated Phone Numbers:</Text>
            <div style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '16px', color: '#52c41a' }}>
                <PhoneOutlined style={{ marginRight: '4px' }} />
                ~{(npaRecordsCount * 10000).toLocaleString()} phone numbers
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                Based on {npaRecordsCount} NPA-NXX records × 10,000 potential numbers each
              </Text>
            </div>
          </div>
        </Card>

        {/* Generation Settings */}
        <Form.Item
          label={
            <span>
              <FileTextOutlined style={{ marginRight: '4px' }} />
              Generation Name
            </span>
          }
          name="generation_name"
          rules={[
            { required: true, message: 'Please enter a generation name' },
            { min: 3, message: 'Generation name must be at least 3 characters' },
            { max: 100, message: 'Generation name must be less than 100 characters' }
          ]}
        >
          <Input 
            placeholder="Enter a descriptive name for this phone number generation"
            showCount
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              <UserOutlined style={{ marginRight: '4px' }} />
              Your Name (for tracking)
            </span>
          }
          name="user_name"
          rules={[
            { required: true, message: 'Please enter your name' }
          ]}
        >
          <Input placeholder="Enter your name for download tracking" />
        </Form.Item>

        <Divider />

        {/* Filter Configuration Display */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>
            <FilterOutlined style={{ marginRight: '8px' }} />
            Filter Configuration (Read-Only)
          </Title>
          <TextArea
            value={JSON.stringify(initialFilters || {}, null, 2)}
            rows={6}
            readOnly
            style={{ 
              backgroundColor: '#f5f5f5',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This filter configuration will be saved with the generation for future reference
          </Text>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Generated phone numbers will be available for download as CSV
          </Text>
          
          <div>
            <Button 
              onClick={onClose} 
              style={{ marginRight: '8px' }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
              icon={<PhoneOutlined />}
            >
              {loading ? 'Generating...' : 'Generate Phone Numbers'}
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default PhoneGenerationModal;
