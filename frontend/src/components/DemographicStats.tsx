import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface StatsData {
  totalUploads: number;
  totalRecords: number;
  statesCount: number;
  recentUploads: number;
}

const DemographicStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalUploads: 0,
    totalRecords: 0,
    statesCount: 0,
    recentUploads: 0,
  });
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch uploads to get count
      const uploadsResponse = await apiClient.get('/demographic/uploads');
      const uploads = uploadsResponse.data;
      
      // Fetch records stats
      const recordsStatsResponse = await apiClient.get('/demographic/records/stats/overview');
      const recordsStats = recordsStatsResponse.data;
      
      // Fetch states count
      const statesResponse = await apiClient.get('/demographic/records/states/list');
      const statesList = statesResponse.data;
      
      setStats({
        totalUploads: uploads.success ? uploads.pagination.total || 0 : 0,
        totalRecords: recordsStats.success ? parseInt(recordsStats.data.total_records) || 0 : 0,
        statesCount: statesList.success ? statesList.data.length || 0 : 0,
        recentUploads: uploads.success ? uploads.data.length || 0 : 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <div className="animate-pulse">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded mr-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <div className={`h-4 rounded mb-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <div className={`h-6 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex items-center">
          <div className="text-3xl mr-4">📤</div>
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Uploads</p>
            <p className="text-2xl font-bold">{stats.totalUploads.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex items-center">
          <div className="text-3xl mr-4">📊</div>
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Records</p>
            <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex items-center">
          <div className="text-3xl mr-4">🏛️</div>
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>States Covered</p>
            <p className="text-2xl font-bold">{stats.statesCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicStats;
