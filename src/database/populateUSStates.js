const db = require('../config/database');

async function populateUSStates() {
    try {
        console.log('🗺️ Starting US States Population...');
        console.log('=====================================');

        // Check if states table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'states'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ States table does not exist. Please run the database seeding first.');
            return;
        }

        console.log('✅ States table found');

        // US States data with regions
        const statesData = [
            ['AL', 'Alabama', 'South'],
            ['AK', 'Alaska', 'West'],
            ['AZ', 'Arizona', 'West'],
            ['AR', 'Arkansas', 'South'],
            ['CA', 'California', 'West'],
            ['CO', 'Colorado', 'West'],
            ['CT', 'Connecticut', 'Northeast'],
            ['DE', 'Delaware', 'Northeast'],
            ['FL', 'Florida', 'South'],
            ['GA', 'Georgia', 'South'],
            ['HI', 'Hawaii', 'West'],
            ['ID', 'Idaho', 'West'],
            ['IL', 'Illinois', 'Midwest'],
            ['IN', 'Indiana', 'Midwest'],
            ['IA', 'Iowa', 'Midwest'],
            ['KS', 'Kansas', 'Midwest'],
            ['KY', 'Kentucky', 'South'],
            ['LA', 'Louisiana', 'South'],
            ['ME', 'Maine', 'Northeast'],
            ['MD', 'Maryland', 'Northeast'],
            ['MA', 'Massachusetts', 'Northeast'],
            ['MI', 'Michigan', 'Midwest'],
            ['MN', 'Minnesota', 'Midwest'],
            ['MS', 'Mississippi', 'South'],
            ['MO', 'Missouri', 'Midwest'],
            ['MT', 'Montana', 'West'],
            ['NE', 'Nebraska', 'Midwest'],
            ['NV', 'Nevada', 'West'],
            ['NH', 'New Hampshire', 'Northeast'],
            ['NJ', 'New Jersey', 'Northeast'],
            ['NM', 'New Mexico', 'West'],
            ['NY', 'New York', 'Northeast'],
            ['NC', 'North Carolina', 'South'],
            ['ND', 'North Dakota', 'Midwest'],
            ['OH', 'Ohio', 'Midwest'],
            ['OK', 'Oklahoma', 'South'],
            ['OR', 'Oregon', 'West'],
            ['PA', 'Pennsylvania', 'Northeast'],
            ['RI', 'Rhode Island', 'Northeast'],
            ['SC', 'South Carolina', 'South'],
            ['SD', 'South Dakota', 'Midwest'],
            ['TN', 'Tennessee', 'South'],
            ['TX', 'Texas', 'South'],
            ['UT', 'Utah', 'West'],
            ['VT', 'Vermont', 'Northeast'],
            ['VA', 'Virginia', 'South'],
            ['WA', 'Washington', 'West'],
            ['WV', 'West Virginia', 'South'],
            ['WI', 'Wisconsin', 'Midwest'],
            ['WY', 'Wyoming', 'West']
        ];

        console.log(`📝 Inserting ${statesData.length} US states...`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (const [state_code, state_name, region] of statesData) {
            try {
                const result = await db.query(`
                    INSERT INTO states (state_code, state_name, region) 
                    VALUES ($1, $2, $3)
                    ON CONFLICT (state_code) DO NOTHING
                    RETURNING id
                `, [state_code, state_name, region]);

                if (result.rows.length > 0) {
                    insertedCount++;
                    console.log(`✅ Inserted: ${state_code} - ${state_name} (${region})`);
                } else {
                    skippedCount++;
                    console.log(`⏭️ Skipped: ${state_code} - ${state_name} (already exists)`);
                }
            } catch (error) {
                console.log(`❌ Error inserting ${state_code}: ${error.message}`);
            }
        }

        // Verify the data
        const verification = await db.query('SELECT COUNT(*) as count FROM states');
        const totalStates = verification.rows[0].count;

        console.log('\n📊 Population Summary:');
        console.log('======================');
        console.log(`✅ Newly inserted: ${insertedCount} states`);
        console.log(`⏭️ Already existed: ${skippedCount} states`);
        console.log(`📈 Total states in database: ${totalStates}`);

        if (totalStates >= 50) {
            console.log('🎉 US States population completed successfully!');
        } else {
            console.log('⚠️ Warning: Expected 50 states, but found ' + totalStates);
        }

    } catch (error) {
        console.error('❌ Error populating US states:', error);
        throw error;
    }
}

// Run the script
populateUSStates();

module.exports = populateUSStates;
