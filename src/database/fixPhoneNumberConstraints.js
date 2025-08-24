const db = require('../config/database');

const fixPhoneNumberConstraints = async () => {
  try {
    console.log('🔧 Fixing phone number table constraints...');

    // Check if tables exist first
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('phone_number_jobs', 'phone_numbers')
      AND table_schema = 'public'
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️ Phone number tables do not exist. Run migratePhoneNumbers.js first.');
      return;
    }

    console.log('Found existing tables:', tablesResult.rows.map(row => row.table_name));

    // Drop existing foreign key constraints
    console.log('Dropping existing foreign key constraints...');
    
    try {
      // Drop constraint on phone_number_jobs
      await db.query(`
        ALTER TABLE phone_number_jobs 
        DROP CONSTRAINT IF EXISTS phone_number_jobs_run_id_fkey
      `);
      console.log('✅ Dropped constraint on phone_number_jobs.run_id');
    } catch (error) {
      console.log('ℹ️ No constraint to drop on phone_number_jobs.run_id');
    }

    try {
      // Drop constraint on phone_numbers
      await db.query(`
        ALTER TABLE phone_numbers 
        DROP CONSTRAINT IF EXISTS phone_numbers_run_id_fkey
      `);
      console.log('✅ Dropped constraint on phone_numbers.run_id');
    } catch (error) {
      console.log('ℹ️ No constraint to drop on phone_numbers.run_id');
    }

    // Add new nullable foreign key constraints
    console.log('Adding new nullable foreign key constraints...');
    
    // First make the columns nullable
    await db.query(`
      ALTER TABLE phone_number_jobs 
      ALTER COLUMN run_id DROP NOT NULL
    `);
    console.log('✅ Made phone_number_jobs.run_id nullable');

    await db.query(`
      ALTER TABLE phone_numbers 
      ALTER COLUMN run_id DROP NOT NULL
    `);
    console.log('✅ Made phone_numbers.run_id nullable');
    
    await db.query(`
      ALTER TABLE phone_number_jobs 
      ADD CONSTRAINT phone_number_jobs_run_id_fkey 
      FOREIGN KEY (run_id) REFERENCES telecare_runs(run_id) ON DELETE CASCADE
    `);
    console.log('✅ Added nullable constraint on phone_number_jobs.run_id');

    await db.query(`
      ALTER TABLE phone_numbers 
      ADD CONSTRAINT phone_numbers_run_id_fkey 
      FOREIGN KEY (run_id) REFERENCES telecare_runs(run_id) ON DELETE CASCADE
    `);
    console.log('✅ Added nullable constraint on phone_numbers.run_id');

    // Verify the changes
    const constraintsResult = await db.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.is_nullable
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.columns rc 
        ON rc.table_name = tc.table_name AND rc.column_name = kcu.column_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('phone_number_jobs', 'phone_numbers')
        AND kcu.column_name = 'run_id'
    `);

    console.log('📋 Current foreign key constraints:');
    constraintsResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} (nullable: ${row.is_nullable})`);
    });

    console.log('✅ Phone number constraints fixed successfully');

  } catch (error) {
    console.error('❌ Error fixing phone number constraints:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  fixPhoneNumberConstraints()
    .then(() => {
      console.log('✅ Phone number constraints migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phone number constraints migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPhoneNumberConstraints };
