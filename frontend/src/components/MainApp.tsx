import React, { useState } from 'react';
import { Layout, Menu, Typography, Space, Button, Dropdown, Avatar, Badge } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import Dashboard from './Dashboard';
import FileUpload from './FileUpload';
import EnhancedDataTable from './EnhancedDataTable';
import UploadHistory from './UploadHistory';
import States from './States';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainApp: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current route from location
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const selectedKey = currentPath === 'dashboard' ? 'dashboard' : currentPath;

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
      key: 'states',
      icon: <GlobalOutlined />,
      label: 'States',
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: 'Upload History',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(`/dashboard/${key}`);
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
        <Route path="/states" element={<States />} />
        <Route path="/history" element={<UploadHistory />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          background: isDarkMode ? '#001529' : '#ffffff',
          borderRight: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
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
            SheetBC
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
      
      <Layout>
        <Header style={{ 
          background: isDarkMode ? '#001529' : '#ffffff', 
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
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
          minHeight: 'calc(100vh - 112px)'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainApp;
