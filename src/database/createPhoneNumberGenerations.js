const db = require('../config/database');

async function createPhoneNumberGenerationsTable() {
  try {
    console.log('🔧 Creating phone_number_generations table...');

    // Create the phone_number_generations table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS phone_number_generations (
        id SERIAL PRIMARY KEY,
        generation_name VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        user_name VARCHAR(255),
        filter_criteria JSONB NOT NULL,
        source_zipcodes TEXT[] NOT NULL,
        source_timezone_ids INTEGER[],
        total_records INTEGER NOT NULL DEFAULT 0,
        file_size INTEGER,
        download_count INTEGER NOT NULL DEFAULT 0,
        last_downloaded_at TIMESTAMP,
        csv_filename VARCHAR(500),
        csv_path VARCHAR(1000),
        status VARCHAR(50) NOT NULL DEFAULT 'generated',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('✅ Created phone_number_generations table');

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_phone_generations_user_id ON phone_number_generations(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_phone_generations_created_at ON phone_number_generations(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_phone_generations_status ON phone_number_generations(status);',
      'CREATE INDEX IF NOT EXISTS idx_phone_generations_timezone_ids ON phone_number_generations USING GIN(source_timezone_ids);',
      'CREATE INDEX IF NOT EXISTS idx_phone_generations_zipcodes ON phone_number_generations USING GIN(source_zipcodes);',
    ];

    for (const indexQuery of indexes) {
      await db.query(indexQuery);
    }

    console.log('✅ Created indexes for phone_number_generations table');

    // Create the phone_number_downloads table for tracking individual downloads
    const createDownloadsTableQuery = `
      CREATE TABLE IF NOT EXISTS phone_number_downloads (
        id SERIAL PRIMARY KEY,
        generation_id INTEGER NOT NULL REFERENCES phone_number_generations(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        user_name VARCHAR(255),
        download_type VARCHAR(50) NOT NULL DEFAULT 'csv',
        ip_address INET,
        user_agent TEXT,
        downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createDownloadsTableQuery);
    console.log('✅ Created phone_number_downloads table');

    // Create indexes for downloads table
    const downloadIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_phone_downloads_generation_id ON phone_number_downloads(generation_id);',
      'CREATE INDEX IF NOT EXISTS idx_phone_downloads_user_id ON phone_number_downloads(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_phone_downloads_downloaded_at ON phone_number_downloads(downloaded_at);',
    ];

    for (const indexQuery of downloadIndexes) {
      await db.query(indexQuery);
    }

    console.log('✅ Created indexes for phone_number_downloads table');

    // Create trigger to update updated_at timestamp
    const triggerQuery = `
      CREATE OR REPLACE FUNCTION update_phone_generations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_phone_generations_updated_at ON phone_number_generations;
      CREATE TRIGGER update_phone_generations_updated_at
        BEFORE UPDATE ON phone_number_generations
        FOR EACH ROW
        EXECUTE FUNCTION update_phone_generations_updated_at();
    `;

    await db.query(triggerQuery);
    console.log('✅ Created update trigger for phone_number_generations table');

    console.log('🎉 Phone number generation tracking tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating phone number generation tables:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createPhoneNumberGenerationsTable()
    .then(() => {
      console.log('✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = createPhoneNumberGenerationsTable;
