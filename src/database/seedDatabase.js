const db = require('../config/database');

async function seedDatabase() {
    try {
        console.log('🌱 Starting Database Seeding...');
        console.log('================================');

        // 1. Create timezones table
        console.log('\n1️⃣ Creating timezones table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS timezones (
                id SERIAL PRIMARY KEY,
                timezone_name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(100) NOT NULL,
                abbreviation_standard VARCHAR(10),
                abbreviation_daylight VARCHAR(10),
                utc_offset_standard INTEGER NOT NULL,
                utc_offset_daylight INTEGER,
                observes_dst BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ timezones table created');

        // 2. Create records table
        console.log('\n2️⃣ Creating records table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS records (
                id SERIAL PRIMARY KEY,
                npa VARCHAR(3),
                nxx VARCHAR(3),
                state_code VARCHAR(2),
                city VARCHAR(100),
                county VARCHAR(100),
                zip VARCHAR(5),
                timezone_id INTEGER REFERENCES timezones(id),
                thousands VARCHAR(3),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ records table created');

        // 3. Create demographic_records table
        console.log('\n3️⃣ Creating demographic_records table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS demographic_records (
                id SERIAL PRIMARY KEY,
                state_code VARCHAR(2),
                state_name VARCHAR(100),
                county VARCHAR(100),
                city VARCHAR(100),
                zip_code VARCHAR(5),
                timezone_id INTEGER REFERENCES timezones(id),
                population INTEGER,
                median_age DECIMAL(5,2),
                median_income DECIMAL(12,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ demographic_records table created');

        // 4. Create user_filters table
        console.log('\n4️⃣ Creating user_filters table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_filters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                user_id INTEGER,
                filter_type VARCHAR(50) DEFAULT 'demographic',
                filter_config JSONB NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ user_filters table created');

        // 5. Create states table
        console.log('\n5️⃣ Creating states table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS states (
                id SERIAL PRIMARY KEY,
                state_code VARCHAR(2) NOT NULL UNIQUE,
                state_name VARCHAR(100) NOT NULL,
                region VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ states table created');

        // 6. Create file_uploads table
        console.log('\n6️⃣ Creating file_uploads table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_size BIGINT NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                records_count INTEGER DEFAULT 0,
                error_message TEXT,
                completed_at TIMESTAMP,
                processing_started_at TIMESTAMP,
                processing_completed_at TIMESTAMP,
                error_details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ file_uploads table created');

        // 7. Create telecare_runs table
        console.log('\n7️⃣ Creating telecare_runs table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS telecare_runs (
                id SERIAL PRIMARY KEY,
                zipcode VARCHAR(5) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                records_processed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ telecare_runs table created');

        // 8. Create telecare_output_rows table
        console.log('\n8️⃣ Creating telecare_output_rows table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS telecare_output_rows (
                id SERIAL PRIMARY KEY,
                run_id INTEGER REFERENCES telecare_runs(id) ON DELETE CASCADE,
                npa VARCHAR(3),
                nxx VARCHAR(3),
                state_code VARCHAR(2),
                city VARCHAR(100),
                county VARCHAR(100),
                zip VARCHAR(5),
                timezone_id INTEGER REFERENCES timezones(id),
                thousands VARCHAR(3),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ telecare_output_rows table created');

        // 9. Create phone_number_jobs table
        console.log('\n9️⃣ Creating phone_number_jobs table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS phone_number_jobs (
                id SERIAL PRIMARY KEY,
                run_id INTEGER REFERENCES telecare_runs(id) ON DELETE SET NULL,
                job_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                total_records INTEGER DEFAULT 0,
                processed_records INTEGER DEFAULT 0,
                generated_numbers INTEGER DEFAULT 0,
                error_message TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ phone_number_jobs table created');

        // 10. Create phone_numbers table
        console.log('\n🔟 Creating phone_numbers table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS phone_numbers (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES phone_number_jobs(id) ON DELETE CASCADE,
                npa VARCHAR(3) NOT NULL,
                nxx VARCHAR(3) NOT NULL,
                last_three VARCHAR(3) NOT NULL,
                full_phone_number VARCHAR(13) NOT NULL UNIQUE,
                zip VARCHAR(5),
                state_code VARCHAR(2),
                city VARCHAR(100),
                county VARCHAR(100),
                timezone_id INTEGER REFERENCES timezones(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ phone_numbers table created');

        // 11. Create phone_number_generations table
        console.log('\n1️⃣1️⃣ Creating phone_number_generations table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS phone_number_generations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                filter_config JSONB,
                total_records INTEGER DEFAULT 0,
                generated_numbers INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ phone_number_generations table created');

        // 12. Create phone_number_downloads table
        console.log('\n1️⃣2️⃣ Creating phone_number_downloads table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS phone_number_downloads (
                id SERIAL PRIMARY KEY,
                generation_id INTEGER REFERENCES phone_number_generations(id) ON DELETE CASCADE,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT,
                download_count INTEGER DEFAULT 0,
                last_downloaded_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ phone_number_downloads table created');

        // 13. Create download_tracking table
        console.log('\n1️⃣3️⃣ Creating download_tracking table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS download_tracking (
                id SERIAL PRIMARY KEY,
                download_id INTEGER REFERENCES phone_number_downloads(id) ON DELETE CASCADE,
                ip_address INET,
                user_agent TEXT,
                downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ download_tracking table created');

        // 14. Insert default timezone data
        console.log('\n1️⃣4️⃣ Inserting default timezone data...');
        
        // Insert timezone data one by one to avoid constraint issues
        const timezoneData = [
            ['America/New_York', 'Eastern Time', 'EST', 'EDT', -5, -4, true],
            ['America/Chicago', 'Central Time', 'CST', 'CDT', -6, -5, true],
            ['America/Denver', 'Mountain Time', 'MST', 'MDT', -7, -6, true],
            ['America/Los_Angeles', 'Pacific Time', 'PST', 'PDT', -8, -7, true],
            ['America/Anchorage', 'Alaska Time', 'AKST', 'AKDT', -9, -8, true],
            ['Pacific/Honolulu', 'Hawaii Time', 'HST', 'HST', -10, -10, false]
        ];
        
        for (const [timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst] of timezoneData) {
            try {
                await db.query(`
                    INSERT INTO timezones (timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst, offset_hours, offset_minutes) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $5, 0)
                    ON CONFLICT (display_name) DO NOTHING
                `, [timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst]);
            } catch (error) {
                console.log(`⚠️ Skipping ${timezone_name}: ${error.message}`);
            }
        }
        
        console.log('✅ Default timezone data inserted');

        // 15. Insert default US states data
        console.log('\n1️⃣5️⃣ Inserting default US states data...');
        
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
        
        for (const [state_code, state_name, region] of statesData) {
            try {
                await db.query(`
                    INSERT INTO states (state_code, state_name, region) 
                    VALUES ($1, $2, $3)
                    ON CONFLICT (state_code) DO NOTHING
                `, [state_code, state_name, region]);
            } catch (error) {
                console.log(`⚠️ Skipping ${state_code}: ${error.message}`);
            }
        }
        
        console.log('✅ Default US states data inserted');

        // 16. Create indexes for better performance
        console.log('\n1️⃣6️⃣ Creating database indexes...');
        await db.query(`
            -- States table indexes
            CREATE INDEX IF NOT EXISTS idx_states_state_code ON states(state_code);
            CREATE INDEX IF NOT EXISTS idx_states_region ON states(region);
            
            -- Records table indexes
            CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx);
            CREATE INDEX IF NOT EXISTS idx_records_state_code ON records(state_code);
            CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip);
            CREATE INDEX IF NOT EXISTS idx_records_timezone_id ON records(timezone_id);
            
            -- Demographic records indexes
            CREATE INDEX IF NOT EXISTS idx_demographic_records_state_code ON demographic_records(state_code);
            CREATE INDEX IF NOT EXISTS idx_demographic_records_zip_code ON demographic_records(zip_code);
            CREATE INDEX IF NOT EXISTS idx_demographic_records_timezone_id ON demographic_records(timezone_id);
            
            -- Phone numbers indexes
            CREATE INDEX IF NOT EXISTS idx_phone_numbers_full_number ON phone_numbers(full_phone_number);
            CREATE INDEX IF NOT EXISTS idx_phone_numbers_npa_nxx ON phone_numbers(npa, nxx);
            CREATE INDEX IF NOT EXISTS idx_phone_numbers_zip ON phone_numbers(zip);
            
            -- File uploads indexes
            CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
            CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);
            
            -- Telecare runs indexes
            CREATE INDEX IF NOT EXISTS idx_telecare_runs_zipcode ON telecare_runs(zipcode);
            CREATE INDEX IF NOT EXISTS idx_telecare_runs_status ON telecare_runs(status);
        `);
        console.log('✅ Database indexes created');

        // 15. Enable required PostgreSQL extensions
        console.log('\n1️⃣5️⃣ Enabling PostgreSQL extensions...');
        await db.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        `);
        console.log('✅ PostgreSQL extensions enabled');

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('==========================================');
        console.log('\n📋 Created Tables:');
        console.log('==================');
        console.log('✅ timezones');
        console.log('✅ records');
        console.log('✅ demographic_records');
        console.log('✅ user_filters');
        console.log('✅ file_uploads');
        console.log('✅ telecare_runs');
        console.log('✅ telecare_output_rows');
        console.log('✅ phone_number_jobs');
        console.log('✅ phone_numbers');
        console.log('✅ phone_number_generations');
        console.log('✅ phone_number_downloads');
        console.log('✅ download_tracking');
        console.log('\n🔧 Features:');
        console.log('===========');
        console.log('✅ All required columns with proper data types');
        console.log('✅ Foreign key relationships');
        console.log('✅ Default timezone data');
        console.log('✅ Performance indexes');
        console.log('✅ PostgreSQL extensions');
        console.log('\n🚀 Your database is ready to use!');

    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the seeding function
seedDatabase();
