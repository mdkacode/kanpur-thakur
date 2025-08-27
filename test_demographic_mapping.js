const fs = require('fs');
const path = require('path');

// Sample data from user
const sampleData = [
  {
    name: '10279',
    state: 'New York',
    county: 'New York',
    city: 'New York',
    mhhi: '$2,50,001.00',
    mhhi_moe: '-$1.00',
    avg_hhi: '$12,10,208.00',
    avg_hhi_moe: '$1,03,073.00',
    pc_income: '$4,19,459.00',
    pc_income_moe: '$1,82,632.00'
  }
];

// Create test CSV file
const csvContent = `name,state,county,city,mhhi,mhhi_moe,avg_hhi,avg_hhi_moe,pc_income,pc_income_moe
10279,New York,New York,New York,"$2,50,001.00",-$1.00,"$12,10,208.00","$1,03,073.00","$4,19,459.00","$1,82,632.00"`;

const testFilePath = path.join(__dirname, 'test_demographic_data.csv');

// Write test CSV file
fs.writeFileSync(testFilePath, csvContent);
console.log('✅ Created test CSV file:', testFilePath);

// Test the demographic file processor
const processor = require('./src/services/demographicFileProcessor');

async function testDemographicProcessing() {
  try {
    console.log('\n🧪 Testing demographic file processing...');
    
    // Test CSV parsing
    console.log('\n📄 Testing CSV parsing...');
    const parseResult = await processor.parseCSV(testFilePath);
    console.log('✅ CSV parsing completed');
    console.log('📊 Headers:', parseResult.headers);
    console.log('📊 Records count:', parseResult.records.length);
    
    if (parseResult.records.length > 0) {
      console.log('📊 First record:', JSON.stringify(parseResult.records[0], null, 2));
      
      // Check required fields
      const requiredFields = ['name', 'state', 'county', 'city', 'mhhi', 'mhhi_moe', 'avg_hhi', 'avg_hhi_moe', 'pc_income', 'pc_income_moe'];
      const firstRecord = parseResult.records[0];
      
      console.log('\n🔍 Checking required fields:');
      requiredFields.forEach(field => {
        const value = firstRecord[field];
        const status = value ? '✅' : '❌';
        console.log(`${status} ${field}: ${value || 'MISSING'}`);
      });
      
      // Check timezone resolution
      console.log('\n🌍 Checking timezone resolution:');
      if (firstRecord.timezone_id) {
        console.log(`✅ timezone_id: ${firstRecord.timezone_id}`);
      } else {
        console.log('❌ timezone_id: MISSING');
      }
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Clean up test file even if test fails
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Run the test
testDemographicProcessing();
