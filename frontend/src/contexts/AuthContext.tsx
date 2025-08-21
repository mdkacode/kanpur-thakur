import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking authentication status...');
      const response = await apiClient.get('/verify');
      console.log('✅ Auth check response:', response.data);
      
      if (response.data.success && response.data.data?.authenticated) {
        setIsAuthenticated(true);
        console.log('✅ User is authenticated');
      } else {
        setIsAuthenticated(false);
        console.log('❌ User is not authenticated');
      }
    } catch (error: any) {
      console.log('❌ Auth check failed:', error.response?.status, error.response?.data);
      // Token is invalid or expired
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiClient.post('/login', { pin });
      
      if (response.data.success) {
        // Store token in localStorage as backup
        if (response.data.data?.token) {
          localStorage.setItem('authToken', response.data.data.token);
        }
        setIsAuthenticated(true);
        message.success('Login successful!');
        navigate('/dashboard');
        return true;
      } else {
        message.error(response.data.message || 'Login failed');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout');
      // Clear localStorage token
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      message.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still set as logged out even if API call fails
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
