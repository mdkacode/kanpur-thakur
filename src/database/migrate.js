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

    // Create indexes for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx);
      CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip);
      CREATE INDEX IF NOT EXISTS idx_records_state_id ON records(state_id);
      CREATE INDEX IF NOT EXISTS idx_records_state_code ON records(state_code);
      CREATE INDEX IF NOT EXISTS idx_records_city ON records(city);
      CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
      CREATE INDEX IF NOT EXISTS idx_states_code ON states(state_code);
    `);

    // Create file_uploads table
    await db.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path TEXT,
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
      ('DC', 'District of Columbia', 'Northeast'),
      ('AS', 'American Samoa', 'Territory'),
      ('GU', 'Guam', 'Territory'),
      ('MP', 'Northern Mariana Islands', 'Territory'),
      ('PR', 'Puerto Rico', 'Territory'),
      ('VI', 'U.S. Virgin Islands', 'Territory')
      ON CONFLICT (state_code) DO NOTHING
    `);

    console.log('Database tables created successfully');
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
