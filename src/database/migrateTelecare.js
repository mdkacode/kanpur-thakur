const db = require('../config/database');

const createTelecareTables = async () => {
  try {
    console.log('Creating telecare tables...');

    // Create telecare_runs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS telecare_runs (
        run_id VARCHAR(255) PRIMARY KEY,
        zip VARCHAR(5) NOT NULL,
        input_csv_name VARCHAR(255) NOT NULL,
        output_csv_name VARCHAR(255) NOT NULL,
        row_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'processing',
        script_version VARCHAR(100),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        file_refs JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_status CHECK (status IN ('processing', 'success', 'error'))
      )
    `);

    // Create telecare_output_rows table
    await db.query(`
      CREATE TABLE IF NOT EXISTS telecare_output_rows (
        id SERIAL PRIMARY KEY,
        run_id VARCHAR(255) NOT NULL REFERENCES telecare_runs(run_id) ON DELETE CASCADE,
        zip VARCHAR(5) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_runs_zip ON telecare_runs(zip)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_runs_zip_started ON telecare_runs(zip, started_at DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_runs_status ON telecare_runs(status)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_output_rows_run_id ON telecare_output_rows(run_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_telecare_output_rows_zip ON telecare_output_rows(zip)
    `);

    console.log('✅ Telecare tables created successfully');

    // Verify tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('telecare_runs', 'telecare_output_rows')
      AND table_schema = 'public'
    `);

    console.log('Created tables:', tablesResult.rows.map(row => row.table_name));

  } catch (error) {
    console.error('❌ Error creating telecare tables:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createTelecareTables()
    .then(() => {
      console.log('🎉 Telecare migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Telecare migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTelecareTables };
