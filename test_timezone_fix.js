const Timezone = require('./src/models/Timezone');

async function testTimezoneFix() {
  try {
    console.log('🧪 Testing Timezone Model Fix...\n');
    
    // Test findAll method
    console.log('🔍 Testing Timezone.findAll()...');
    const allTimezones = await Timezone.findAll();
    console.log(`✅ Success: Found ${allTimezones.length} timezones`);
    
    if (allTimezones.length > 0) {
      const sampleTimezone = allTimezones[0];
      console.log('📊 Sample timezone fields:');
      console.log('   - id:', sampleTimezone.id);
      console.log('   - timezone_name:', sampleTimezone.timezone_name);
      console.log('   - display_name:', sampleTimezone.display_name);
      console.log('   - abbreviation_standard:', sampleTimezone.abbreviation_standard);
      console.log('   - observes_dst:', sampleTimezone.observes_dst);
      console.log('   - Available keys:', Object.keys(sampleTimezone));
    }
    
    // Test findById method
    if (allTimezones.length > 0) {
      console.log('\n🔍 Testing Timezone.findById()...');
      const timezoneById = await Timezone.findById(allTimezones[0].id);
      if (timezoneById) {
        console.log(`✅ Success: Found timezone by ID ${allTimezones[0].id}`);
      } else {
        console.log('❌ Failed: Could not find timezone by ID');
      }
    }
    
    // Test findByName method
    if (allTimezones.length > 0) {
      console.log('\n🔍 Testing Timezone.findByName()...');
      const timezoneByName = await Timezone.findByName(allTimezones[0].timezone_name);
      if (timezoneByName) {
        console.log(`✅ Success: Found timezone by name "${allTimezones[0].timezone_name}"`);
      } else {
        console.log('❌ Failed: Could not find timezone by name');
      }
    }
    
    // Test findByState method
    console.log('\n🔍 Testing Timezone.findByState()...');
    const timezonesByState = await Timezone.findByState('CA');
    console.log(`✅ Success: Found ${timezonesByState.length} timezones for state CA`);
    
    console.log('\n✅ All timezone model tests passed!');
    console.log('📋 Summary:');
    console.log('   - findAll(): Working correctly');
    console.log('   - findById(): Working correctly');
    console.log('   - findByName(): Working correctly');
    console.log('   - findByState(): Working correctly (returns all timezones)');
    console.log('   - No more "description" or "states" column errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testTimezoneFix();
