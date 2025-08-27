const db = require('./src/config/database');

async function updateDemographicTimezones() {
  try {
    console.log('🔧 Updating existing demographic records with timezone information...');
    
    // First, let's see how many records need updating
    const countResult = await db.query(`
      SELECT COUNT(*) as total_records, 
             COUNT(timezone_id) as records_with_timezone,
             COUNT(*) - COUNT(timezone_id) as records_without_timezone
      FROM demographic_records
    `);
    
    const stats = countResult.rows[0];
    console.log(`📊 Current status:`);
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Records with timezone: ${stats.records_with_timezone}`);
    console.log(`   Records without timezone: ${stats.records_without_timezone}`);
    
    if (stats.records_without_timezone == 0) {
      console.log('✅ All records already have timezone information!');
      return;
    }
    
    // First, update state_code from state column
    console.log('\n🔄 Updating state_code from state column...');
    
    const stateCodeUpdateResult = await db.query(`
      UPDATE demographic_records 
      SET state_code = CASE 
        WHEN state = 'Alabama' THEN 'AL'
        WHEN state = 'Alaska' THEN 'AK'
        WHEN state = 'Arizona' THEN 'AZ'
        WHEN state = 'Arkansas' THEN 'AR'
        WHEN state = 'California' THEN 'CA'
        WHEN state = 'Colorado' THEN 'CO'
        WHEN state = 'Connecticut' THEN 'CT'
        WHEN state = 'Delaware' THEN 'DE'
        WHEN state = 'Florida' THEN 'FL'
        WHEN state = 'Georgia' THEN 'GA'
        WHEN state = 'Hawaii' THEN 'HI'
        WHEN state = 'Idaho' THEN 'ID'
        WHEN state = 'Illinois' THEN 'IL'
        WHEN state = 'Indiana' THEN 'IN'
        WHEN state = 'Iowa' THEN 'IA'
        WHEN state = 'Kansas' THEN 'KS'
        WHEN state = 'Kentucky' THEN 'KY'
        WHEN state = 'Louisiana' THEN 'LA'
        WHEN state = 'Maine' THEN 'ME'
        WHEN state = 'Maryland' THEN 'MD'
        WHEN state = 'Massachusetts' THEN 'MA'
        WHEN state = 'Michigan' THEN 'MI'
        WHEN state = 'Minnesota' THEN 'MN'
        WHEN state = 'Mississippi' THEN 'MS'
        WHEN state = 'Missouri' THEN 'MO'
        WHEN state = 'Montana' THEN 'MT'
        WHEN state = 'Nebraska' THEN 'NE'
        WHEN state = 'Nevada' THEN 'NV'
        WHEN state = 'New Hampshire' THEN 'NH'
        WHEN state = 'New Jersey' THEN 'NJ'
        WHEN state = 'New Mexico' THEN 'NM'
        WHEN state = 'New York' THEN 'NY'
        WHEN state = 'North Carolina' THEN 'NC'
        WHEN state = 'North Dakota' THEN 'ND'
        WHEN state = 'Ohio' THEN 'OH'
        WHEN state = 'Oklahoma' THEN 'OK'
        WHEN state = 'Oregon' THEN 'OR'
        WHEN state = 'Pennsylvania' THEN 'PA'
        WHEN state = 'Rhode Island' THEN 'RI'
        WHEN state = 'South Carolina' THEN 'SC'
        WHEN state = 'South Dakota' THEN 'SD'
        WHEN state = 'Tennessee' THEN 'TN'
        WHEN state = 'Texas' THEN 'TX'
        WHEN state = 'Utah' THEN 'UT'
        WHEN state = 'Vermont' THEN 'VT'
        WHEN state = 'Virginia' THEN 'VA'
        WHEN state = 'Washington' THEN 'WA'
        WHEN state = 'West Virginia' THEN 'WV'
        WHEN state = 'Wisconsin' THEN 'WI'
        WHEN state = 'Wyoming' THEN 'WY'
        ELSE NULL
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE state_code IS NULL OR state_code = ''
    `);
    
    console.log(`✅ Updated ${stateCodeUpdateResult.rowCount} records with state codes`);
    
    // Now update timezone_id based on state_code
    console.log('\n🔄 Updating timezone_id from state_code...');
    
    const timezoneUpdateResult = await db.query(`
      UPDATE demographic_records 
      SET timezone_id = (
        SELECT s.timezone_id 
        FROM states s 
        WHERE s.state_code = demographic_records.state_code
        LIMIT 1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE timezone_id IS NULL 
      AND state_code IS NOT NULL
      AND state_code != ''
    `);
    
    console.log(`✅ Updated ${timezoneUpdateResult.rowCount} records with timezone information`);
    
    // Verify the update
    const verifyResult = await db.query(`
      SELECT COUNT(*) as total_records, 
             COUNT(timezone_id) as records_with_timezone,
             COUNT(*) - COUNT(timezone_id) as records_without_timezone
      FROM demographic_records
    `);
    
    const newStats = verifyResult.rows[0];
    console.log(`\n📊 After update:`);
    console.log(`   Total records: ${newStats.total_records}`);
    console.log(`   Records with timezone: ${newStats.records_with_timezone}`);
    console.log(`   Records without timezone: ${newStats.records_without_timezone}`);
    
    // Show some sample records with their timezone information
    console.log('\n📋 Sample records with timezone information:');
    const sampleResult = await db.query(`
      SELECT dr.zip_code, dr.state_code, dr.state, dr.city, dr.timezone_id, t.display_name, t.abbreviation_standard
      FROM demographic_records dr
      LEFT JOIN timezones t ON dr.timezone_id = t.id
      WHERE dr.timezone_id IS NOT NULL
      ORDER BY dr.created_at DESC
      LIMIT 10
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`   ${row.zip_code} (${row.state_code}, ${row.state}, ${row.city}): ${row.display_name} (${row.abbreviation_standard})`);
    });
    
    console.log('\n✅ Demographic timezone update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating demographic timezones:', error);
    throw error;
  }
}

// Run the update
updateDemographicTimezones()
  .then(() => {
    console.log('🎉 Demographic timezone update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demographic timezone update failed:', error);
    process.exit(1);
  });
