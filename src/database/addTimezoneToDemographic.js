const db = require('../config/database');

async function addTimezoneToDemographic() {
  try {
    console.log('🔧 Adding timezone_id column to demographic_records table...');
    
    // Check if timezone_id column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'demographic_records' 
      AND column_name = 'timezone_id'
    `;
    
    const checkResult = await db.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      // Add timezone_id column
      await db.query(`
        ALTER TABLE demographic_records 
        ADD COLUMN timezone_id INTEGER REFERENCES timezones(id)
      `);
      console.log('✅ Added timezone_id column to demographic_records table');
    } else {
      console.log('ℹ️ timezone_id column already exists');
    }
    
    // State to timezone mapping
    const stateToTimezoneMap = {
      'Alabama': 22, // Central Time (CDT)
      'Alaska': 26, // Alaska Time (AKDT)
      'Arizona': 24, // Mountain Standard Time (MST)
      'Arkansas': 22, // Central Time (CDT)
      'California': 25, // Pacific Time (PDT)
      'Colorado': 23, // Mountain Time (MDT)
      'Connecticut': 21, // Eastern Time (EDT)
      'Delaware': 21, // Eastern Time (EDT)
      'District of Columbia': 21, // Eastern Time (EDT)
      'Florida': 40, // Eastern Time (Florida) (EDT)
      'Georgia': 21, // Eastern Time (EDT)
      'Hawaii': 27, // Hawaii-Aleutian Standard Time (HST)
      'Idaho': 52, // Mountain Time (Idaho) (MDT)
      'Illinois': 22, // Central Time (CDT)
      'Indiana': 32, // Eastern Time (Indiana) (EDT)
      'Iowa': 22, // Central Time (CDT)
      'Kansas': 46, // Central Time (Kansas) (CDT)
      'Kentucky': 38, // Eastern Time (Kentucky) (EDT)
      'Louisiana': 22, // Central Time (CDT)
      'Maine': 21, // Eastern Time (EDT)
      'Maryland': 21, // Eastern Time (EDT)
      'Massachusetts': 21, // Eastern Time (EDT)
      'Michigan': 34, // Eastern Time (Michigan) (EDT)
      'Minnesota': 22, // Central Time (CDT)
      'Mississippi': 22, // Central Time (CDT)
      'Missouri': 22, // Central Time (CDT)
      'Montana': 23, // Mountain Time (MDT)
      'Nebraska': 48, // Central Time (Nebraska) (CDT)
      'Nevada': 25, // Pacific Time (PDT)
      'New Hampshire': 21, // Eastern Time (EDT)
      'New Jersey': 21, // Eastern Time (EDT)
      'New Mexico': 23, // Mountain Time (MDT)
      'New York': 21, // Eastern Time (EDT)
      'North Carolina': 21, // Eastern Time (EDT)
      'North Dakota': 36, // Central Time (North Dakota) (CDT)
      'Ohio': 21, // Eastern Time (EDT)
      'Oklahoma': 22, // Central Time (CDT)
      'Oregon': 54, // Pacific Time (Oregon) (PDT)
      'Pennsylvania': 21, // Eastern Time (EDT)
      'Rhode Island': 21, // Eastern Time (EDT)
      'South Carolina': 21, // Eastern Time (EDT)
      'South Dakota': 50, // Central Time (South Dakota) (CDT)
      'Tennessee': 44, // Eastern Time (Tennessee) (EDT)
      'Texas': 42, // Central Time (Texas) (CDT)
      'Utah': 23, // Mountain Time (MDT)
      'Vermont': 21, // Eastern Time (EDT)
      'Virginia': 21, // Eastern Time (EDT)
      'Washington': 25, // Pacific Time (PDT)
      'West Virginia': 21, // Eastern Time (EDT)
      'Wisconsin': 22, // Central Time (CDT)
      'Wyoming': 23, // Mountain Time (MDT)
    };
    
    console.log('🔧 Populating timezone_id for existing records...');
    
    // Get all unique states from demographic_records
    const statesResult = await db.query('SELECT DISTINCT state FROM demographic_records WHERE state IS NOT NULL');
    const states = statesResult.rows.map(row => row.state);
    
    console.log(`📊 Found ${states.length} unique states:`, states);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const state of states) {
      const timezoneId = stateToTimezoneMap[state];
      
      if (timezoneId) {
        const updateResult = await db.query(
          'UPDATE demographic_records SET timezone_id = $1 WHERE state = $2 AND timezone_id IS NULL',
          [timezoneId, state]
        );
        updatedCount += updateResult.rowCount;
        console.log(`✅ Updated ${updateResult.rowCount} records for state: ${state} -> timezone_id: ${timezoneId}`);
      } else {
        console.log(`⚠️ No timezone mapping found for state: ${state}`);
        skippedCount++;
      }
    }
    
    console.log(`✅ Migration completed!`);
    console.log(`📊 Updated ${updatedCount} records`);
    console.log(`⚠️ Skipped ${skippedCount} states without timezone mapping`);
    
    // Verify the update
    const verifyResult = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(timezone_id) as records_with_timezone,
        COUNT(*) - COUNT(timezone_id) as records_without_timezone
      FROM demographic_records
    `);
    
    const stats = verifyResult.rows[0];
    console.log(`📊 Verification:`);
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Records with timezone: ${stats.records_with_timezone}`);
    console.log(`   Records without timezone: ${stats.records_without_timezone}`);
    
  } catch (error) {
    console.error('❌ Error in addTimezoneToDemographic:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addTimezoneToDemographic()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addTimezoneToDemographic;
