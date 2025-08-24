import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Row, 
  Col, 
  Button, 
  Input, 
  Select, 
  InputNumber, 
  Space, 
  Divider, 
  Collapse, 
  Typography, 
  Popconfirm, 
  Tooltip, 
  message 
} from 'antd';
import { 
  FilterOutlined, 
  SaveOutlined, 
  ReloadOutlined, 
  BookFilled, 
  DeleteOutlined 
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { filterApi, FilterConfig, SavedFilter } from '../api/filterApi';

const { Panel } = Collapse;
const { Text } = Typography;

interface FilterOptions {
  [field: string]: string[] | { min: number; max: number };
}

interface AdvancedFiltersProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading?: boolean;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  onApplyFilters, 
  onClearFilters,
  loading = false 
}) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const [form] = Form.useForm();

  useEffect(() => {
    loadFilterOptions();
    loadSavedFilters();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      const options = await filterApi.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      message.error('Failed to load filter options');
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const response = await filterApi.getUserFilters('demographic');
      if (response.success) {
        setSavedFilters(response.data);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  };

  const handleFilterChange = (changedValues: any, allValues: any) => {
    // Clean up empty values
    const cleanedFilters = Object.fromEntries(
      Object.entries(allValues).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    );
    onFiltersChange(cleanedFilters);
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      message.error('Please enter a filter name');
      return;
    }

    try {
      await filterApi.createFilter({
        name: filterName,
        filter_type: 'demographic',
        filter_config: filters
      });
      message.success('Filter saved successfully');
      setFilterName('');
      setSaveModalVisible(false);
      loadSavedFilters();
    } catch (error) {
      message.error('Failed to save filter');
    }
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    onFiltersChange(filter.filter_config);
    form.setFieldsValue(filter.filter_config);
    message.success(`Loaded filter: ${filter.name}`);
  };

  const handleDeleteFilter = async (filterId: number) => {
    try {
      await filterApi.deleteFilter(filterId);
      message.success('Filter deleted successfully');
      loadSavedFilters();
    } catch (error) {
      message.error('Failed to delete filter');
    }
  };

  const clearAllFilters = () => {
    form.resetFields();
    onClearFilters();
  };

  const renderRangeFilter = (field: string, label: string, range: { min: number; max: number }) => (
    <Col span={12} key={field}>
      <Form.Item label={label} style={{ marginBottom: '8px' }}>
        <Row gutter={4}>
          <Col span={12}>
            <Form.Item name={`${field}_min`} style={{ marginBottom: '4px' }}>
              <InputNumber
                placeholder="Min"
                min={range.min}
                max={range.max}
                size="small"
                style={{ width: '100%' }}
                parser={(value) => {
                  const parsed = value?.replace(/[^\d.-]/g, '');
                  return parsed ? parseFloat(parsed) : 0;
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={`${field}_max`} style={{ marginBottom: '4px' }}>
              <InputNumber
                placeholder="Max"
                min={range.min}
                max={range.max}
                size="small"
                style={{ width: '100%' }}
                parser={(value) => {
                  const parsed = value?.replace(/[^\d.-]/g, '');
                  return parsed ? parseFloat(parsed) : 0;
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>
    </Col>
  );

  const renderDropdownFilter = (field: string, label: string, options: string[]) => (
    <Col span={12} key={field}>
      <Form.Item label={label} style={{ marginBottom: '8px' }}>
        <Form.Item name={field} style={{ marginBottom: '4px' }}>
          <Select
            placeholder={`Select ${label}`}
            size="small"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={options.map(option => ({ value: option, label: option }))}
          />
        </Form.Item>
      </Form.Item>
    </Col>
  );

  if (loadingOptions) {
    return (
      <Card size="small" className={`${isDarkMode ? 'dark' : 'light'}`}>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading filter options...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Advanced Filters" 
      size="small"
      className={`advanced-filters ${isDarkMode ? 'dark' : 'light'}`}
      extra={
        <Space size="small">
          <Button
            size="small"
            icon={<SaveOutlined />}
            onClick={() => setSaveModalVisible(true)}
            disabled={Object.keys(filters).length === 0}
          >
            Save
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadSavedFilters}
          >
            Refresh
          </Button>
        </Space>
      }
    >
      <Form 
        form={form} 
        layout="vertical" 
        size="small"
        onValuesChange={handleFilterChange} 
        initialValues={filters}
      >
        {/* Basic Location Filters */}
        <Row gutter={8}>
          {filterOptions.state && renderDropdownFilter('state', 'State', filterOptions.state as string[])}
          {filterOptions.county && renderDropdownFilter('county', 'County', filterOptions.county as string[])}
          {filterOptions.city && renderDropdownFilter('city', 'City', filterOptions.city as string[])}
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* Collapsible Advanced Filters */}
        <Collapse
          ghost
          size="small"
          defaultActiveKey={['income', 'demographics', 'households', 'education', 'housing']}
          className="advanced-filters-collapse"
        >
          {/* Income & Economic Filters */}
          <Panel header="Income & Economic" key="income">
            <Row gutter={8}>
              {filterOptions.mhhi && renderRangeFilter('mhhi', 'Median HHI', filterOptions.mhhi as { min: number; max: number })}
              {filterOptions.avg_hhi && renderRangeFilter('avg_hhi', 'Avg HHI', filterOptions.avg_hhi as { min: number; max: number })}
              {filterOptions.pc_income && renderRangeFilter('pc_income', 'Per Capita', filterOptions.pc_income as { min: number; max: number })}
              {filterOptions.pct_hh_w_income_200k_plus && renderRangeFilter('pct_hh_w_income_200k_plus', '$200k+ %', filterOptions.pct_hh_w_income_200k_plus as { min: number; max: number })}
            </Row>
          </Panel>

          {/* Demographics & Age Filters */}
          <Panel header="Demographics & Age" key="demographics">
            <Row gutter={8}>
              {filterOptions.median_age && renderRangeFilter('median_age', 'Median Age', filterOptions.median_age as { min: number; max: number })}
              {filterOptions.pop_dens_sq_mi && renderRangeFilter('pop_dens_sq_mi', 'Pop Density', filterOptions.pop_dens_sq_mi as { min: number; max: number })}
              {filterOptions.race_ethnicity_white && renderRangeFilter('race_ethnicity_white', 'White Pop', filterOptions.race_ethnicity_white as { min: number; max: number })}
              {filterOptions.race_ethnicity_black && renderRangeFilter('race_ethnicity_black', 'Black Pop', filterOptions.race_ethnicity_black as { min: number; max: number })}
              {filterOptions.race_ethnicity_hispanic && renderRangeFilter('race_ethnicity_hispanic', 'Hispanic Pop', filterOptions.race_ethnicity_hispanic as { min: number; max: number })}
            </Row>
          </Panel>

          {/* Household & Family Filters */}
          <Panel header="Households & Family" key="households">
            <Row gutter={8}>
              {filterOptions.households && renderRangeFilter('households', 'Total HH', filterOptions.households as { min: number; max: number })}
              {filterOptions.family_hh_total && renderRangeFilter('family_hh_total', 'Family HH', filterOptions.family_hh_total as { min: number; max: number })}
            </Row>
          </Panel>

          {/* Education & Employment Filters */}
          <Panel header="Education & Employment" key="education">
            <Row gutter={8}>
              {filterOptions.edu_att_bachelors && renderRangeFilter('edu_att_bachelors', "Bachelor's", filterOptions.edu_att_bachelors as { min: number; max: number })}
              {filterOptions.unemployment_pct && renderRangeFilter('unemployment_pct', 'Unemployment %', filterOptions.unemployment_pct as { min: number; max: number })}
            </Row>
          </Panel>

          {/* Housing Filters */}
          <Panel header="Housing" key="housing">
            <Row gutter={8}>
              {filterOptions.housing_units && renderRangeFilter('housing_units', 'Total Units', filterOptions.housing_units as { min: number; max: number })}
              {filterOptions.owner_occupied && renderRangeFilter('owner_occupied', 'Owner Occupied', filterOptions.owner_occupied as { min: number; max: number })}
            </Row>
          </Panel>
        </Collapse>

        {/* Action Buttons */}
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={8}>
          <Col span={12}>
            <Button 
              type="primary" 
              icon={<FilterOutlined />} 
              onClick={onApplyFilters}
              loading={loading}
              size="small"
              style={{ width: '100%' }}
            >
              Apply
            </Button>
          </Col>
          <Col span={12}>
            <Button 
              onClick={clearAllFilters}
              size="small"
              style={{ width: '100%' }}
            >
              Clear All
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Saved Filters Section */}
      {savedFilters.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Text strong style={{ fontSize: '12px' }}>Saved Filters</Text>
          <div className="flex flex-wrap gap-1 mt-2">
            {savedFilters.map(filter => (
              <div key={filter.id.toString()} className="flex items-center gap-1">
                <Button
                  size="small"
                  icon={<BookFilled />}
                  onClick={() => handleLoadFilter(filter)}
                  style={{ fontSize: '11px', padding: '0 6px' }}
                >
                  {filter.name}
                </Button>
                <Tooltip title="Delete">
                  <Popconfirm
                    title="Delete this filter?"
                    onConfirm={() => handleDeleteFilter(filter.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ fontSize: '11px', padding: '0 6px' }}
                    />
                  </Popconfirm>
                </Tooltip>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Save Filter Modal */}
      {saveModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Text strong style={{ fontSize: '14px' }}>Save Filter</Text>
            <Input
              placeholder="Enter filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="mb-3"
              size="small"
            />
            <Space>
              <Button type="primary" onClick={handleSaveFilter} size="small">
                Save
              </Button>
              <Button onClick={() => setSaveModalVisible(false)} size="small">
                Cancel
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdvancedFilters;