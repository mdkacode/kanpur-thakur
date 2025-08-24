const db = require('./src/config/database');

async function debugFiltering() {
  try {
    console.log('🧪 Debugging filtering logic...');
    
    // Test 1: Check what columns exist
    console.log('\n📋 Checking available columns...');
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'demographic_records' 
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await db.query(columnsQuery);
    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('Available columns:', columns);
    
    // Test 2: Check sample data for percentage fields
    console.log('\n📊 Checking sample data for percentage fields...');
    const percentageFields = ['unemployment_pct', 'pct_hh_w_income_200k_plus'];
    
    for (const field of percentageFields) {
      if (columns.includes(field)) {
        const sampleQuery = `SELECT DISTINCT ${field} FROM demographic_records WHERE ${field} IS NOT NULL AND ${field} != '' LIMIT 5`;
        const sampleResult = await db.query(sampleQuery);
        console.log(`${field} sample values:`, sampleResult.rows.map(row => row[field]));
      }
    }
    
    // Test 3: Check sample data for race fields
    console.log('\n📊 Checking sample data for race fields...');
    const raceFields = ['race_ethnicity_white', 'race_ethnicity_black', 'race_ethnicity_hispanic'];
    
    for (const field of raceFields) {
      if (columns.includes(field)) {
        const sampleQuery = `SELECT DISTINCT ${field} FROM demographic_records WHERE ${field} IS NOT NULL AND ${field} != '' LIMIT 5`;
        const sampleResult = await db.query(sampleQuery);
        console.log(`${field} sample values:`, sampleResult.rows.map(row => row[field]));
      }
    }
    
    // Test 4: Test a simple filter query
    console.log('\n🔍 Testing simple filter query...');
    const testFilterQuery = `
      SELECT COUNT(*) as count 
      FROM demographic_records 
      WHERE CAST(REPLACE(unemployment_pct, '%', '') AS NUMERIC) >= 10
    `;
    
    try {
      const filterResult = await db.query(testFilterQuery);
      console.log('✅ Filter query successful, count:', filterResult.rows[0].count);
    } catch (error) {
      console.error('❌ Filter query failed:', error.message);
    }
    
    // Test 5: Test race field filter
    console.log('\n🔍 Testing race field filter...');
    const testRaceQuery = `
      SELECT COUNT(*) as count 
      FROM demographic_records 
      WHERE CAST(race_ethnicity_white AS NUMERIC) >= 100
    `;
    
    try {
      const raceResult = await db.query(testRaceQuery);
      console.log('✅ Race filter query successful, count:', raceResult.rows[0].count);
    } catch (error) {
      console.error('❌ Race filter query failed:', error.message);
    }
    
    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    process.exit(0);
  }
}

debugFiltering();
