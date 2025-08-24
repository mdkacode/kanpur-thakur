# Demographic Data Upload Functionality

This document describes the new demographic data upload functionality that allows you to upload CSV files similar to `test.csv` and store the data in a dedicated database table.

## Overview

The demographic upload system is designed to handle CSV files containing demographic and geographic data with the following characteristics:
- First column contains zipcodes (mapped from the "name" column in your CSV)
- Contains comprehensive demographic data including income, age, education, housing, and more
- Processes data in batches for optimal performance
- Provides full CRUD operations for the uploaded data

## Database Schema

### Table: `demographic_records`

The system creates a new table with 86 columns to store all the demographic data:

- **Primary Fields**: `id`, `zipcode`, `state`, `county`, `city`
- **Income Data**: `mhhi`, `avg_hhi`, `pc_income`, various income brackets
- **Demographics**: Age distributions, race/ethnicity, education levels
- **Housing**: Housing units, ownership rates, median values
- **Employment**: Labor force, unemployment rates
- **Metadata**: `geoid`, `created_at`, `updated_at`

## API Endpoints

### File Upload
- **POST** `/api/v1/demographic/upload` - Upload demographic CSV file
- **GET** `/api/v1/demographic/status/:id` - Check upload status
- **GET** `/api/v1/demographic/uploads` - List all uploads
- **DELETE** `/api/v1/demographic/uploads/:id` - Delete upload
- **GET** `/api/v1/demographic/stats` - Upload statistics

### Record Management
- **GET** `/api/v1/demographic/records` - List all records with pagination
- **GET** `/api/v1/demographic/records/:id` - Get record by ID
- **GET** `/api/v1/demographic/records/zipcode/:zipcode` - Get record by zipcode
- **POST** `/api/v1/demographic/records` - Create new record
- **PUT** `/api/v1/demographic/records/:id` - Update record
- **DELETE** `/api/v1/demographic/records/:id` - Delete record

### Data Analysis
- **GET** `/api/v1/demographic/records/stats/overview` - Overall statistics
- **GET** `/api/v1/demographic/records/search/query` - Search records
- **GET** `/api/v1/demographic/records/states/list` - List all states
- **GET** `/api/v1/demographic/records/states/:state/counties` - Counties by state

## File Format Requirements

### Supported Format
- **File Type**: CSV only
- **Encoding**: UTF-8
- **Size Limit**: 100MB
- **Column Mapping**: First column ("name") maps to zipcode

### Expected Columns
The system expects these columns (case-sensitive):
```
name,state,county,city,mhhi,mhhi_moe,avg_hhi,avg_hhi_moe,pc_income,pc_income_moe,
pct_hh_w_income_200k_plus,pct_hh_w_income_200k_plus_moe,mhhi_hhldr_u25,mhhi_hhldr_u25_moe,
mhhi_hhldr_25_44,mhhi_hhldr_25_44_moe,mhhi_hhldr_45_64,mhhi_hhldr_45_64_moe,
mhhi_hhldr_65_plus,mhhi_hhldr_65_plus_moe,hhi_total_hh,hhi_hh_w_lt_25k,
hhi_hh_w_25k_49k,hhi_hh_w_50k_74k,hhi_hh_w_75k_99k,hhi_hh_w_100k_149k,
hhi_hh_w_150k_199k,hhi_hh_w_200k_plus,race_ethnicity_total,race_ethnicity_white,
race_ethnicity_black,race_ethnicity_native,race_ethnicity_asian,race_ethnicity_islander,
race_ethnicity_other,race_ethnicity_two,race_ethnicity_hispanic,pop_dens_sq_mi,
age_total,age_f_0_9,age_f_10_19,age_f_20_29,age_f_30_39,age_f_40_49,age_f_50_59,
age_f_60_69,age_f_70_plus,age_m_0_9,age_m_10_19,age_m_20_29,age_m_30_39,age_m_40_49,
age_m_50_59,age_m_60_69,age_m_70_plus,median_age,edu_att_pop_25_plus,edu_att_no_diploma,
edu_att_high_school,edu_att_some_college,edu_att_bachelors,edu_att_graduate,
family_hh_total,family_poverty_pct,emp_status_civ_labor_force,unemployment_pct,
housing_units,occupied_units,owner_occupied,renter_occupied,median_value_owner_occupied_units,
households,hh_families,hh_mc_families,hh_mc_with_own_children_under_18,hh_sp_families,
hh_sp_with_own_children_under_18,hh_non_families,aland_sq_mi,geoid
```

## Usage Examples

### 1. Upload a CSV File

```bash
curl -X POST http://localhost:3000/api/v1/demographic/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.csv"
```

Response:
```json
{
  "success": true,
  "message": "Demographic file uploaded successfully and processing started",
  "data": {
    "uploadId": 1,
    "filename": "test.csv",
    "fileSize": 12345,
    "status": "processing",
    "fileType": "demographic"
  }
}
```

### 2. Check Upload Status

```bash
curl http://localhost:3000/api/v1/demographic/status/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. View Records

```bash
curl "http://localhost:3000/api/v1/demographic/records?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Search by Zipcode

```bash
curl http://localhost:3000/api/v1/demographic/records/zipcode/90210 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Processing

### Upload Process
1. **File Validation**: Checks file type and size
2. **CSV Parsing**: Reads and parses CSV data
3. **Data Validation**: Ensures required fields are present
4. **Batch Processing**: Inserts records in batches of 1000
5. **Status Updates**: Tracks progress and completion
6. **Cleanup**: Removes temporary files after processing

### Performance Features
- **Batch Processing**: Processes records in configurable batches
- **Memory Management**: Monitors memory usage and forces garbage collection
- **Progress Logging**: Logs progress every 1000 records
- **Error Handling**: Comprehensive error handling and logging

## Database Migration

The system automatically creates the required table structure. To manually run the migration:

```bash
node src/database/migrate.js
```

## Error Handling

### Common Issues
- **Invalid File Type**: Only CSV files are accepted
- **Missing Columns**: System validates required columns
- **Data Validation**: Records must have valid zipcodes
- **Memory Issues**: Large files are processed in batches

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Security

- **Authentication Required**: All endpoints require valid JWT token
- **File Type Validation**: Strict file type checking
- **Size Limits**: Configurable file size limits
- **Input Sanitization**: All inputs are validated and sanitized

## Monitoring

### Logs
The system provides detailed logging for:
- File upload initiation
- Processing progress
- Completion status
- Error conditions

### Statistics
Track upload performance with:
- Total uploads
- Success/failure rates
- Processing times
- Record counts

## Testing

Run the test script to verify your setup:

```bash
node test_demographic_upload.js
```

This will check your CSV file structure and provide guidance for testing.

## Support

For issues or questions:
1. Check the server logs for detailed error information
2. Verify your CSV file format matches the expected structure
3. Ensure your database is properly configured
4. Check that all required dependencies are installed
