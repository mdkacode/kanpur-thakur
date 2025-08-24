const db = require('./src/config/database');

async function testFilterOptions() {
  try {
    console.log('🧪 Testing filter options logic...');
    
    // Test data cleaning logic
    const testValues = [
      '49%',
      '$25,000',
      '100,000',
      '75',
      'N/A',
      '-$1',
      'Unknown',
      '150'
    ];
    
    console.log('\n📊 Test values:');
    testValues.forEach(val => console.log(`  ${val}`));
    
    console.log('\n🧹 Cleaned values:');
    testValues.forEach(val => {
      if (val && val !== '' && val !== '-$1' && val !== '-1' && 
          !val.includes('N/A') && !val.includes('Unknown')) {
        const cleaned = val.replace(/[%,$]/g, '').replace(/,/g, '');
        const num = parseFloat(cleaned);
        console.log(`  ${val} → ${cleaned} → ${isNaN(num) ? 'NaN' : num}`);
      } else {
        console.log(`  ${val} → filtered out`);
      }
    });
    
    // Test database connection
    console.log('\n🔌 Testing database connection...');
    const result = await db.query('SELECT COUNT(*) as count FROM demographic_records');
    console.log(`✅ Database connected. Total records: ${result.rows[0].count}`);
    
    // Test getting unique states
    console.log('\n🗺️ Testing unique states...');
    const statesResult = await db.query(`
      SELECT DISTINCT state 
      FROM demographic_records 
      WHERE state IS NOT NULL AND state != '' 
      ORDER BY state 
      LIMIT 10
    `);
    console.log(`✅ Found ${statesResult.rows.length} unique states`);
    statesResult.rows.forEach(row => console.log(`  - ${row.state}`));
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testFilterOptions();
