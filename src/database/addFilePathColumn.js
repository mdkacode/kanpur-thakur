const db = require('../config/database');

const addFilePathColumn = async () => {
  try {
    console.log('Adding file_path column to file_uploads table...');
    
    // Check if the column already exists
    const checkColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      AND column_name = 'file_path'
    `);
    
    if (checkColumn.rows.length === 0) {
      // Add the file_path column
      await db.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN file_path TEXT
      `);
      console.log('file_path column added successfully');
    } else {
      console.log('file_path column already exists');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error adding file_path column:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  addFilePathColumn()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addFilePathColumn };
