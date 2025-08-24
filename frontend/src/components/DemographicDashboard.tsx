import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DemographicUpload from './DemographicUpload';
import DemographicUploadHistory from './DemographicUploadHistory';
import DemographicRecords from './DemographicRecords';
import DemographicStats from './DemographicStats';
import DemographicDemo from './DemographicDemo';
type TabType = 'upload' | 'history' | 'records' | 'demo';

const DemographicDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('demo');
  const { isDarkMode } = useTheme();

  const tabs = [
    { id: 'demo', label: 'Demo Guide', icon: '🚀' },
    { id: 'upload', label: 'Upload Data', icon: '📤' },
    { id: 'history', label: 'Upload History', icon: '📋' },
    { id: 'records', label: 'View Records', icon: '🔍' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'demo':
        return <DemographicDemo />;
      case 'upload':
        return <DemographicUpload />;
      case 'history':
        return <DemographicUploadHistory />;
      case 'records':
        return <DemographicRecords />;

      default:
        return <DemographicDemo />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📊 Demographic Data Management
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload, manage, and explore demographic and geographic data from CSV files
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Quick Overview
          </h2>
          <DemographicStats />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? isDarkMode
                        ? 'border-blue-500 text-blue-400'
                        : 'border-blue-500 text-blue-600'
                      : isDarkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {renderActiveTab()}
        </div>

        {/* Help Section */}
        <div className="mt-12">
          <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <h3 className="text-xl font-bold mb-4">💡 How to Use</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">1. Upload Data</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Upload your CSV file containing demographic data. The first column should contain zipcodes.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Monitor Progress</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Check the upload history to monitor processing status and view any errors.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Explore Data</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Search and filter through your demographic records by zipcode, state, or county.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Requirements */}
        <div className="mt-8">
          <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <h3 className="text-xl font-bold mb-4">📋 File Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Required Format</h4>
                <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li>• CSV file format only</li>
                  <li>• First column must contain zipcodes</li>
                  <li>• Maximum file size: 100MB</li>
                  <li>• UTF-8 encoding recommended</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Expected Columns</h4>
                <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li>• name (zipcode), state, county, city</li>
                  <li>• mhhi, avg_hhi, pc_income</li>
                  <li>• age distributions, race/ethnicity</li>
                  <li>• education, housing, employment data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicDashboard;
