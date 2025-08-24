import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DemographicDemo: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🚀 Demo: Upload Your test.csv File</h2>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Follow these steps to test the demographic data upload functionality
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium mb-2">Prepare Your File</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Make sure your <code className={`px-1 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>test.csv</code> file is ready. 
                The first column should contain zipcodes (this will be mapped to the <code className={`px-1 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>zipcode</code> field).
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium mb-2">Upload the File</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Go to the <strong>Upload Data</strong> tab and drag & drop your <code className={`px-1 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>test.csv</code> file, 
                or click "Browse Files" to select it. The system will automatically detect it's a CSV file.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium mb-2">Monitor Processing</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                After clicking "Upload File", you'll get an Upload ID. Go to the <strong>Upload History</strong> tab 
                to monitor the processing status. The system will parse your CSV and insert all records into the database.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-medium mb-2">Explore Your Data</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Once processing is complete, go to the <strong>View Records</strong> tab to search, filter, and explore 
                your demographic data. You can search by zipcode, state, county, or any other criteria.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expected Results */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">📊 Expected Results</h3>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
            <strong>Success:</strong> Your CSV file will be processed and each row will become a record in the 
            <code className={`px-1 rounded ${isDarkMode ? 'bg-green-800' : 'bg-green-200'}`}>demographic_records</code> table. 
            The first column (name) will be stored as the zipcode, and all 86 columns will be preserved.
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">🔧 Troubleshooting</h3>
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <strong>File not uploading?</strong> Check that your file is a valid CSV and under 100MB.
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <strong>Processing stuck?</strong> Check the upload history for error messages or try refreshing the page.
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <strong>No records showing?</strong> Make sure the upload completed successfully and check the records tab.
            </p>
          </div>
        </div>
      </div>

      {/* API Testing */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">🧪 API Testing</h3>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
            You can also test the API endpoints directly:
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <span className="text-blue-500">POST</span> /api/v1/demographic/upload
            </div>
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <span className="text-green-500">GET</span> /api/v1/demographic/status/:id
            </div>
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <span className="text-green-500">GET</span> /api/v1/demographic/records
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicDemo;
