const db = require('../config/database');

const recreateFileUploadsTable = async () => {
  try {
    console.log('Recreating file_uploads table with consistent VARCHAR types...');
    
    // Drop the existing table
    await db.query('DROP TABLE IF EXISTS file_uploads CASCADE');
    console.log('✅ Dropped existing file_uploads table');
    
    // Create new table with consistent VARCHAR types
    await db.query(`
      CREATE TABLE file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path VARCHAR(500),
        records_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'processing',
        error_message VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        CONSTRAINT check_status CHECK (status IN ('processing', 'completed', 'failed')),
        CONSTRAINT check_records_count CHECK (records_count >= 0)
      )
    `);
    console.log('✅ Created new file_uploads table with consistent types');
    
    // Create indexes
    await db.query(`
      CREATE INDEX idx_file_uploads_status ON file_uploads(status);
      CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
      CREATE INDEX idx_file_uploads_filename ON file_uploads(filename);
    `);
    console.log('✅ Created indexes for file_uploads table');
    
    console.log('✅ File uploads table recreated successfully');
    
  } catch (error) {
    console.error('Error recreating file_uploads table:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  recreateFileUploadsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { recreateFileUploadsTable };
