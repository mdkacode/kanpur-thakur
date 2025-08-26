const db = require('../config/database');

// Comprehensive US timezone data
const US_TIMEZONES = [
  // Main US Time Zones
  {
    timezone_name: 'America/New_York',
    display_name: 'Eastern Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Chicago',
    display_name: 'Central Time',
    abbreviation_standard: 'CST',
    abbreviation_daylight: 'CDT',
    utc_offset_standard: -360, // -6 hours in minutes
    utc_offset_daylight: -300, // -5 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Denver',
    display_name: 'Mountain Time',
    abbreviation_standard: 'MST',
    abbreviation_daylight: 'MDT',
    utc_offset_standard: -420, // -7 hours in minutes
    utc_offset_daylight: -360, // -6 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Los_Angeles',
    display_name: 'Pacific Time',
    abbreviation_standard: 'PST',
    abbreviation_daylight: 'PDT',
    utc_offset_standard: -480, // -8 hours in minutes
    utc_offset_daylight: -420, // -7 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Anchorage',
    display_name: 'Alaska Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKDT',
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -480, // -8 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'Pacific/Honolulu',
    display_name: 'Hawaii Time',
    abbreviation_standard: 'HST',
    abbreviation_daylight: 'HST', // Hawaii doesn't observe DST
    utc_offset_standard: -600, // -10 hours in minutes
    utc_offset_daylight: -600, // -10 hours in minutes
    observes_dst: false
  },
  // Special Cases
  {
    timezone_name: 'America/Phoenix',
    display_name: 'Arizona Time',
    abbreviation_standard: 'MST',
    abbreviation_daylight: 'MST', // Arizona doesn't observe DST
    utc_offset_standard: -420, // -7 hours in minutes
    utc_offset_daylight: -420, // -7 hours in minutes
    observes_dst: false
  },
  // US Territories
  {
    timezone_name: 'America/Puerto_Rico',
    display_name: 'Puerto Rico Time',
    abbreviation_standard: 'AST',
    abbreviation_daylight: 'AST', // Puerto Rico doesn't observe DST
    utc_offset_standard: -240, // -4 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: false
  },
  {
    timezone_name: 'America/Guam',
    display_name: 'Guam Time',
    abbreviation_standard: 'ChST',
    abbreviation_daylight: 'ChST', // Guam doesn't observe DST
    utc_offset_standard: 600, // +10 hours in minutes
    utc_offset_daylight: 600, // +10 hours in minutes
    observes_dst: false
  },
  {
    timezone_name: 'Pacific/Saipan',
    display_name: 'Northern Mariana Islands Time',
    abbreviation_standard: 'ChST',
    abbreviation_daylight: 'ChST', // CNMI doesn't observe DST
    utc_offset_standard: 600, // +10 hours in minutes
    utc_offset_daylight: 600, // +10 hours in minutes
    observes_dst: false
  },
  {
    timezone_name: 'America/Adak',
    display_name: 'Aleutian Time',
    abbreviation_standard: 'HST',
    abbreviation_daylight: 'HDT',
    utc_offset_standard: -600, // -10 hours in minutes
    utc_offset_daylight: -540, // -9 hours in minutes
    observes_dst: true
  },
  // Additional State-Specific Timezones
  {
    timezone_name: 'America/Indiana/Indianapolis',
    display_name: 'Indiana Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Indiana/Vincennes',
    display_name: 'Indiana (Vincennes) Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Indiana/Winamac',
    display_name: 'Indiana (Winamac) Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Kentucky/Louisville',
    display_name: 'Kentucky (Louisville) Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Kentucky/Monticello',
    display_name: 'Kentucky (Monticello) Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/North_Dakota/Center',
    display_name: 'North Dakota (Center) Time',
    abbreviation_standard: 'CST',
    abbreviation_daylight: 'CDT',
    utc_offset_standard: -360, // -6 hours in minutes
    utc_offset_daylight: -300, // -5 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/North_Dakota/New_Salem',
    display_name: 'North Dakota (New Salem) Time',
    abbreviation_standard: 'CST',
    abbreviation_daylight: 'CDT',
    utc_offset_standard: -360, // -6 hours in minutes
    utc_offset_daylight: -300, // -5 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/North_Dakota/Beulah',
    display_name: 'North Dakota (Beulah) Time',
    abbreviation_standard: 'CST',
    abbreviation_daylight: 'CDT',
    utc_offset_standard: -360, // -6 hours in minutes
    utc_offset_daylight: -300, // -5 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Detroit',
    display_name: 'Michigan Time',
    abbreviation_standard: 'EST',
    abbreviation_daylight: 'EDT',
    utc_offset_standard: -300, // -5 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Boise',
    display_name: 'Idaho Time',
    abbreviation_standard: 'MST',
    abbreviation_daylight: 'MDT',
    utc_offset_standard: -420, // -7 hours in minutes
    utc_offset_daylight: -360, // -6 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Portland',
    display_name: 'Oregon Time',
    abbreviation_standard: 'PST',
    abbreviation_daylight: 'PDT',
    utc_offset_standard: -480, // -8 hours in minutes
    utc_offset_daylight: -420, // -7 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Seattle',
    display_name: 'Washington Time',
    abbreviation_standard: 'PST',
    abbreviation_daylight: 'PDT',
    utc_offset_standard: -480, // -8 hours in minutes
    utc_offset_daylight: -420, // -7 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Juneau',
    display_name: 'Alaska (Juneau) Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKDT',
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -480, // -8 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Sitka',
    display_name: 'Alaska (Sitka) Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKDT',
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -480, // -8 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Metlakatla',
    display_name: 'Alaska (Metlakatla) Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKST', // Metlakatla doesn't observe DST
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -540, // -9 hours in minutes
    observes_dst: false
  },
  {
    timezone_name: 'America/Yakutat',
    display_name: 'Alaska (Yakutat) Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKDT',
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -480, // -8 hours in minutes
    observes_dst: true
  },
  {
    timezone_name: 'America/Nome',
    display_name: 'Alaska (Nome) Time',
    abbreviation_standard: 'AKST',
    abbreviation_daylight: 'AKDT',
    utc_offset_standard: -540, // -9 hours in minutes
    utc_offset_daylight: -480, // -8 hours in minutes
    observes_dst: true
  },
  // US Virgin Islands
  {
    timezone_name: 'America/St_Thomas',
    display_name: 'US Virgin Islands Time',
    abbreviation_standard: 'AST',
    abbreviation_daylight: 'AST', // USVI doesn't observe DST
    utc_offset_standard: -240, // -4 hours in minutes
    utc_offset_daylight: -240, // -4 hours in minutes
    observes_dst: false
  },
  // American Samoa
  {
    timezone_name: 'Pacific/Pago_Pago',
    display_name: 'American Samoa Time',
    abbreviation_standard: 'SST',
    abbreviation_daylight: 'SST', // American Samoa doesn't observe DST
    utc_offset_standard: -660, // -11 hours in minutes
    utc_offset_daylight: -660, // -11 hours in minutes
    observes_dst: false
  }
];

async function populateUSTimezones() {
  console.log('🌍 Populating US Timezones Database');
  console.log('==================================');
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    
    // Check if timezones table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'timezones'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Timezones table does not exist. Please run the database seeding first.');
      process.exit(1);
    }
    
    console.log('✅ Timezones table found');
    
    // Check existing timezone data
    console.log('📊 Checking existing timezone data...');
    const existingCount = await db.query('SELECT COUNT(*) as count FROM timezones');
    console.log(`📈 Existing timezones: ${existingCount.rows[0].count}`);
    
    if (existingCount.rows[0].count > 0) {
      console.log('ℹ️ Using UPSERT to update existing timezones and add new ones...');
    } else {
      console.log('ℹ️ No existing timezones found, will insert new ones...');
    }
    
    // Insert new timezone data
    console.log('📝 Inserting US timezone data...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const timezone of US_TIMEZONES) {
      try {
        const query = `
          INSERT INTO timezones (
            timezone_name, display_name, abbreviation_standard, abbreviation_daylight,
            utc_offset_standard, utc_offset_daylight, observes_dst,
            offset_hours, offset_minutes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (display_name) DO UPDATE SET
            timezone_name = EXCLUDED.timezone_name,
            abbreviation_standard = EXCLUDED.abbreviation_standard,
            abbreviation_daylight = EXCLUDED.abbreviation_daylight,
            utc_offset_standard = EXCLUDED.utc_offset_standard,
            utc_offset_daylight = EXCLUDED.utc_offset_daylight,
            observes_dst = EXCLUDED.observes_dst,
            offset_hours = EXCLUDED.offset_hours,
            offset_minutes = EXCLUDED.offset_minutes,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, timezone_name, display_name
        `;
        
        const values = [
          timezone.timezone_name,
          timezone.display_name,
          timezone.abbreviation_standard,
          timezone.abbreviation_daylight,
          timezone.utc_offset_standard,
          timezone.utc_offset_daylight,
          timezone.observes_dst,
          Math.floor(timezone.utc_offset_standard / 60), // Convert minutes to hours
          Math.abs(timezone.utc_offset_standard % 60) // Remainder minutes (absolute value)
        ];
        
        const result = await db.query(query, values);
        insertedCount++;
        
        console.log(`✅ Inserted: ${result.rows[0].display_name} (${result.rows[0].timezone_name})`);
        
      } catch (error) {
        console.error(`❌ Error inserting ${timezone.display_name}:`, error.message);
        skippedCount++;
      }
    }
    
    // Verify the data
    console.log('\n📊 Verification:');
    const verificationQuery = await db.query('SELECT COUNT(*) as count FROM timezones');
    const totalCount = verificationQuery.rows[0].count;
    
    console.log(`📈 Total timezones in database: ${totalCount}`);
    console.log(`✅ Successfully inserted: ${insertedCount}`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped: ${skippedCount}`);
    }
    
    // Show sample data
    console.log('\n📋 Sample timezone data:');
    const sampleQuery = await db.query(`
      SELECT id, timezone_name, display_name, abbreviation_standard, 
             utc_offset_standard, observes_dst
      FROM timezones 
      ORDER BY id 
      LIMIT 10
    `);
    
    sampleQuery.rows.forEach(row => {
      const offsetHours = Math.floor(row.utc_offset_standard / 60);
      const offsetMinutes = Math.abs(row.utc_offset_standard % 60);
      const offsetStr = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}:${offsetMinutes.toString().padStart(2, '0')}`;
      
      console.log(`  ${row.id}. ${row.display_name} (${row.abbreviation_standard}) - ${offsetStr} - DST: ${row.observes_dst ? 'Yes' : 'No'}`);
    });
    
    console.log('\n🎉 US Timezones population completed successfully!');
    console.log('\n📋 Available timezones:');
    
    const allTimezones = await db.query(`
      SELECT id, display_name, abbreviation_standard, 
             CASE WHEN utc_offset_standard >= 0 THEN '+' ELSE '' END || 
             FLOOR(utc_offset_standard / 60) || ':' || 
             LPAD(ABS(utc_offset_standard % 60)::text, 2, '0') as offset
      FROM timezones 
      ORDER BY utc_offset_standard DESC, display_name
    `);
    
    allTimezones.rows.forEach(row => {
      console.log(`  ${row.id.toString().padStart(2)}. ${row.display_name.padEnd(25)} ${row.abbreviation_standard} ${row.offset}`);
    });
    
  } catch (error) {
    console.error('❌ Error populating US timezones:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
populateUSTimezones();
