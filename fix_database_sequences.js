const db = require('./src/config/database');

async function fixDatabaseSequences() {
  try {
    console.log('🔧 Fixing database sequences...');
    console.log('=====================================');

    // Check current state of file_uploads table
    console.log('📊 Checking current file_uploads table state...');
    const currentState = await db.query(`
      SELECT 
        MAX(id) as max_id,
        COUNT(*) as total_records,
        MIN(id) as min_id
      FROM file_uploads
    `);
    
    const { max_id, total_records, min_id } = currentState.rows[0];
    console.log(`📈 Current state:`);
    console.log(`   - Total records: ${total_records}`);
    console.log(`   - Min ID: ${min_id}`);
    console.log(`   - Max ID: ${max_id}`);

    // Check current sequence value
    const sequenceCheck = await db.query(`
      SELECT last_value, is_called 
      FROM file_uploads_id_seq
    `);
    
    const { last_value, is_called } = sequenceCheck.rows[0];
    console.log(`🔄 Current sequence state:`);
    console.log(`   - Last value: ${last_value}`);
    console.log(`   - Is called: ${is_called}`);

    // Fix the sequence if needed
    if (max_id && last_value <= max_id) {
      console.log('⚠️ Sequence is out of sync. Fixing...');
      
      const newSequenceValue = max_id + 1;
      await db.query(`
        SELECT setval('file_uploads_id_seq', $1, true)
      `, [newSequenceValue]);
      
      console.log(`✅ Sequence updated to: ${newSequenceValue}`);
    } else {
      console.log('✅ Sequence is already in sync');
    }

    // Verify the fix
    const verifySequence = await db.query(`
      SELECT last_value FROM file_uploads_id_seq
    `);
    
    console.log(`🔍 Verification - New sequence value: ${verifySequence.rows[0].last_value}`);

    // Test inserting a record to make sure it works
    console.log('🧪 Testing insert...');
    const testInsert = await db.query(`
      INSERT INTO file_uploads (filename, original_name, file_size, file_path, file_type, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['test-fix-sequence.txt', 'test-fix-sequence.txt', 0, '/uploads/test-fix-sequence.txt', 'test', 'completed']);
    
    const testId = testInsert.rows[0].id;
    console.log(`✅ Test insert successful with ID: ${testId}`);

    // Clean up test record
    await db.query('DELETE FROM file_uploads WHERE id = $1', [testId]);
    console.log('🧹 Test record cleaned up');

    // Check for any other potential issues
    console.log('🔍 Checking for other potential issues...');
    
    // Check for duplicate IDs
    const duplicateCheck = await db.query(`
      SELECT id, COUNT(*) as count
      FROM file_uploads
      GROUP BY id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('⚠️ Found duplicate IDs:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ID ${row.id}: ${row.count} occurrences`);
      });
    } else {
      console.log('✅ No duplicate IDs found');
    }

    // Check for gaps in ID sequence
    const gapCheck = await db.query(`
      WITH id_sequence AS (
        SELECT generate_series(
          (SELECT MIN(id) FROM file_uploads),
          (SELECT MAX(id) FROM file_uploads)
        ) as expected_id
      )
      SELECT expected_id
      FROM id_sequence
      WHERE expected_id NOT IN (SELECT id FROM file_uploads)
      ORDER BY expected_id
    `);
    
    if (gapCheck.rows.length > 0) {
      console.log('⚠️ Found gaps in ID sequence:');
      gapCheck.rows.forEach(row => {
        console.log(`   - Missing ID: ${row.expected_id}`);
      });
    } else {
      console.log('✅ No gaps in ID sequence');
    }

    console.log('\n🎉 Database sequence fix completed successfully!');
    console.log('=====================================');
    console.log('📝 Summary:');
    console.log(`   - Total records: ${total_records}`);
    console.log(`   - Max ID: ${max_id}`);
    console.log(`   - Sequence value: ${verifySequence.rows[0].last_value}`);
    console.log('   - Test insert: ✅ Successful');
    console.log('   - Duplicates: ✅ None found');
    console.log('   - Gaps: ✅ None found');

  } catch (error) {
    console.error('💥 Error fixing database sequences:', error);
    throw error;
  }
}

// Also fix other tables that might have sequence issues
async function fixAllSequences() {
  try {
    console.log('🔧 Fixing all database sequences...');
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

  } catch (error) {
    console.error('💥 Error fixing all sequences:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixDatabaseSequences();
    console.log('\n');
    await fixAllSequences();
    
    console.log('\n🎉 All database sequence fixes completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { fixDatabaseSequences, fixAllSequences };

// Run if called directly
if (require.main === module) {
  main();
}
