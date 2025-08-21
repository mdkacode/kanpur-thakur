const db = require('../config/database');

const updateColumnTypes = async () => {
  try {
    console.log('Updating column types for consistency...');
    
    // Update error_message to VARCHAR(500) for consistency
    await db.query(`
      ALTER TABLE file_uploads 
      ALTER COLUMN error_message TYPE VARCHAR(500)
    `);
    console.log('✅ Updated error_message to VARCHAR(500)');
    
    // Ensure status is VARCHAR(20)
    await db.query(`
      ALTER TABLE file_uploads 
      ALTER COLUMN status TYPE VARCHAR(20)
    `);
    console.log('✅ Ensured status is VARCHAR(20)');
    
    // Ensure filename and original_name are VARCHAR(255)
    await db.query(`
      ALTER TABLE file_uploads 
      ALTER COLUMN filename TYPE VARCHAR(255),
      ALTER COLUMN original_name TYPE VARCHAR(255)
    `);
    console.log('✅ Ensured filename and original_name are VARCHAR(255)');
    
    // Add constraints for better data integrity
    await db.query(`
      ALTER TABLE file_uploads 
      ADD CONSTRAINT check_status 
      CHECK (status IN ('processing', 'completed', 'failed'))
    `);
    console.log('✅ Added status constraint');
    
    // Add constraint for records_count
    await db.query(`
      ALTER TABLE file_uploads 
      ADD CONSTRAINT check_records_count 
      CHECK (records_count >= 0)
    `);
    console.log('✅ Added records_count constraint');
    
    console.log('✅ All column types updated successfully');
    
  } catch (error) {
    // If constraints already exist, that's fine
    if (error.code === '42710') {
      console.log('ℹ️  Some constraints already exist, continuing...');
    } else {
      console.error('Error updating column types:', error);
      throw error;
    }
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  updateColumnTypes()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { updateColumnTypes };
