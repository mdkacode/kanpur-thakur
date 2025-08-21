const db = require('../config/database');

async function optimizeForLargeData() {
  try {
    console.log('🚀 Starting database optimization for large datasets...\n');

    // 1. Create additional indexes for better query performance
    console.log('📊 Creating performance indexes...');
    
    const indexes = [
      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_records_npa_nxx ON records(npa, nxx)',
      'CREATE INDEX IF NOT EXISTS idx_records_zip_state ON records(zip, state_code)',
      'CREATE INDEX IF NOT EXISTS idx_records_city_state ON records(city, state_code)',
      
      // Partial indexes for better performance
      'CREATE INDEX IF NOT EXISTS idx_records_active ON records(id) WHERE id > 0',
      
      // Text search indexes
      'CREATE INDEX IF NOT EXISTS idx_records_city_gin ON records USING gin(to_tsvector(\'english\', city))',
      'CREATE INDEX IF NOT EXISTS idx_records_rc_gin ON records USING gin(to_tsvector(\'english\', rc))',
      
      // Statistics indexes
      'CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_records_state_code ON records(state_code)',
      'CREATE INDEX IF NOT EXISTS idx_records_zip ON records(zip)'
    ];

    for (const indexQuery of indexes) {
      await db.query(indexQuery);
      console.log(`✅ Created index: ${indexQuery.split(' ')[2]}`);
    }

    // 2. Update table statistics for better query planning
    console.log('\n📈 Updating table statistics...');
    await db.query('ANALYZE records');
    await db.query('ANALYZE states');
    await db.query('ANALYZE file_uploads');
    console.log('✅ Table statistics updated');

    // 3. Optimize table settings for large datasets
    console.log('\n⚙️  Optimizing table settings...');
    
    const optimizations = [
      'ALTER TABLE records SET (autovacuum_vacuum_scale_factor = 0.1)',
      'ALTER TABLE records SET (autovacuum_analyze_scale_factor = 0.05)',
      'ALTER TABLE records SET (autovacuum_vacuum_cost_limit = 2000)',
      'ALTER TABLE file_uploads SET (autovacuum_vacuum_scale_factor = 0.1)',
      'ALTER TABLE file_uploads SET (autovacuum_analyze_scale_factor = 0.05)'
    ];

    for (const optQuery of optimizations) {
      await db.query(optQuery);
      console.log(`✅ Applied optimization: ${optQuery.split(' ')[2]}`);
    }

    // 4. Create materialized view for statistics (optional)
    console.log('\n📊 Creating statistics materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS records_stats AS
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT npa) as unique_npa,
        COUNT(DISTINCT state_code) as unique_states,
        COUNT(DISTINCT zip) as unique_zips,
        MAX(created_at) as last_updated
      FROM records
    `);
    console.log('✅ Statistics materialized view created');

    // 5. Set up refresh function for materialized view
    console.log('\n🔄 Creating refresh function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION refresh_records_stats()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW records_stats;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Refresh function created');

    // 6. Performance recommendations
    console.log('\n💡 Performance Recommendations for 55 Lakhs Rows:');
    console.log('   • Use pagination with reasonable limits (50-100 records per page)');
    console.log('   • Implement search with proper indexes');
    console.log('   • Use materialized views for dashboard statistics');
    console.log('   • Consider partitioning for very large datasets');
    console.log('   • Monitor memory usage during file processing');
    console.log('   • Use background jobs for large file uploads');

    console.log('\n✅ Database optimization completed successfully!');
    console.log('🎯 System is now optimized for handling 55 lakhs+ rows');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeForLargeData()
    .then(() => {
      console.log('\n🎉 Database optimization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeForLargeData };
