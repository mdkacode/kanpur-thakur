const db = require('./src/config/database');

async function testPercentageFields() {
  try {
    console.log('🧪 Testing percentage field handling...');
    
    // Test the percentage field data cleaning logic
    const testPercentageValues = [
      '49%',
      '75.5%',
      '25%',
      '100%',
      '0%',
      'N/A',
      '-$1',
      'Unknown'
    ];
    
    console.log('\n📊 Test percentage values:');
    testPercentageValues.forEach(val => console.log(`  ${val}`));
    
    console.log('\n🧹 Cleaned percentage values:');
    testPercentageValues.forEach(val => {
      if (val && val !== '' && val !== '-$1' && val !== '-1' && 
          !val.includes('N/A') && !val.includes('Unknown')) {
        const cleaned = val.replace(/%/g, '');
        const num = parseFloat(cleaned);
        console.log(`  ${val} → ${cleaned} → ${isNaN(num) ? 'NaN' : num}`);
      } else {
        console.log(`  ${val} → filtered out`);
      }
    });
    
    // Test actual database values for percentage fields
    console.log('\n🔍 Testing actual database percentage fields...');
    
    const percentageFields = [
      'race_ethnicity_white',
      'race_ethnicity_black', 
      'race_ethnicity_hispanic',
      'unemployment_pct',
      'pct_hh_w_income_200k_plus'
    ];
    
    for (const field of percentageFields) {
      try {
        const query = `
          SELECT DISTINCT ${field} 
          FROM demographic_records 
          WHERE ${field} IS NOT NULL 
          AND ${field} != '' 
          AND ${field} != '-$1' 
          AND ${field} != '-1'
          AND ${field} NOT LIKE '%N/A%'
          AND ${field} NOT LIKE '%Unknown%'
          ORDER BY ${field}
          LIMIT 5
        `;
        
        const result = await db.query(query);
        if (result.rows.length > 0) {
          const values = result.rows.map(row => row[field]);
          console.log(`\n📈 Field: ${field}`);
          console.log(`  Raw values:`, values);
          
          // Clean and convert to numbers
          const numericValues = values
            .map(val => {
              if (typeof val === 'string') {
                const cleaned = val.replace(/%/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
              }
              return typeof val === 'number' ? val : null;
            })
            .filter(val => val !== null);
          
          if (numericValues.length > 0) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            console.log(`  Cleaned values:`, numericValues);
            console.log(`  Range: ${min} - ${max}`);
          } else {
            console.log(`  ⚠️ No valid numeric values found`);
          }
        } else {
          console.log(`\n📈 Field: ${field} - No data found`);
        }
      } catch (error) {
        console.log(`\n❌ Field: ${field} - Error:`, error.message);
      }
    }
    
    console.log('\n✅ Percentage field test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testPercentageFields();
