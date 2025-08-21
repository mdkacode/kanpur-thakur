import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const setTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
  };

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Update document class for global CSS
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);
  }, [isDarkMode]);

  // Ant Design theme configuration
  const antdTheme = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? '#1890ff' : '#1677ff',
      colorSuccess: isDarkMode ? '#52c41a' : '#52c41a',
      colorWarning: isDarkMode ? '#faad14' : '#faad14',
      colorError: isDarkMode ? '#ff4d4f' : '#ff4d4f',
      colorInfo: isDarkMode ? '#1890ff' : '#1677ff',
      borderRadius: 8,
      wireframe: false,
    },
    components: {
      Layout: {
        headerBg: isDarkMode ? '#001529' : '#ffffff',
        siderBg: isDarkMode ? '#001529' : '#ffffff',
        bodyBg: isDarkMode ? '#141414' : '#f5f5f5',
      },
      Card: {
        headerBg: isDarkMode ? '#1f1f1f' : '#ffffff',
        headerColor: isDarkMode ? '#ffffff' : '#000000',
      },
      Table: {
        headerBg: isDarkMode ? '#1f1f1f' : '#fafafa',
        headerColor: isDarkMode ? '#ffffff' : '#000000',
        rowHoverBg: isDarkMode ? '#262626' : '#f5f5f5',
      },
      Button: {
        borderRadius: 6,
        controlHeight: 36,
      },
      Input: {
        borderRadius: 6,
        controlHeight: 36,
      },
      Select: {
        borderRadius: 6,
        controlHeight: 36,
      },
      Modal: {
        borderRadius: 12,
      },
    },
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme }}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
