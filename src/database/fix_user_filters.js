const db = require('../config/database');

async function fixUserFiltersTable() {
  console.log('🔧 Fixing user_filters table schema...');
  
  try {
    // Check if columns exist first
    const checkColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_filters' 
      AND column_name IN ('user_id', 'filter_type', 'is_active')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Existing columns:', existingColumns);
    
    // Add missing columns
    if (!existingColumns.includes('user_id')) {
      console.log('➕ Adding user_id column...');
      await db.query('ALTER TABLE user_filters ADD COLUMN user_id INTEGER');
    }
    
    if (!existingColumns.includes('filter_type')) {
      console.log('➕ Adding filter_type column...');
      await db.query('ALTER TABLE user_filters ADD COLUMN filter_type VARCHAR(50) DEFAULT \'demographic\'');
    }
    
    if (!existingColumns.includes('is_active')) {
      console.log('➕ Adding is_active column...');
      await db.query('ALTER TABLE user_filters ADD COLUMN is_active BOOLEAN DEFAULT true');
    }
    
    console.log('✅ user_filters table schema fixed successfully!');
    
    // Verify the table structure
    const tableInfo = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_filters'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Final table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing user_filters table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixUserFiltersTable()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserFiltersTable };
