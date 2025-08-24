const PhoneNumberGenerator = require('./services/phoneNumberGenerator');

async function testPhoneNumberGeneration() {
  try {
    console.log('🔢 Testing Phone Number Generation from Telecare Output...\n');
    
    const generator = new PhoneNumberGenerator();
    
    // Use the existing telecare run ID from your database
    const runId = 'f8cb14a6-a75d-4d88-8554-a28b5640338c';
    const zip = '07662';
    
    console.log(`📱 Starting phone number generation for:`);
    console.log(`   Run ID: ${runId}`);
    console.log(`   Zipcode: ${zip}\n`);
    
    // Generate phone numbers from telecare output
    const result = await generator.generatePhoneNumbersFromTelecareOutput(runId, zip);
    
    console.log('✅ Phone number generation completed successfully!');
    console.log('📊 Results:', result);
    
  } catch (error) {
    console.error('❌ Phone number generation failed:', error);
  }
}

// Run the test
testPhoneNumberGeneration();
