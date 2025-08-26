const db = require('../config/database');

async function addDedupeKeyMigration() {
    try {
        console.log('🔧 Starting Dedupe Key Migration...');
        console.log('====================================');

        // 1. Add dedupe_key column to records table
        console.log('\n1️⃣ Adding dedupe_key column to records table...');
        await db.query(`
            ALTER TABLE records 
            ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255);
        `);
        console.log('✅ dedupe_key column added');

        // 2. Create unique index on dedupe_key
        console.log('\n2️⃣ Creating unique index on dedupe_key...');
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_records_dedupe_key 
            ON records (dedupe_key) 
            WHERE dedupe_key IS NOT NULL;
        `);
        console.log('✅ Unique index created on dedupe_key');

        // 3. Add indexes for better performance
        console.log('\n3️⃣ Adding performance indexes...');
        await db.query(`
            -- Composite index for common queries
            CREATE INDEX IF NOT EXISTS idx_records_npa_nxx_zip 
            ON records (npa, nxx, zip);
            
            -- Index for timezone lookups
            CREATE INDEX IF NOT EXISTS idx_records_timezone_id 
            ON records (timezone_id);
            
            -- Index for state/city lookups
            CREATE INDEX IF NOT EXISTS idx_records_state_city 
            ON records (state_code, city);
        `);
        console.log('✅ Performance indexes created');

        // 4. Generate dedupe_keys for existing records
        console.log('\n4️⃣ Generating dedupe_keys for existing records...');
        const existingRecords = await db.query(`
            SELECT id, npa, nxx, zip, state_code, city, county 
            FROM records 
            WHERE dedupe_key IS NULL
        `);

        if (existingRecords.rows.length > 0) {
            console.log(`📝 Found ${existingRecords.rows.length} records without dedupe_key, generating...`);
            
            let updatedCount = 0;
            for (const record of existingRecords.rows) {
                const dedupeKey = generateDedupeKey(record);
                
                await db.query(`
                    UPDATE records 
                    SET dedupe_key = $1 
                    WHERE id = $2
                `, [dedupeKey, record.id]);
                
                updatedCount++;
                
                if (updatedCount % 1000 === 0) {
                    console.log(`📊 Updated ${updatedCount}/${existingRecords.rows.length} records`);
                }
            }
            
            console.log(`✅ Generated dedupe_keys for ${updatedCount} existing records`);
        } else {
            console.log('✅ All existing records already have dedupe_keys');
        }

        // 5. Verify the migration
        console.log('\n5️⃣ Verifying migration...');
        const verification = await db.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(dedupe_key) as records_with_dedupe_key,
                COUNT(DISTINCT dedupe_key) as unique_dedupe_keys
            FROM records
        `);
        
        const stats = verification.rows[0];
        console.log(`📊 Migration verification:`);
        console.log(`   Total records: ${stats.total_records}`);
        console.log(`   Records with dedupe_key: ${stats.records_with_dedupe_key}`);
        console.log(`   Unique dedupe_keys: ${stats.unique_dedupe_keys}`);
        
        if (stats.total_records === stats.records_with_dedupe_key) {
            console.log('✅ All records have dedupe_keys');
        } else {
            console.log('⚠️ Some records are missing dedupe_keys');
        }

        console.log('\n🎉 Dedupe Key Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error during dedupe key migration:', error);
        throw error;
    }
}

/**
 * Generate a deterministic dedupe key for a record
 */
function generateDedupeKey(record) {
    const { npa, nxx, zip, state_code, city, county } = record;
    
    // Create a stable string representation
    const keyParts = [
        npa || '',
        nxx || '',
        zip || '',
        state_code || '',
        city || '',
        county || ''
    ];
    
    // Join with a separator and create a hash
    const keyString = keyParts.join('|');
    
    // Simple hash function (for production, consider using crypto.createHash)
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
        const char = keyString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `rec_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

// Run the migration if this script is executed directly
if (require.main === module) {
    addDedupeKeyMigration()
        .then(() => {
            console.log('✅ Dedupe key migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Dedupe key migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { addDedupeKeyMigration, generateDedupeKey };
