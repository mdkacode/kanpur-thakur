const db = require('./src/config/database');

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    console.log('=====================================');

    // Check file_uploads table structure
    console.log('📋 file_uploads table structure:');
    const fileUploadsSchema = await db.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      ORDER BY ordinal_position
    `);
    
    fileUploadsSchema.rows.forEach(column => {
      console.log(`   - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.column_default ? `DEFAULT: ${column.column_default}` : ''}`);
    });

    // Check constraints
    console.log('\n🔒 Constraints:');
    const constraints = await db.query(`
      SELECT 
        constraint_name,
        constraint_type,
        table_name
      FROM information_schema.table_constraints 
      WHERE table_name = 'file_uploads'
    `);
    
    constraints.rows.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });

    // Check sequences
    console.log('\n🔄 Sequences:');
    const sequences = await db.query(`
      SELECT 
        sequence_name,
        last_value,
        is_called
      FROM information_schema.sequences 
      WHERE sequence_name LIKE '%file_uploads%'
    `);
    
    sequences.rows.forEach(seq => {
      console.log(`   - ${seq.sequence_name}: last_value=${seq.last_value}, is_called=${seq.is_called}`);
    });

    // Check current data
    console.log('\n📊 Current data:');
    const dataStats = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        MIN(id) as min_id,
        MAX(id) as max_id,
        COUNT(CASE WHEN file_path IS NULL THEN 1 END) as null_file_path_count
      FROM file_uploads
    `);
    
    const stats = dataStats.rows[0];
    console.log(`   - Total records: ${stats.total_records}`);
    console.log(`   - ID range: ${stats.min_id} to ${stats.max_id}`);
    console.log(`   - Records with null file_path: ${stats.null_file_path_count}`);

    // Check for any issues
    console.log('\n🔍 Potential issues:');
    
    if (stats.null_file_path_count > 0) {
      console.log(`   ⚠️ Found ${stats.null_file_path_count} records with null file_path`);
    }
    
    // Check for gaps in ID sequence
    const gaps = await db.query(`
      WITH id_sequence AS (
        SELECT generate_series(
          (SELECT MIN(id) FROM file_uploads),
          (SELECT MAX(id) FROM file_uploads)
        ) as expected_id
      )
      SELECT COUNT(*) as gap_count
      FROM id_sequence
      WHERE expected_id NOT IN (SELECT id FROM file_uploads)
    `);
    
    if (gaps.rows[0].gap_count > 0) {
      console.log(`   ⚠️ Found ${gaps.rows[0].gap_count} gaps in ID sequence`);
    } else {
      console.log(`   ✅ No gaps in ID sequence`);
    }

    console.log('\n🎉 Database schema check completed!');

  } catch (error) {
    console.error('💥 Error checking database schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabaseSchema()
    .then(() => {
      console.log('\n✅ Schema check completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Schema check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseSchema };
