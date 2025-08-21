import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, Progress, Space, Divider } from 'antd';
import { 
  FileTextOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  LoadingOutlined,
  UploadOutlined,
  GlobalOutlined,
  BarChartOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { recordApi, RecordStats } from '../api/recordApi';
import { uploadApi, UploadStats } from '../api/uploadApi';
import { useTheme } from '../contexts/ThemeContext';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [recordStats, setRecordStats] = useState<RecordStats | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [recordResponse, uploadResponse] = await Promise.all([
        recordApi.getStats(),
        uploadApi.getUploadStats()
      ]);
      
      setRecordStats(recordResponse.data);
      setUploadStats(uploadResponse.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '100px 24px',
        background: 'transparent'
      }}>
        <Spin size="large" />
        <div style={{ 
          marginTop: '16px', 
          color: isDarkMode ? '#8c8c8c' : '#666666',
          fontSize: '14px'
        }}>
          Loading dashboard data...
        </div>
      </div>
    );
  }

  const successRate = uploadStats && uploadStats.total_uploads > 0 
    ? Math.round((uploadStats.completed_uploads / uploadStats.total_uploads) * 100)
    : 0;

  return (
    <div style={{ padding: '0' }}>
      <div style={{ 
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <Title level={2} style={{ 
          margin: 0,
          color: isDarkMode ? '#ffffff' : '#001529',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          Dashboard Overview
        </Title>
        <div style={{ 
          fontSize: '16px', 
          color: isDarkMode ? '#8c8c8c' : '#666666',
          marginTop: '8px'
        }}>
          Real-time data insights and system performance
        </div>
      </div>
      
      <Row gutter={[24, 24]}>
        {/* Record Statistics */}
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <DatabaseOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Statistic
                title="Total Records"
                value={recordStats?.total_records || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <FileTextOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Statistic
                title="Unique NPAs"
                value={recordStats?.unique_npa || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <GlobalOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <Statistic
                title="Unique States"
                value={recordStats?.unique_states || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <BarChartOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
              <Statistic
                title="Unique ZIPs"
                value={recordStats?.unique_zips || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider style={{ 
        margin: '32px 0',
        borderColor: isDarkMode ? '#303030' : '#f0f0f0'
      }} />

      <Row gutter={[24, 24]}>
        {/* Upload Statistics */}
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <UploadOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Statistic
                title="Total Uploads"
                value={uploadStats?.total_uploads || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Statistic
                title="Completed Uploads"
                value={uploadStats?.completed_uploads || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <LoadingOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <Statistic
                title="Processing Uploads"
                value={uploadStats?.processing_uploads || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <ExclamationCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <Statistic
                title="Failed Uploads"
                value={uploadStats?.failed_uploads || 0}
                valueStyle={{ 
                  color: isDarkMode ? '#ffffff' : '#001529',
                  fontSize: '28px',
                  fontWeight: 700
                }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '32px' }}>
        <Col xs={24} lg={12}>
          <Card 
            hoverable
            style={{ 
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <RiseOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                <Statistic
                  title="Total Records Processed"
                  value={uploadStats?.total_records_processed || 0}
                  valueStyle={{ 
                    color: isDarkMode ? '#ffffff' : '#001529',
                    fontSize: '32px',
                    fontWeight: 700
                  }}
                />
              </div>
              <div>
                <div style={{ 
                  marginBottom: '8px',
                  color: isDarkMode ? '#8c8c8c' : '#666666',
                  fontSize: '14px'
                }}>
                  Upload Success Rate
                </div>
                <Progress 
                  percent={successRate} 
                  status={successRate >= 90 ? 'success' : successRate >= 70 ? 'normal' : 'exception'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  strokeWidth={8}
                />
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            hoverable
            style={{ 
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                <div style={{ 
                  fontSize: '24px',
                  fontWeight: 700,
                  color: isDarkMode ? '#ffffff' : '#001529',
                  marginTop: '8px'
                }}>
                  System Health
                </div>
              </div>
              <div>
                <div style={{ 
                  marginBottom: '16px',
                  color: isDarkMode ? '#8c8c8c' : '#666666',
                  fontSize: '14px'
                }}>
                  Performance Metrics
                </div>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: isDarkMode ? '#8c8c8c' : '#666666' }}>Data Integrity</span>
                    <span style={{ 
                      color: '#52c41a',
                      fontWeight: 600
                    }}>Excellent</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: isDarkMode ? '#8c8c8c' : '#666666' }}>Processing Speed</span>
                    <span style={{ 
                      color: '#1890ff',
                      fontWeight: 600
                    }}>Fast</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: isDarkMode ? '#8c8c8c' : '#666666' }}>System Uptime</span>
                    <span style={{ 
                      color: '#52c41a',
                      fontWeight: 600
                    }}>99.9%</span>
                  </div>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
