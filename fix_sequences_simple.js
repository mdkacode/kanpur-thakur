const db = require('./src/config/database');

async function fixSequencesSimple() {
  try {
    console.log('🔧 Fixing database sequences (simple version)...');
    console.log('=====================================');

    const tables = [
      'file_uploads',
      'demographic_records', 
      'telecare_records',
      'phone_numbers',
      'filters'
    ];

    for (const table of tables) {
      try {
        console.log(`\n📋 Processing table: ${table}`);
        
        // Check if table exists
        const tableExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (!tableExists.rows[0].exists) {
          console.log(`   ⏭️ Table ${table} does not exist, skipping`);
          continue;
        }

        // Check if table has an ID column
        const hasIdColumn = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'id'
          )
        `, [table]);
        
        if (!hasIdColumn.rows[0].exists) {
          console.log(`   ⏭️ Table ${table} has no ID column, skipping`);
          continue;
        }

        // Get current max ID
        const maxIdResult = await db.query(`SELECT MAX(id) as max_id FROM ${table}`);
        const maxId = maxIdResult.rows[0].max_id;
        
        if (!maxId) {
          console.log(`   ℹ️ Table ${table} is empty, skipping`);
          continue;
        }

        // Check if sequence exists
        const sequenceName = `${table}_id_seq`;
        const sequenceExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.sequences 
            WHERE sequence_name = $1
          )
        `, [sequenceName]);
        
        if (!sequenceExists.rows[0].exists) {
          console.log(`   ⏭️ No sequence found for ${table}, skipping`);
          continue;
        }

        // Get current sequence value
        const sequenceValue = await db.query(`SELECT last_value FROM ${sequenceName}`);
        const currentValue = sequenceValue.rows[0].last_value;
        
        console.log(`   📊 Current max ID: ${maxId}, Sequence value: ${currentValue}`);
        
        // Fix sequence if needed
        if (currentValue <= maxId) {
          const newValue = maxId + 1;
          await db.query(`SELECT setval('${sequenceName}', $1, true)`, [newValue]);
          console.log(`   ✅ Fixed sequence to: ${newValue}`);
        } else {
          console.log(`   ✅ Sequence is already correct`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${table}:`, error.message);
      }
    }

    console.log('\n🎉 All sequences processed!');
    console.log('=====================================');
    console.log('📝 Next steps:');
    console.log('   1. Try uploading a file again');
    console.log('   2. If issues persist, run: npm run check:schema');
    console.log('   3. Check application logs for errors');

  } catch (error) {
    console.error('💥 Error fixing sequences:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixSequencesSimple();
    console.log('\n🎉 Sequence fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { fixSequencesSimple };

// Run if called directly
if (require.main === module) {
  main();
}
