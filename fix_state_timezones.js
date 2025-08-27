const db = require('./src/config/database');

async function fixStateTimezones() {
  try {
    console.log('🔧 Fixing state-timezone mappings...');
    
    // State to timezone mapping (using the correct timezone IDs from the database)
    const stateTimezoneMap = {
      // Eastern Time (EST/EDT) - timezone_id 7
      'AL': 7, 'CT': 7, 'DE': 7, 'FL': 7, 'GA': 7, 'IN': 7, 'KY': 7, 'ME': 7, 'MD': 7, 'MA': 7, 
      'MI': 7, 'NH': 7, 'NJ': 7, 'NY': 7, 'NC': 7, 'OH': 7, 'PA': 7, 'RI': 7, 'SC': 7, 'TN': 7, 'VT': 7, 'VA': 7, 'WV': 7,
      
      // Central Time (CST/CDT) - timezone_id 8
      'AR': 8, 'IL': 8, 'IA': 8, 'KS': 8, 'LA': 8, 'MN': 8, 'MS': 8, 'MO': 8, 'NE': 8, 'ND': 8, 'OK': 8, 'SD': 8, 'TX': 8, 'WI': 8,
      
      // Mountain Time (MST/MDT) - timezone_id 9
      'AZ': 19, 'CO': 9, 'ID': 22, 'MT': 9, 'NM': 9, 'UT': 9, 'WY': 9,
      
      // Pacific Time (PST/PDT) - timezone_id 10
      'CA': 10, 'NV': 10, 'OR': 23, 'WA': 24,
      
      // Alaska Time (AKST/AKDT) - timezone_id 11
      'AK': 11,
      
      // Hawaii Time (HST) - timezone_id 12
      'HI': 12
    };
    
    // Update each state with the correct timezone
    for (const [stateCode, timezoneId] of Object.entries(stateTimezoneMap)) {
      await db.query(`
        UPDATE states 
        SET timezone_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE state_code = $2
      `, [timezoneId, stateCode]);
      
      console.log(`✅ Updated ${stateCode} to timezone_id ${timezoneId}`);
    }
    
    // Verify the updates
    console.log('\n📊 Verification - Updated state-timezone mappings:');
    const result = await db.query(`
      SELECT s.state_code, s.state_name, s.timezone_id, t.display_name, t.abbreviation_standard
      FROM states s
      JOIN timezones t ON s.timezone_id = t.id
      ORDER BY s.state_code
    `);
    
    result.rows.forEach(row => {
      console.log(`${row.state_code} (${row.state_name}): ${row.display_name} (${row.abbreviation_standard})`);
    });
    
    console.log('\n✅ State-timezone mappings updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing state timezones:', error);
    throw error;
  }
}

// Run the fix
fixStateTimezones()
  .then(() => {
    console.log('🎉 State timezone fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 State timezone fix failed:', error);
    process.exit(1);
  });
