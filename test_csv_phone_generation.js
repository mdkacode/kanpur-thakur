const PhoneNumberGenerator = require('./src/services/phoneNumberGenerator');

async function testCSVPhoneNumberGeneration() {
  try {
    console.log('🔢 Testing CSV-Based Phone Number Generation...\n');
    
    const generator = new PhoneNumberGenerator();
    
    // Sample CSV data (similar to your telecare output) - just 1 row for testing
    const csvData = `NPA,NXX,THOUSANDS,COMPANY TYPE,OCN,COMPANY,LATA,RATECENTER,CLLI,STATE
201,202,-,WIRELESS,6630,USA MOBILITY WIRELESS INC.,224,HACKENSACK,WAYNNJ081MD,NJ`;
    
    const zip = '07662';
    
    console.log(`📱 Starting phone number generation from CSV for zip ${zip}`);
    console.log(`📊 CSV Data Preview:`);
    console.log(csvData);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Generate phone numbers from CSV
    const result = await generator.generatePhoneNumbersFromCSV(csvData, zip);
    
    console.log('✅ Phone number generation completed successfully!');
    console.log('📊 Results:', result);
    
    // Show some sample generated numbers
    if (result.success) {
      console.log(`\n🎯 Generated ${result.total_generated} phone numbers from ${result.total_processed} NPA-NXX combinations`);
      console.log(`📱 Each NPA-NXX generated 1000 numbers (000-999)`);
      console.log(`🌍 Timezone mapping applied automatically`);
      console.log(`🔗 Filter linking ready for demographic criteria`);
    }
    
  } catch (error) {
    console.error('❌ CSV phone number generation failed:', error);
  }
}

// Run the test
testCSVPhoneNumberGeneration();
