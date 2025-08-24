const fs = require('fs');
const path = require('path');

// Test the demographic upload functionality
async function testDemographicUpload() {
  try {
    console.log('Testing Demographic Upload Functionality...\n');

    // Check if test.csv exists
    const testFile = path.join(__dirname, 'test.csv');
    if (!fs.existsSync(testFile)) {
      console.error('❌ test.csv file not found in the current directory');
      return;
    }

    console.log('✅ test.csv file found');

    // Read and parse the first few lines to verify structure
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const lines = fileContent.split('\n');
    const header = lines[0];
    const firstDataLine = lines[1];

    console.log('📊 CSV Structure:');
    console.log(`Header: ${header.substring(0, 100)}...`);
    console.log(`First data line: ${firstDataLine.substring(0, 100)}...`);
    console.log(`Total lines: ${lines.length}`);

    // Check if the first column looks like a zipcode
    const firstColumn = header.split(',')[0];
    console.log(`\n📍 First column name: "${firstColumn}"`);

    if (firstColumn === 'name') {
      console.log('✅ First column is "name" which will be mapped to zipcode');
    } else {
      console.log('⚠️  First column is not "name" - may need adjustment');
    }

    // Check for key demographic columns
    const expectedColumns = ['state', 'county', 'city', 'mhhi', 'avg_hhi'];
    const missingColumns = expectedColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All expected demographic columns found');
    } else {
      console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
    }

    console.log('\n🚀 Ready to test upload!');
    console.log('\nTo test the upload functionality:');
    console.log('1. Start your server: npm start');
    console.log('2. Use the API endpoint: POST /api/v1/demographic/upload');
    console.log('3. Upload the test.csv file');
    console.log('4. Check the upload status: GET /api/v1/demographic/status/:id');
    console.log('5. View records: GET /api/v1/demographic/records');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

// Run the test
testDemographicUpload();
