const db = require('../config/database');

async function removeLastThreeColumn() {
    try {
        console.log('🔄 Removing last_three column from phone_numbers table...');
        
        // Check if the last_three column exists
        const checkResult = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'phone_numbers' AND column_name = 'last_three'
        `);
        
        if (checkResult.rows.length === 0) {
            console.log('ℹ️ last_three column does not exist in phone_numbers table');
            return;
        }
        
        // Drop the index on last_three column if it exists
        try {
            await db.query(`DROP INDEX IF EXISTS idx_phone_numbers_last_three`);
            console.log('✅ Dropped index on last_three column');
        } catch (error) {
            console.log('ℹ️ No index found on last_three column');
        }
        
        // Remove the last_three column
        await db.query(`ALTER TABLE phone_numbers DROP COLUMN last_three`);
        console.log('✅ Removed last_three column from phone_numbers table');
        
        console.log('✅ Migration completed successfully');
        
    } catch (error) {
        console.error('❌ Error removing last_three column:', error);
        throw error;
    }
}

// Run if this script is executed directly
if (require.main === module) {
    removeLastThreeColumn()
        .then(() => {
            console.log('✅ last_three column removal completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ last_three column removal failed:', error);
            process.exit(1);
        });
}

module.exports = { removeLastThreeColumn };
