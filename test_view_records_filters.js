const axios = require('axios');

async function testViewRecordsFilters() {
  try {
    console.log('🧪 Testing View Records Filter API Endpoints...\n');
    
    const baseUrl = 'http://localhost:3000/api/v1';
    
    // Test unique values endpoints
    const endpoints = [
      '/demographic/records/unique/zip_code?limit=10',
      '/demographic/records/unique/state?limit=10',
      '/demographic/records/unique/county?limit=10',
      '/demographic/records/unique/city?limit=10',
      '/demographic/records/unique/mhhi?limit=10',
      '/demographic/records/unique/avg_hhi?limit=10',
      '/demographic/records/unique/pc_income?limit=10',
      '/demographic/records/unique/median_age?limit=10',
      '/demographic/records/unique/households?limit=10',
      '/demographic/records/unique/race_ethnicity_white?limit=10',
      '/demographic/records/unique/race_ethnicity_black?limit=10',
      '/demographic/records/unique/race_ethnicity_hispanic?limit=10'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing: ${endpoint}`);
        const response = await axios.get(`${baseUrl}${endpoint}`);
        
        if (response.data.success) {
          console.log(`✅ Success: ${response.data.data.length} values returned`);
          console.log(`   Sample values:`, response.data.data.slice(0, 3));
        } else {
          console.log(`❌ Failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      console.log('');
    }
    
    // Test main records endpoint with filters
    console.log('🔍 Testing main records endpoint with filters...');
    const recordsResponse = await axios.get(`${baseUrl}/demographic/records?page=1&limit=5`);
    
    if (recordsResponse.data.success) {
      console.log(`✅ Records endpoint success: ${recordsResponse.data.data.length} records`);
      if (recordsResponse.data.data.length > 0) {
        const sampleRecord = recordsResponse.data.data[0];
        console.log('📊 Sample record fields:');
        console.log('   - zip_code:', sampleRecord.zip_code);
        console.log('   - state:', sampleRecord.state);
        console.log('   - county:', sampleRecord.county);
        console.log('   - city:', sampleRecord.city);
        console.log('   - mhhi:', sampleRecord.mhhi);
        console.log('   - mhhi_moe:', sampleRecord.mhhi_moe);
        console.log('   - avg_hhi:', sampleRecord.avg_hhi);
        console.log('   - avg_hhi_moe:', sampleRecord.avg_hhi_moe);
        console.log('   - pc_income:', sampleRecord.pc_income);
        console.log('   - pc_income_moe:', sampleRecord.pc_income_moe);
        console.log('   - timezone_display_name:', sampleRecord.timezone_display_name);
      }
    } else {
      console.log(`❌ Records endpoint failed: ${recordsResponse.data.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testViewRecordsFilters();
