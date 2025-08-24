const db = require('../config/database');

const createTables = async () => {
  try {
    // Create states table first
    await db.query(`
      CREATE TABLE IF NOT EXISTS states (
        id SERIAL PRIMARY KEY,
        state_code VARCHAR(2) UNIQUE NOT NULL,
        state_name VARCHAR(50) NOT NULL,
        region VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create records table with foreign key to states
    await db.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        npa VARCHAR(3) NOT NULL,
        nxx VARCHAR(3) NOT NULL,
        zip VARCHAR(5) NOT NULL,
        state_id INTEGER REFERENCES states(id),
        state_code VARCHAR(2) NOT NULL,
        city TEXT NOT NULL,
        rc TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create demographic_records table for demographic data
    await db.query(`
      CREATE TABLE IF NOT EXISTS demographic_records (
        id SERIAL PRIMARY KEY,
        zipcode VARCHAR(10) NOT NULL,
        state VARCHAR(50),
        county VARCHAR(100),
        city VARCHAR(100),
        mhhi TEXT,
        mhhi_moe TEXT,
        avg_hhi TEXT,
        avg_hhi_moe TEXT,
        pc_income TEXT,
        pc_income_moe TEXT,
        pct_hh_w_income_200k_plus TEXT,
        pct_hh_w_income_200k_plus_moe TEXT,
        mhhi_hhldr_u25 TEXT,
        mhhi_hhldr_u25_moe TEXT,
        mhhi_hhldr_25_44 TEXT,
        mhhi_hhldr_25_44_moe TEXT,
        mhhi_hhldr_45_64 TEXT,
        mhhi_hhldr_45_64_moe TEXT,
        mhhi_hhldr_65_plus TEXT,
        mhhi_hhldr_65_plus_moe TEXT,
        hhi_total_hh TEXT,
        hhi_hh_w_lt_25k TEXT,
        hhi_hh_w_25k_49k TEXT,
        hhi_hh_w_50k_74k TEXT,
        hhi_hh_w_75k_99k TEXT,
        hhi_hh_w_100k_149k TEXT,
        hhi_hh_w_150k_199k TEXT,
        hhi_hh_w_200k_plus TEXT,
        race_ethnicity_total TEXT,
        race_ethnicity_white TEXT,
        race_ethnicity_black TEXT,
        race_ethnicity_native TEXT,
        race_ethnicity_asian TEXT,
        race_ethnicity_islander TEXT,
        race_ethnicity_other TEXT,
        race_ethnicity_two TEXT,
        race_ethnicity_hispanic TEXT,
        pop_dens_sq_mi TEXT,
        age_total TEXT,
        age_f_0_9 TEXT,
        age_f_10_19 TEXT,
        age_f_20_29 TEXT,
        age_f_30_39 TEXT,
        age_f_40_49 TEXT,
        age_f_50_59 TEXT,
        age_f_60_69 TEXT,
        age_f_70_plus TEXT,
        age_m_0_9 TEXT,
        age_m_10_19 TEXT,
        age_m_20_29 TEXT,
        age_m_30_39 TEXT,
        age_m_40_49 TEXT,
        age_m_50_59 TEXT,
        age_m_60_69 TEXT,
        age_m_70_plus TEXT,
        median_age TEXT,
        edu_att_pop_25_plus TEXT,
        edu_att_no_diploma TEXT,
        edu_att_high_school TEXT,
        edu_att_some_college TEXT,
        edu_att_bachelors TEXT,
        edu_att_graduate TEXT,
        family_hh_total TEXT,
        family_poverty_pct TEXT,
        emp_status_civ_labor_force TEXT,
        unemployment_pct TEXT,
        housing_units TEXT,
        occupied_units TEXT,
        owner_occupied TEXT,
        renter_occupied TEXT,
        median_value_owner_occupied_units TEXT,
        households TEXT,
        hh_families TEXT,
        hh_mc_families TEXT,
        hh_mc_with_own_children_under_18 TEXT,
        hh_sp_families TEXT,
        hh_sp_with_own_children_under_18 TEXT,
        hh_non_families TEXT,
        aland_sq_mi TEXT,
        geoid TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx);
      CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip);
      CREATE INDEX IF NOT EXISTS idx_records_state_id ON records(state_id);
      CREATE INDEX IF NOT EXISTS idx_records_state_code ON records(state_code);
      CREATE INDEX IF NOT EXISTS idx_records_city ON records(city);
      CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
      CREATE INDEX IF NOT EXISTS idx_states_code ON states(state_code);
      
      CREATE INDEX IF NOT EXISTS idx_demographic_records_zipcode ON demographic_records(zipcode);
      CREATE INDEX IF NOT EXISTS idx_demographic_records_state ON demographic_records(state);
      CREATE INDEX IF NOT EXISTS idx_demographic_records_county ON demographic_records(county);
      CREATE INDEX IF NOT EXISTS idx_demographic_records_city ON demographic_records(city);
      CREATE INDEX IF NOT EXISTS idx_demographic_records_created_at ON demographic_records(created_at);
    `);

    // Create file_uploads table
    await db.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path TEXT,
        file_type VARCHAR(50) DEFAULT 'standard',
        status VARCHAR(20) DEFAULT 'processing',
        records_count INTEGER DEFAULT 0,
        error_message VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create download_tracking table
    await db.query(`
      CREATE TABLE IF NOT EXISTS download_tracking (
        id SERIAL PRIMARY KEY,
        filter_name VARCHAR(100) NOT NULL,
        filter_criteria JSONB NOT NULL,
        download_count INTEGER DEFAULT 1,
        total_records INTEGER NOT NULL,
        file_size BIGINT,
        last_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add file_path column if it doesn't exist
    const checkColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      AND column_name = 'file_path'
    `);
    
    if (checkColumn.rows.length === 0) {
      await db.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN file_path TEXT
      `);
    }

    // Add file_type column if it doesn't exist
    const checkFileTypeColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      AND column_name = 'file_type'
    `);
    
    if (checkFileTypeColumn.rows.length === 0) {
      await db.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN file_type VARCHAR(50) DEFAULT 'standard'
      `);
    }

    // Insert default states data
    await db.query(`
      INSERT INTO states (state_code, state_name, region) VALUES
      ('AL', 'Alabama', 'Southeast'),
      ('AK', 'Alaska', 'West'),
      ('AZ', 'Arizona', 'Southwest'),
      ('AR', 'Arkansas', 'South Central'),
      ('CA', 'California', 'West'),
      ('CO', 'Colorado', 'Mountain'),
      ('CT', 'Connecticut', 'Northeast'),
      ('DE', 'Delaware', 'Northeast'),
      ('FL', 'Florida', 'Southeast'),
      ('GA', 'Georgia', 'Southeast'),
      ('HI', 'Hawaii', 'West'),
      ('ID', 'Idaho', 'Mountain'),
      ('IL', 'Illinois', 'Midwest'),
      ('IN', 'Indiana', 'Midwest'),
      ('IA', 'Iowa', 'Midwest'),
      ('KS', 'Kansas', 'Midwest'),
      ('KY', 'Kentucky', 'Southeast'),
      ('LA', 'Louisiana', 'South Central'),
      ('ME', 'Maine', 'Northeast'),
      ('MD', 'Maryland', 'Northeast'),
      ('MA', 'Massachusetts', 'Northeast'),
      ('MI', 'Michigan', 'Midwest'),
      ('MN', 'Minnesota', 'Midwest'),
      ('MS', 'Mississippi', 'Southeast'),
      ('MO', 'Missouri', 'Midwest'),
      ('MT', 'Montana', 'Mountain'),
      ('NE', 'Nebraska', 'Midwest'),
      ('NV', 'Nevada', 'West'),
      ('NH', 'New Hampshire', 'Northeast'),
      ('NJ', 'New Jersey', 'Northeast'),
      ('NM', 'New Mexico', 'Southwest'),
      ('NY', 'New York', 'Northeast'),
      ('NC', 'North Carolina', 'Southeast'),
      ('ND', 'North Dakota', 'Midwest'),
      ('OH', 'Ohio', 'Midwest'),
      ('OK', 'Oklahoma', 'South Central'),
      ('OR', 'Oregon', 'West'),
      ('PA', 'Pennsylvania', 'Northeast'),
      ('RI', 'Rhode Island', 'Northeast'),
      ('SC', 'South Carolina', 'Southeast'),
      ('SD', 'South Dakota', 'Midwest'),
      ('TN', 'Tennessee', 'Southeast'),
      ('TX', 'Texas', 'South Central'),
      ('UT', 'Utah', 'Mountain'),
      ('VT', 'Vermont', 'Northeast'),
      ('VA', 'Virginia', 'Southeast'),
      ('WA', 'Washington', 'West'),
      ('WV', 'West Virginia', 'Southeast'),
      ('WI', 'Wisconsin', 'Midwest'),
      ('WY', 'Wyoming', 'Mountain'),
      ('DC', 'District of Columbia', 'Northeast')
      ON CONFLICT (state_code) DO NOTHING
    `);

    console.log('Database tables created successfully');
    return true;

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const dropTables = async () => {
  try {
    await db.query('DROP TABLE IF EXISTS records CASCADE');
    await db.query('DROP TABLE IF EXISTS file_uploads CASCADE');
    await db.query('DROP TABLE IF EXISTS states CASCADE');
    console.log('Database tables dropped successfully');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
};

// Run migrations
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'drop') {
    dropTables().then(() => process.exit(0));
  } else {
    createTables().then(() => process.exit(0));
  }
}

module.exports = { createTables, dropTables };
