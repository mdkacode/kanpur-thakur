const db = require('../config/database');

const fixColumnTypes = async () => {
  try {
    console.log('Fixing column types in file_uploads table...');
    
    // Check current column types
    const checkColumns = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads'
      ORDER BY ordinal_position
    `);
    
    console.log('Current column types:');
    checkColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });
    
    // Fix status column type if needed
    const statusColumn = checkColumns.rows.find(col => col.column_name === 'status');
    if (statusColumn && statusColumn.data_type === 'character varying' && statusColumn.character_maximum_length === 20) {
      console.log('Status column type is correct');
    } else {
      console.log('Updating status column type...');
      await db.query(`
        ALTER TABLE file_uploads 
        ALTER COLUMN status TYPE VARCHAR(20)
      `);
      console.log('Status column type updated');
    }
    
    // Fix error_message column type if needed
    const errorColumn = checkColumns.rows.find(col => col.column_name === 'error_message');
    if (errorColumn && errorColumn.data_type === 'text') {
      console.log('Error message column type is correct');
    } else {
      console.log('Updating error_message column type...');
      await db.query(`
        ALTER TABLE file_uploads 
        ALTER COLUMN error_message TYPE TEXT
      `);
      console.log('Error message column type updated');
    }
    
    console.log('Column types fixed successfully');
  } catch (error) {
    console.error('Error fixing column types:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  fixColumnTypes()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixColumnTypes };
