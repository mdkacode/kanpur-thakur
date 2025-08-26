const db = require('../config/database');

const createCoreTables = async () => {
  try {
    console.log('Creating core application tables...');

    // Create timezones table
    await db.query(`
      CREATE TABLE IF NOT EXISTS timezones (
        id SERIAL PRIMARY KEY,
        timezone_name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        abbreviation_standard VARCHAR(10),
        abbreviation_daylight VARCHAR(10),
        utc_offset_standard VARCHAR(10),
        utc_offset_daylight VARCHAR(10),
        observes_dst BOOLEAN DEFAULT false,
        description TEXT,
        states TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create records table
    await db.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        npa VARCHAR(3) NOT NULL,
        nxx VARCHAR(3) NOT NULL,
        zip VARCHAR(5) NOT NULL,
        state_code VARCHAR(2) NOT NULL,
        city VARCHAR(100),
        rc VARCHAR(100),
        timezone_id INTEGER REFERENCES timezones(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create demographic_records table
    await db.query(`
      CREATE TABLE IF NOT EXISTS demographic_records (
        id SERIAL PRIMARY KEY,
        zipcode VARCHAR(5) NOT NULL,
        state VARCHAR(2) NOT NULL,
        county VARCHAR(100),
        city VARCHAR(100),
        mhhi DECIMAL(12,2),
        avg_hhi DECIMAL(12,2),
        median_age DECIMAL(5,2),
        households INTEGER,
        race_ethnicity_white DECIMAL(5,2),
        race_ethnicity_black DECIMAL(5,2),
        race_ethnicity_hispanic DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_filters table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_filters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filter_type VARCHAR(50) NOT NULL,
        filter_config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create telecare_runs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS telecare_runs (
        run_id VARCHAR(255) PRIMARY KEY,
        zip VARCHAR(5) NOT NULL,
        input_csv_name VARCHAR(255),
        output_csv_name VARCHAR(255),
        script_version VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        row_count INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        error_message TEXT,
        file_refs JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create telecare_output_rows table
    await db.query(`
      CREATE TABLE IF NOT EXISTS telecare_output_rows (
        id SERIAL PRIMARY KEY,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create file_uploads table
    await db.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_size BIGINT,
        file_path VARCHAR(500),
        file_type VARCHAR(50) DEFAULT 'standard',
        status VARCHAR(20) DEFAULT 'processing',
        records_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create download_tracking table
    await db.query(`
      CREATE TABLE IF NOT EXISTS download_tracking (
        id SERIAL PRIMARY KEY,
        filter_criteria JSONB NOT NULL,
        download_count INTEGER DEFAULT 1,
        first_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_records_timezone ON records(timezone_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_demographic_records_zipcode ON demographic_records(zipcode)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_runs_zip ON telecare_runs(zip)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_runs_status ON telecare_runs(status)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status)
    `);

    console.log('✅ Core tables created successfully');

    // Verify tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('timezones', 'records', 'demographic_records', 'user_filters', 'telecare_runs', 'telecare_output_rows', 'file_uploads', 'download_tracking')
      AND table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));

  } catch (error) {
    console.error('❌ Error creating core tables:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createCoreTables()
    .then(() => {
      console.log('✅ Core tables migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Core tables migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createCoreTables };
