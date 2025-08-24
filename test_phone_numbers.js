const PhoneNumberGenerator = require('./src/services/phoneNumberGenerator');

// Test the phone number generator
async function testPhoneNumberGeneration() {
  try {
    console.log('🧪 Testing Phone Number Generation System...\n');
    
    const generator = new PhoneNumberGenerator();
    
    // Test timezone mapping
    console.log('📍 Testing timezone mapping:');
    console.log('NJ →', generator.getTimezoneForState('NJ'));
    console.log('CA →', generator.getTimezoneForState('CA'));
    console.log('TX →', generator.getTimezoneForState('TX'));
    console.log('Unknown →', generator.getTimezoneForState('XX'));
    
    // Test phone number validation
    console.log('\n🔢 Testing phone number validation:');
    console.log('Valid NPA-NXX (201-202):', generator.validatePhoneComponents('201', '202', '000'));
    console.log('Invalid NPA (20-202):', generator.validatePhoneComponents('20', '202', '000'));
    console.log('Invalid NXX (201-20):', generator.validatePhoneComponents('201', '20', '000'));
    console.log('Invalid THOUSANDS (201-202-00):', generator.validatePhoneComponents('201', '202', '00'));
    
    // Test phone number generation for a single NPA-NXX
    console.log('\n📱 Testing phone number generation for NPA-NXX 201-202:');
    const phoneNumbers = generator.generatePhoneNumbersForNpaNxx(
      '201', '202', '-', 'NJ', '07662', 'WIRELESS', 'Test Company', 'Hackensack'
    );
    
    console.log(`Generated ${phoneNumbers.length} phone numbers`);
    console.log('First 5 numbers:', phoneNumbers.slice(0, 5).map(p => p.full_phone_number));
    console.log('Last 5 numbers:', phoneNumbers.slice(-5).map(p => p.full_phone_number));
    
    // Test CSV formatting
    console.log('\n📄 Testing CSV formatting:');
    const csvContent = generator.formatPhoneNumbersForCSV(phoneNumbers.slice(0, 10));
    console.log('CSV Header + First 10 rows:');
    console.log(csvContent);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPhoneNumberGeneration();
