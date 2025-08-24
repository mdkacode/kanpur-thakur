const db = require('../config/database');

async function migrateFilters() {
  try {
    console.log('Creating user_filters table...');
    
    // Create user_filters table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_filters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        filter_type VARCHAR(100) NOT NULL DEFAULT 'demographic',
        filter_config JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.query(createTableQuery);
    console.log('✅ user_filters table created successfully');
    
    // Create indexes for better performance
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_user_filters_user_id ON user_filters(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_filters_type ON user_filters(filter_type);
      CREATE INDEX IF NOT EXISTS idx_user_filters_active ON user_filters(is_active);
      CREATE INDEX IF NOT EXISTS idx_user_filters_created ON user_filters(created_at);
    `;
    
    await db.query(createIndexesQuery);
    console.log('✅ Indexes created successfully');
    
    console.log('🎉 Filter migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during filter migration:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFilters()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateFilters;
