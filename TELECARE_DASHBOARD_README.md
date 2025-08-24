# 🚀 Telecare Dashboard - Comprehensive Data Processing

## Overview

The Telecare Dashboard extends the existing Comprehensive Dashboard with advanced data processing capabilities. It allows users to search for NPA NXX records by zipcode, generate input CSVs, run Python scripts, and persist results to the database with full tracking and download capabilities.

## ✨ Key Features

### **🔍 Zipcode Search & Data Retrieval**
- **5-Digit Zipcode Validation**: Ensures proper format before processing
- **NPA NXX Records Display**: Shows all records matching the zipcode
- **Professional Table Interface**: ID, NPA, NXX, ZIP, STATE, CITY, RC, CREATED AT columns
- **Summary Statistics**: Total records, unique NPAs, cities, and states

### **🚀 Process & Save Workflow**
- **CSV Generation**: Creates input CSV matching `sample_data.csv` format
- **Python Script Execution**: Runs `scrap.py` with generated CSV
- **Database Persistence**: Stores output data with run tracking
- **Progress Monitoring**: Real-time status updates throughout the process

### **📊 Processing Status & History**
- **Live Status Updates**: Processing, Running Python, Saving to DB, Done
- **Run History**: Track all processing attempts for each zipcode
- **Status Badges**: Visual indicators for Processing, Success, and Error states
- **Run Details**: Timestamps, row counts, and file references

### **📥 File Downloads & Viewing**
- **Input CSV Download**: Generated CSV sent to Python script
- **Output CSV Download**: Results from Python script processing
- **File Preview**: View CSV content directly in UI modal before downloading
- **Automatic Naming**: Timestamped filenames for easy identification

## 🏗️ Architecture

### **Backend Components**
```
src/
├── models/
│   └── Telecare.js              # Database operations for telecare runs
├── services/
│   ├── telecareProcessor.js     # CSV generation, Python execution, data processing
│   └── fileStorageService.js    # Systematic file storage and organization
├── controllers/
│   └── telecareController.js    # API endpoint handlers
├── routes/
│   └── telecareRoutes.js        # API route definitions
└── database/
    └── migrateTelecare.js       # Database schema creation
```

### **Frontend Components**
```
frontend/src/
├── components/
│   └── ComprehensiveDashboard.tsx  # Main dashboard with telecare integration
├── api/
│   └── telecareApi.ts              # API client for telecare endpoints
```

### **Database Schema**
```sql
-- Telecare runs tracking
CREATE TABLE telecare_runs (
  run_id VARCHAR(255) PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  input_csv_name VARCHAR(255) NOT NULL,
  output_csv_name VARCHAR(255) NOT NULL,
  row_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing',
  script_version VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  file_refs JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Output data storage
CREATE TABLE telecare_output_rows (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL REFERENCES telecare_runs(run_id),
  zip VARCHAR(5) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Setup & Installation

### **1. Backend Setup**
```bash
# Install dependencies
npm install

# Run database migration
node src/database/migrateTelecare.js

# Start the server
npm start
```

### **2. Python Environment Setup**
```bash
# Make setup script executable
chmod +x setup_python_env.sh

# Run setup script
./setup_python_env.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### **3. Frontend Setup**
```bash
cd frontend
npm install
npm start
```

## 📋 API Endpoints

### **Processing**
- **POST** `/api/v1/telecare/process/:zipcode` - Start telecare processing
- **GET** `/api/v1/telecare/status/:run_id` - Get processing status

### **Data Retrieval**
- **GET** `/api/v1/telecare/runs/:zipcode` - Get runs for a zipcode
- **GET** `/api/v1/telecare/output/:run_id` - Get output rows for a run
- **GET** `/api/v1/telecare/latest/:zipcode` - Get latest run for a zipcode
- **GET** `/api/v1/telecare/stats` - Get telecare statistics

### **File Downloads**
- **GET** `/api/v1/telecare/download/input/:run_id` - Download input CSV
- **GET** `/api/v1/telecare/download/output/:run_id` - Download output CSV

### **File Management**
- **GET** `/api/v1/telecare/files/:run_id` - Get file structure for a run
- **GET** `/api/v1/telecare/files/date/:date` - List files by date (YYYY-MM-DD)
- **GET** `/api/v1/telecare/files/:run_id/:file_type/content` - Get file content for viewing

## 🔄 Workflow

### **1. Search & Display**
1. User enters 5-digit zipcode
2. System fetches NPA NXX records from `/records/zip/:zip`
3. Results displayed in professional table format
4. Summary statistics calculated and shown

### **2. Process & Save**
1. User clicks "Process & Save (CSV → Python → DB)" button
2. System generates input CSV matching `sample_data.csv` format
3. Python script (`scrap.py`) executed with generated CSV
4. Output CSV parsed and stored in database
5. Run status tracked throughout the process

### **3. Status Monitoring**
1. **Generating CSV**: Input CSV creation
2. **Running Python script**: Script execution with progress
3. **Saving to database**: Data persistence
4. **Done**: Completion with download options

### **4. Results & Downloads**
1. **Success**: Download buttons for both input and output CSVs
2. **Error**: Clear error messages with troubleshooting info
3. **History**: Previous runs accessible for each zipcode

## 📊 CSV Format Mapping

### **Input CSV (to Python)**
```csv
NPA,NXX
201,201
201,202
201,203
```

**Field Mapping:**
- `NPA` ← `record.npa` (3-digit area code)
- `NXX` ← `record.nxx` (3-digit exchange code)

**Filename Format:** `queried_{zipcode}_npa_nxx_{timestamp}.csv`
**Example:** `queried_20560_npa_nxx_2025-08-24_12-34-56.csv`

**Note:** Only NPA and NXX columns are included in the input CSV as required by the Python script.

### **Output CSV (from Python)**
```csv
NPA,NXX,THOUSANDS,COMPANY TYPE,OCN,COMPANY,LATA,RATECENTER,CLLI,STATE
201,201,,WIRELESS,624H,ONVOY SPECTRUM LLC,224,JERSEYCITY,HCKNNJHKX4X,NJ
201,201,0,CLEC,118F,BANDWIDTH.COM CLEC LLC - NJ,224,JERSEYCITY,NOCLLIKNOWN,NJ
```

**Filename Format:** `queried_{zipcode}_python_output_{timestamp}.csv`
**Example:** `queried_20560_python_output_1735123456789.csv`

**Storage:** Each row stored as JSONB in `telecare_output_rows.payload`

## 🎯 User Experience

### **Search Interface**
- **Input Validation**: Real-time zipcode format checking
- **Sample Zipcodes**: Quick test buttons (20560, 10001, 90210, etc.)
- **Error Handling**: Clear messages for invalid inputs or no data

### **File Viewing & Analysis**
- **👁️ View Files Button**: Opens modal to preview CSV content
- **Tabbed Interface**: Separate tabs for Input and Output CSV files
- **Content Preview**: First 10 rows displayed in formatted table
- **Header Analysis**: Column names and data types clearly shown
- **File Statistics**: Row count, column count, and file size
- **Inline Download**: Download files directly from the viewer
- **Real-time Loading**: Content loaded on-demand for performance

## 📁 File Storage System

### **Organized File Structure**
```
telecare_files/
├── input/
│   └── 2025/
│       └── 08/
│           └── 24/
│               └── 20560_f4749101_queried_20560_npa_nxx_2025-08-24_12-34-56.csv
├── output/
│   └── 2025/
│       └── 08/
│           └── 24/
│               └── 20560_f4749101_queried_20560_python_output_1735123456789.csv
└── logs/
    └── 2025/
        └── 08/
            └── 24/
                └── 20560_f4749101_queried_20560_python_script.log
```

### **File Naming Convention**
- **Input Files**: `{zipcode}_{run_id}_queried_{zipcode}_npa_nxx_{timestamp}.csv`
- **Output Files**: `{zipcode}_{run_id}_queried_{zipcode}_python_output_{timestamp}.csv`
- **Log Files**: `{zipcode}_{run_id}_queried_{zipcode}_python_script.log`

**Example for zipcode 20560:**
- Input: `20560_f4749101_queried_20560_npa_nxx_2025-08-24_12-34-56.csv`
- Output: `20560_f4749101_queried_20560_python_output_1735123456789.csv`
- Log: `20560_f4749101_queried_20560_python_script.log`

### **Date-Based Organization**
- **Year/Month/Day** folder structure for easy navigation
- **Automatic cleanup** of old files (configurable retention)
- **File size tracking** and metadata storage

### **Processing Interface**
- **Progress Indicators**: Spinning loader with status text
- **Status Badges**: Color-coded status indicators
- **Real-time Updates**: Live progress monitoring
- **Download Options**: Easy access to generated files

### **Results Display**
- **Professional Table**: Clean, sortable data presentation
- **Summary Cards**: Key statistics at a glance
- **Run History**: Previous processing attempts
- **File Management**: Organized download system

## 🔧 Technical Implementation

### **Python Integration**
- **Virtual Environment**: Isolated Python dependencies
- **Script Execution**: Child process spawning with proper error handling
- **File Management**: Temporary file creation and cleanup
- **Output Parsing**: CSV parsing with error handling

### **Database Operations**
- **Transaction Safety**: Rollback on failures
- **Status Tracking**: Comprehensive run state management
- **Data Persistence**: JSONB storage for flexible output handling
- **Performance**: Indexed queries for fast retrieval

### **Error Handling**
- **Validation Errors**: Input format and data availability
- **Python Failures**: Script execution and output parsing
- **Database Issues**: Connection and transaction failures
- **User Feedback**: Clear error messages and recovery options

## 🚀 Future Enhancements

### **Planned Features**
- **Batch Processing**: Multiple zipcodes in single operation
- **Scheduled Runs**: Automated processing at specified intervals
- **Advanced Filtering**: Process specific NPA/NXX combinations
- **Data Visualization**: Charts and graphs for processed data
- **Export Formats**: Additional output formats (JSON, XML)

### **Integration Opportunities**
- **Email Notifications**: Processing completion alerts
- **Webhook Support**: External system integration
- **API Rate Limiting**: Controlled access for external users
- **Audit Logging**: Comprehensive activity tracking
- **Performance Metrics**: Processing time and success rate analytics

## 🐛 Troubleshooting

### **Common Issues**

#### **Python Environment**
```bash
# Check Python version
python3 --version

# Verify virtual environment
ls -la venv/

# Reinstall dependencies
source venv/bin/activate
pip install -r requirements.txt
```

#### **Database Connection**
```bash
# Check database status
node src/database/migrateTelecare.js

# Verify tables exist
psql -h localhost -U postgres -d sheetbc_db -c "\dt telecare*"
```

#### **Processing Failures**
1. **Check logs**: Backend console output
2. **Verify data**: Ensure zipcode has NPA NXX records
3. **Python script**: Verify `scrap.py` exists and is executable
4. **Dependencies**: Ensure all Python packages are installed

### **Error Messages**
- **"Invalid zipcode format"**: Use 5-digit format (e.g., 20560)
- **"No NPA NXX records found"**: Zipcode not in database
- **"Python script failed"**: Check Python environment and dependencies
- **"Database error"**: Verify database connection and schema

## 📚 Best Practices

### **For Users**
- **Start Small**: Test with known zipcodes first
- **Monitor Progress**: Watch status updates during processing
- **Download Results**: Save both input and output CSVs
- **Check History**: Review previous runs for troubleshooting

### **For Developers**
- **Error Boundaries**: Implement proper error handling
- **Status Updates**: Provide clear progress feedback
- **Data Validation**: Validate all inputs and outputs
- **Performance**: Optimize database queries and file operations

## 🎉 Conclusion

The Telecare Dashboard provides a powerful, end-to-end solution for processing NPA NXX data through Python scripts and persisting results to the database. With its intuitive interface, comprehensive error handling, and robust data management, users can efficiently process geographic data while maintaining full visibility into the entire workflow.

The system is designed to be:
- **User-Friendly**: Intuitive interface with clear progress indicators
- **Robust**: Comprehensive error handling and recovery
- **Scalable**: Efficient database operations and file management
- **Extensible**: Ready for future enhancements and integrations

This tool significantly improves the data processing workflow by automating CSV generation, Python script execution, and result persistence, making it easier for users to analyze and work with telecare data.
