const db = require('../config/database');

const createPhoneNumberTables = async () => {
  try {
    console.log('Creating phone number generation tables...');

    // Create phone_number_jobs table for tracking generation jobs
    await db.query(`
      CREATE TABLE IF NOT EXISTS phone_number_jobs (
        job_id VARCHAR(255) PRIMARY KEY,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        filter_id INTEGER REFERENCES user_filters(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        total_numbers INTEGER DEFAULT 0,
        generated_numbers INTEGER DEFAULT 0,
        failed_numbers INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
      )
    `);

    // Create phone_numbers table for storing generated phone numbers
    await db.query(`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) NOT NULL REFERENCES phone_number_jobs(job_id) ON DELETE CASCADE,
        run_id VARCHAR(255) REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        npa VARCHAR(3) NOT NULL,
        nxx VARCHAR(3) NOT NULL,
        thousands VARCHAR(3) NOT NULL,
        full_phone_number VARCHAR(10) NOT NULL,
        state VARCHAR(2) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        company_type VARCHAR(50),
        company VARCHAR(255),
        ratecenter VARCHAR(100),
        filter_id INTEGER REFERENCES user_filters(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(full_phone_number, job_id)
      )
    `);

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_run_id ON phone_number_jobs(run_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_zip ON phone_number_jobs(zip)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_number_jobs_status ON phone_number_jobs(status)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_job_id ON phone_numbers(job_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_run_id ON phone_numbers(run_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_zip ON phone_numbers(zip)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_full_phone ON phone_numbers(full_phone_number)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_state ON phone_numbers(state)
    `);

    console.log('✅ Phone number tables created successfully');

    // Verify tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('phone_number_jobs', 'phone_numbers')
      AND table_schema = 'public'
    `);

    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));

  } catch (error) {
    console.error('❌ Error creating phone number tables:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createPhoneNumberTables()
    .then(() => {
      console.log('✅ Phone number migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phone number migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createPhoneNumberTables };
