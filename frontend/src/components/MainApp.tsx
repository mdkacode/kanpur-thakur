import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Space, Button, Dropdown, Avatar, Badge, Tooltip } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UploadOutlined,
  TableOutlined,
  HistoryOutlined,
  FilterOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  GlobalOutlined,
  BarChartOutlined,
  SearchOutlined,
  MenuOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import Dashboard from './Dashboard';
import FileUpload from './FileUpload';
import EnhancedDataTable from './EnhancedDataTable';
import UploadHistory from './UploadHistory';
import States from './States';
import DemographicDashboard from './DemographicDashboard';
import ComprehensiveDashboard from './ComprehensiveDashboard';
import ViewRecordsDashboard from './ViewRecordsDashboard';
import PhoneNumberDashboard from './PhoneNumberDashboard';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainApp: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get current route from location
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const selectedKey = currentPath === 'dashboard' ? 'dashboard' : currentPath;

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [sidebarCollapsed]);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: 'Upload File',
    },
    {
      key: 'records',
      icon: <TableOutlined />,
      label: 'Records',
    },
    {
      key: 'view-records',
      icon: <SearchOutlined />,
      label: 'View Records',
    },
    {
      key: 'states',
      icon: <GlobalOutlined />,
      label: 'States',
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: 'Upload History',
    },
    {
      key: 'demographic',
      icon: <BarChartOutlined />,
      label: 'Demographic Data',
    },
    {
      key: 'comprehensive',
      icon: <SearchOutlined />,
      label: 'Comprehensive Dashboard',
    },
    {
      key: 'phone-dashboard',
      icon: <PhoneOutlined />,
      label: 'Phone Numbers',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(`/dashboard/${key}`);
    // Auto-collapse sidebar on mobile after navigation
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    logout();
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<FileUpload onUploadSuccess={handleUploadSuccess} />} />
        <Route path="/records" element={<EnhancedDataTable refreshTrigger={refreshTrigger} />} />
        <Route path="/view-records" element={<ViewRecordsDashboard />} />
        <Route path="/states" element={<States />} />
        <Route path="/history" element={<UploadHistory />} />
        <Route path="/demographic" element={<DemographicDashboard />} />
        <Route path="/comprehensive" element={<ComprehensiveDashboard />} />
        <Route path="/phone-dashboard" element={<PhoneNumberDashboard refreshTrigger={refreshTrigger} />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    );
  };

  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: 'transparent'
    }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={sidebarCollapsed}
        onCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
        trigger={null}
        style={{
          background: isDarkMode ? '#001529' : '#ffffff',
          borderRight: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
          transition: 'all 0.2s ease',
          position: 'fixed',
          height: '100vh',
          zIndex: 1000,
          overflow: 'auto'
        }}
      >
        <div style={{ 
          padding: '24px 16px', 
          textAlign: 'center',
          borderBottom: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
          marginBottom: '16px'
        }}>
          <Title level={3} style={{ 
            color: isDarkMode ? '#ffffff' : '#001529', 
            margin: 0,
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            Kanpur
          </Title>
          <div style={{ 
            fontSize: '12px', 
            color: isDarkMode ? '#8c8c8c' : '#666666',
            marginTop: '4px'
          }}>
            Data Management System
          </div>
        </div>
        <Menu
          theme={isDarkMode ? "dark" : "light"}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 'none',
            background: 'transparent'
          }}
        />
      </Sider>
      
      <Layout style={{ 
        marginLeft: sidebarCollapsed ? 0 : (isMobile ? 0 : 200),
        transition: 'all 0.2s ease',
        width: '100%'
      }}>
        <Header style={{ 
          background: isDarkMode ? '#001529' : '#ffffff', 
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
          position: 'fixed',
          top: 0,
          right: 0,
          left: sidebarCollapsed ? 0 : (isMobile ? 0 : 200),
          zIndex: 999,
          transition: 'all 0.2s ease',
          height: '64px'
        }}>
          <Space>
            <Title level={3} style={{ 
              margin: 0,
              color: isDarkMode ? '#ffffff' : '#001529',
              fontWeight: 600
            }}>
              {menuItems.find(item => item.key === selectedKey)?.label || 'Dashboard'}
            </Title>
          </Space>
          
          <Space size="middle">
            <Tooltip title={sidebarCollapsed ? 'Show Sidebar (Esc)' : 'Hide Sidebar (Esc)'} placement="bottom">
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{ 
                  fontSize: '16px',
                  color: isDarkMode ? '#ffffff' : '#001529'
                }}
              />
            </Tooltip>
            <ThemeToggle />
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ 
                  fontSize: '16px',
                  color: isDarkMode ? '#ffffff' : '#001529'
                }}
              />
            </Badge>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ 
                  fontSize: '16px',
                  color: isDarkMode ? '#ffffff' : '#001529'
                }}
              >
                Admin
              </Button>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px',
          padding: '24px',
          background: 'transparent',
          marginTop: '88px', // Height of header + some spacing
          minHeight: 'calc(100vh - 88px)',
          overflow: 'auto'
        }}>
          {renderContent()}
        </Content>
      </Layout>
      
      {/* Floating Action Button when sidebar is collapsed */}
      {sidebarCollapsed && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 1001
        }}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<MenuOutlined />}
            onClick={() => setSidebarCollapsed(false)}
            title="Show Sidebar"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
        </div>
      )}
    </Layout>
  );
};

export default MainApp;
