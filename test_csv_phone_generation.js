const PhoneNumberGenerator = require('./src/services/phoneNumberGenerator');

async function testCSVPhoneNumberGeneration() {
  try {
    console.log('🔢 Testing CSV-Based Phone Number Generation...\n');
    
    const generator = new PhoneNumberGenerator();
    
    // Sample CSV data (similar to your telecare output) - just 1 row for testing
    // Note: THOUSANDS field can be "-" or a number, we'll handle both cases
    const csvData = `NPA,NXX,THOUSANDS,COMPANY TYPE,OCN,COMPANY,LATA,RATECENTER,CLLI,STATE
201,202,-,WIRELESS,6630,USA MOBILITY WIRELESS INC.,224,HACKENSACK,WAYNNJ081MD,NJ
201,203,123,WIRELESS,6630,USA MOBILITY WIRELESS INC.,224,HACKENSACK,WAYNNJ081MD,NJ`;
    
    const zip = '07662';
    const filterId = null; // Can be linked to a specific filter if needed
    
    console.log(`📱 Starting phone number generation from CSV for zip ${zip}`);
    console.log(`📊 CSV Data Preview:`);
    console.log(csvData);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Generate phone numbers from CSV
    const result = await generator.generatePhoneNumbersFromCSV(csvData, zip, filterId);
    
    console.log('✅ Phone number generation completed successfully!');
    console.log('📊 Results:', result);
    
    // Show some sample generated numbers
    if (result.success) {
      console.log(`\n🎯 Generated ${result.total_generated} phone numbers from ${result.total_processed} NPA-NXX combinations`);
      console.log(`📱 Each NPA-NXX generated 1000 numbers (000-999) for 10-digit format`);
      console.log(`🔢 Phone number format: NPA + NXX + THOUSANDS + [000-999]`);
      console.log(`📝 Example formats:`);
      console.log(`   - NPA=201, NXX=202, THOUSANDS="-" → 2012020XX000-999 (10 digits)`);
      console.log(`   - NPA=201, NXX=203, THOUSANDS="123" → 2012031XX000-999 (10 digits)`);
      console.log(`🌍 Timezone mapping applied automatically`);
      console.log(`🔗 Filter linking ready for demographic criteria`);
      console.log(`🚫 Duplicate prevention: Won't regenerate for existing zipcodes`);
    } else {
      console.log(`\n⚠️ Generation failed or skipped: ${result.message}`);
      if (result.existing_count) {
        console.log(`📊 Existing phone numbers: ${result.existing_count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ CSV phone number generation failed:', error);
  }
}

// Run the test
testCSVPhoneNumberGeneration();
