const db = require('./src/config/database');

async function setupTimezones() {
  try {
    console.log('🌍 Setting up timezone system for SheetBC...');
    console.log('=============================================');
    
    // Step 1: Check if timezones table exists and has data
    console.log('\n1️⃣ Checking timezones table...');
    const timezoneCheck = await db.query(`
      SELECT COUNT(*) as timezone_count 
      FROM timezones
    `);
    
    const timezoneCount = timezoneCheck.rows[0].timezone_count;
    console.log(`   Found ${timezoneCount} timezone records`);
    
    if (timezoneCount === 0) {
      console.log('   ⚠️ No timezones found. Please run: npm run seed:timezones');
      return;
    }
    
    // Step 2: Check if states table exists and has timezone mappings
    console.log('\n2️⃣ Checking states table...');
    const statesCheck = await db.query(`
      SELECT COUNT(*) as states_count,
             COUNT(timezone_id) as states_with_timezone
      FROM states
    `);
    
    const statesData = statesCheck.rows[0];
    console.log(`   Found ${statesData.states_count} states`);
    console.log(`   States with timezone: ${statesData.states_with_timezone}`);
    
    if (statesData.states_with_timezone === 0) {
      console.log('   ⚠️ No state-timezone mappings found. Running state timezone fix...');
      await fixStateTimezones();
    }
    
    // Step 3: Check demographic records timezone status
    console.log('\n3️⃣ Checking demographic records...');
    const demographicCheck = await db.query(`
      SELECT COUNT(*) as total_records,
             COUNT(timezone_id) as records_with_timezone,
             COUNT(*) - COUNT(timezone_id) as records_without_timezone
      FROM demographic_records
    `);
    
    const demographicData = demographicCheck.rows[0];
    console.log(`   Total demographic records: ${demographicData.total_records}`);
    console.log(`   Records with timezone: ${demographicData.records_with_timezone}`);
    console.log(`   Records without timezone: ${demographicData.records_without_timezone}`);
    
    if (demographicData.records_without_timezone > 0) {
      console.log('   ⚠️ Found records without timezone. Running demographic timezone fix...');
      await updateDemographicTimezones();
    }
    
    // Step 4: Final verification
    console.log('\n4️⃣ Final verification...');
    const finalCheck = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM timezones) as timezone_count,
        (SELECT COUNT(*) FROM states WHERE timezone_id IS NOT NULL) as states_with_timezone,
        (SELECT COUNT(*) FROM demographic_records WHERE timezone_id IS NOT NULL) as demographic_with_timezone
    `);
    
    const finalData = finalCheck.rows[0];
    console.log(`   ✅ Timezones: ${finalData.timezone_count}`);
    console.log(`   ✅ States with timezone: ${finalData.states_with_timezone}`);
    console.log(`   ✅ Demographic records with timezone: ${finalData.demographic_with_timezone}`);
    
    console.log('\n🎉 Timezone setup completed successfully!');
    console.log('   The system is now ready to display timezone information.');
    
  } catch (error) {
    console.error('❌ Error during timezone setup:', error);
    throw error;
  }
}

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
      
      console.log(`   ✅ Updated ${stateCode} to timezone_id ${timezoneId}`);
    }
    
    console.log('✅ State-timezone mappings updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing state timezones:', error);
    throw error;
  }
}

async function updateDemographicTimezones() {
  try {
    console.log('🔧 Updating existing demographic records with timezone information...');
    
    // First, update state_code from state column
    console.log('   Updating state_code from state column...');
    
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
    
    console.log(`   ✅ Updated ${stateCodeUpdateResult.rowCount} records with state codes`);
    
    // Now update timezone_id based on state_code
    console.log('   Updating timezone_id from state_code...');
    
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
    
    console.log(`   ✅ Updated ${timezoneUpdateResult.rowCount} records with timezone information`);
    
    console.log('✅ Demographic timezone update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating demographic timezones:', error);
    throw error;
  }
}

// Run the setup
setupTimezones()
  .then(() => {
    console.log('\n🎉 Timezone setup completed successfully!');
    console.log('   You can now run the following commands:');
    console.log('   - npm run fix:state-timezones (fix state mappings only)');
    console.log('   - npm run fix:demographic-timezones (fix demographic records only)');
    console.log('   - npm run fix:all-timezones (fix both)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Timezone setup failed:', error);
    process.exit(1);
  });
