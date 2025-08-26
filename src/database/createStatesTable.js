const db = require('../config/database');

async function createStatesTable() {
    try {
        console.log('🔄 Creating states table with timezone associations...');
        
        // Create states table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS states (
                id SERIAL PRIMARY KEY,
                state_code VARCHAR(2) UNIQUE NOT NULL,
                state_name VARCHAR(50) NOT NULL,
                region VARCHAR(50),
                timezone_id INTEGER REFERENCES timezones(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add timezone_id column if it doesn't exist
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'states' AND column_name = 'timezone_id'
                ) THEN
                    ALTER TABLE states ADD COLUMN timezone_id INTEGER REFERENCES timezones(id);
                END IF;
            END $$;
        `);
        
        console.log('✅ States table created successfully');
        
        // Insert US states with their default timezones
        const statesData = [
            // Eastern Time States (EST/EDT) - timezone_id 7
            { code: 'CT', name: 'Connecticut', timezone_id: 7 },
            { code: 'DE', name: 'Delaware', timezone_id: 7 },
            { code: 'FL', name: 'Florida', timezone_id: 7 },
            { code: 'GA', name: 'Georgia', timezone_id: 7 },
            { code: 'IN', name: 'Indiana', timezone_id: 7 },
            { code: 'KY', name: 'Kentucky', timezone_id: 7 },
            { code: 'ME', name: 'Maine', timezone_id: 7 },
            { code: 'MD', name: 'Maryland', timezone_id: 7 },
            { code: 'MA', name: 'Massachusetts', timezone_id: 7 },
            { code: 'MI', name: 'Michigan', timezone_id: 7 },
            { code: 'NH', name: 'New Hampshire', timezone_id: 7 },
            { code: 'NJ', name: 'New Jersey', timezone_id: 7 },
            { code: 'NY', name: 'New York', timezone_id: 7 },
            { code: 'NC', name: 'North Carolina', timezone_id: 7 },
            { code: 'OH', name: 'Ohio', timezone_id: 7 },
            { code: 'PA', name: 'Pennsylvania', timezone_id: 7 },
            { code: 'RI', name: 'Rhode Island', timezone_id: 7 },
            { code: 'SC', name: 'South Carolina', timezone_id: 7 },
            { code: 'TN', name: 'Tennessee', timezone_id: 7 },
            { code: 'VT', name: 'Vermont', timezone_id: 7 },
            { code: 'VA', name: 'Virginia', timezone_id: 7 },
            { code: 'WV', name: 'West Virginia', timezone_id: 7 },
            { code: 'DC', name: 'District of Columbia', timezone_id: 7 },
            
            // Central Time States (CST/CDT) - timezone_id 8
            { code: 'AL', name: 'Alabama', timezone_id: 8 },
            { code: 'AR', name: 'Arkansas', timezone_id: 8 },
            { code: 'IL', name: 'Illinois', timezone_id: 8 },
            { code: 'IA', name: 'Iowa', timezone_id: 8 },
            { code: 'KS', name: 'Kansas', timezone_id: 8 },
            { code: 'LA', name: 'Louisiana', timezone_id: 8 },
            { code: 'MN', name: 'Minnesota', timezone_id: 8 },
            { code: 'MS', name: 'Mississippi', timezone_id: 8 },
            { code: 'MO', name: 'Missouri', timezone_id: 8 },
            { code: 'NE', name: 'Nebraska', timezone_id: 8 },
            { code: 'ND', name: 'North Dakota', timezone_id: 8 },
            { code: 'OK', name: 'Oklahoma', timezone_id: 8 },
            { code: 'SD', name: 'South Dakota', timezone_id: 8 },
            { code: 'TX', name: 'Texas', timezone_id: 8 },
            { code: 'WI', name: 'Wisconsin', timezone_id: 8 },
            
            // Mountain Time States (MST/MDT) - timezone_id 9
            { code: 'CO', name: 'Colorado', timezone_id: 9 },
            { code: 'MT', name: 'Montana', timezone_id: 9 },
            { code: 'NM', name: 'New Mexico', timezone_id: 9 },
            { code: 'UT', name: 'Utah', timezone_id: 9 },
            { code: 'WY', name: 'Wyoming', timezone_id: 9 },
            
            // Special Mountain Time States
            { code: 'AZ', name: 'Arizona', timezone_id: 19 }, // Arizona Time (no DST)
            { code: 'ID', name: 'Idaho', timezone_id: 22 }, // Idaho Time
            
            // Pacific Time States (PST/PDT) - timezone_id 10
            { code: 'CA', name: 'California', timezone_id: 10 },
            { code: 'NV', name: 'Nevada', timezone_id: 10 },
            
            // Special Pacific Time States
            { code: 'OR', name: 'Oregon', timezone_id: 23 }, // Oregon Time
            { code: 'WA', name: 'Washington', timezone_id: 24 }, // Washington Time
            
            // Alaska Time (AKST/AKDT) - timezone_id 11
            { code: 'AK', name: 'Alaska', timezone_id: 11 },
            
            // Hawaii Time (HST/HDT) - timezone_id 12
            { code: 'HI', name: 'Hawaii', timezone_id: 12 },
            
            // Territories
            { code: 'PR', name: 'Puerto Rico', timezone_id: 80 },
            { code: 'GU', name: 'Guam', timezone_id: 81 },
            { code: 'MP', name: 'Northern Mariana Islands', timezone_id: 82 },
            { code: 'VI', name: 'US Virgin Islands', timezone_id: 101 },
            { code: 'AS', name: 'American Samoa', timezone_id: 102 }
        ];
        
        // Insert states with UPSERT
        for (const state of statesData) {
            await db.query(`
                INSERT INTO states (state_code, state_name, timezone_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (state_code) 
                DO UPDATE SET 
                    state_name = EXCLUDED.state_name,
                    timezone_id = EXCLUDED.timezone_id,
                    updated_at = CURRENT_TIMESTAMP
            `, [state.code, state.name, state.timezone_id]);
        }
        
        console.log(`✅ Inserted/updated ${statesData.length} states with timezone associations`);
        
        // Create index for performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_states_state_code ON states(state_code);
            CREATE INDEX IF NOT EXISTS idx_states_timezone_id ON states(timezone_id);
        `);
        
        console.log('✅ States table indexes created');
        
    } catch (error) {
        console.error('❌ Error creating states table:', error);
        throw error;
    }
}

// Run if this script is executed directly
if (require.main === module) {
    createStatesTable()
        .then(() => {
            console.log('✅ States table creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ States table creation failed:', error);
            process.exit(1);
        });
}

module.exports = { createStatesTable };
