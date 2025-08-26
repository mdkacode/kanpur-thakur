const db = require('../config/database');

const updatePhoneNumberSchema = async () => {
  try {
    console.log('🔧 Updating phone_numbers table schema...');

    // Check if the phone_numbers table exists
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'phone_numbers' 
      AND table_schema = 'public'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('ℹ️ phone_numbers table does not exist, skipping schema update');
      return;
    }

    // Check if the last_three column already exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'phone_numbers' 
      AND column_name = 'last_three'
      AND table_schema = 'public'
    `);

    if (columnCheck.rows.length === 0) {
      // Add the last_three column
      await db.query(`
        ALTER TABLE phone_numbers 
        ADD COLUMN last_three VARCHAR(3)
      `);
      console.log('✅ Added last_three column to phone_numbers table');
    } else {
      console.log('ℹ️ last_three column already exists in phone_numbers table');
    }

    // Update the full_phone_number column to be VARCHAR(13) to handle 10-digit numbers
    // Use a try-catch to handle cases where the column type is already correct
    try {
      await db.query(`
        ALTER TABLE phone_numbers 
        ALTER COLUMN full_phone_number TYPE VARCHAR(13)
      `);
      console.log('✅ Updated full_phone_number column to support 10-digit numbers');
    } catch (error) {
      if (error.code === '42710') {
        console.log('ℹ️ full_phone_number column type is already correct');
      } else {
        throw error;
      }
    }

    // Add index on last_three column for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_last_three ON phone_numbers(last_three)
    `);
    console.log('✅ Added index on last_three column');

    // Add composite index for zipcode and filter_id for duplicate checking
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_numbers_zip_filter ON phone_numbers(zip, filter_id)
    `);
    console.log('✅ Added composite index on zip and filter_id');

    // Verify the schema changes
    const schemaResult = await db.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'phone_numbers'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 Updated phone_numbers table schema:');
    schemaResult.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${row.column_name}: ${row.data_type}${length} ${nullable}`);
    });

    console.log('✅ Phone number schema update completed successfully');

  } catch (error) {
    console.error('❌ Error updating phone number schema:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  updatePhoneNumberSchema()
    .then(() => {
      console.log('✅ Phone number schema update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phone number schema update failed:', error);
      process.exit(1);
    });
}

module.exports = updatePhoneNumberSchema;
