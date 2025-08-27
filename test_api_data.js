const axios = require('axios');

async function testApiData() {
  try {
    console.log('🧪 Testing API data for demographic records...\n');
    
    // Test the API endpoint
    const response = await axios.get('http://localhost:3000/api/v1/demographic/records?page=1&limit=5');
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Success:', response.data.success);
    console.log('✅ Total Records:', response.data.pagination?.total || 'N/A');
    console.log('✅ Records Returned:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📊 Sample Record Structure:');
      const sampleRecord = response.data.data[0];
      console.log('Keys:', Object.keys(sampleRecord));
      
      console.log('\n📊 Sample Record Data:');
      console.log(JSON.stringify(sampleRecord, null, 2));
      
      // Check specific fields
      console.log('\n🔍 Field Values Check:');
      console.log('timezone_display_name:', sampleRecord.timezone_display_name);
      console.log('timezone_id:', sampleRecord.timezone_id);
      console.log('mhhi:', sampleRecord.mhhi);
      console.log('avg_hhi:', sampleRecord.avg_hhi);
      console.log('pc_income:', sampleRecord.pc_income);
      console.log('median_age:', sampleRecord.median_age);
      console.log('households:', sampleRecord.households);
      
      // Check for unique values
      console.log('\n🔍 Unique Values Analysis:');
      const timezones = [...new Set(response.data.data.map(r => r.timezone_display_name).filter(Boolean))];
      const mhhiValues = [...new Set(response.data.data.map(r => r.mhhi).filter(Boolean))];
      const states = [...new Set(response.data.data.map(r => r.state).filter(Boolean))];
      
      console.log('Unique timezones:', timezones);
      console.log('Unique mhhi values:', mhhiValues);
      console.log('Unique states:', states);
      
    } else {
      console.log('❌ No records returned from API');
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testApiData();
