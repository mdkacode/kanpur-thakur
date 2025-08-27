const { Pool } = require('pg');
const os = require('os');

class DatabaseOptimizer {
  constructor() {
    this.pool = null;
    this.maxConnections = Math.max(10, os.cpus().length * 2);
    this.connectionTimeout = 30000; // 30 seconds
    this.idleTimeout = 30000; // 30 seconds
    this.maxUses = 7500; // Recycle connections after 7500 queries
  }

  initializePool() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'sheetbc',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: this.maxConnections,
      connectionTimeoutMillis: this.connectionTimeout,
      idleTimeoutMillis: this.idleTimeout,
      maxUses: this.maxUses,
      // Performance optimizations
      statement_timeout: 300000, // 5 minutes
      query_timeout: 300000, // 5 minutes
      // Connection optimizations
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Handle pool events
    this.pool.on('connect', (client) => {
      console.log('🔗 Database connection established');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Database pool error:', err);
    });

    this.pool.on('remove', (client) => {
      console.log('🔌 Database connection removed from pool');
    });

    return this.pool;
  }

  async getConnection() {
    if (!this.pool) {
      this.initializePool();
    }
    return await this.pool.connect();
  }

  async executeBulkInsert(tableName, records, batchSize = 1000) {
    if (!records || records.length === 0) {
      return { success: true, inserted: 0 };
    }

    const client = await this.getConnection();
    let totalInserted = 0;

    try {
      await client.query('BEGIN');

      // Split records into batches
      const batches = this.chunkArray(records, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const inserted = await this.insertBatch(client, tableName, batch);
        totalInserted += inserted;
        
        console.log(`📊 Batch ${i + 1}/${batches.length}: ${inserted} records inserted`);
      }

      await client.query('COMMIT');
      
      return { success: true, inserted: totalInserted };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Bulk insert error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async insertBatch(client, tableName, records) {
    if (records.length === 0) return 0;

    const columns = Object.keys(records[0]);
    const placeholders = records.map((_, recordIndex) => {
      const start = recordIndex * columns.length + 1;
      return `(${columns.map((_, colIndex) => `$${start + colIndex}`).join(', ')})`;
    }).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING
    `;

    const values = records.flatMap(record => 
      columns.map(column => record[column])
    );

    const result = await client.query(query, values);
    return result.rowCount;
  }

  async executeBulkUpsert(tableName, records, uniqueColumns, batchSize = 1000) {
    if (!records || records.length === 0) {
      return { success: true, inserted: 0, updated: 0 };
    }

    const client = await this.getConnection();
    let totalInserted = 0;
    let totalUpdated = 0;

    try {
      await client.query('BEGIN');

      const batches = this.chunkArray(records, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const result = await this.upsertBatch(client, tableName, batch, uniqueColumns);
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        
        console.log(`📊 Batch ${i + 1}/${batches.length}: ${result.inserted} inserted, ${result.updated} updated`);
      }

      await client.query('COMMIT');
      
      return { success: true, inserted: totalInserted, updated: totalUpdated };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Bulk upsert error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertBatch(client, tableName, records, uniqueColumns) {
    if (records.length === 0) return { inserted: 0, updated: 0 };

    const columns = Object.keys(records[0]);
    const placeholders = records.map((_, recordIndex) => {
      const start = recordIndex * columns.length + 1;
      return `(${columns.map((_, colIndex) => `$${start + colIndex}`).join(', ')})`;
    }).join(', ');

    const updateSet = columns
      .filter(col => !uniqueColumns.includes(col))
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT (${uniqueColumns.join(', ')})
      ${updateSet ? `DO UPDATE SET ${updateSet}` : 'DO NOTHING'}
    `;

    const values = records.flatMap(record => 
      columns.map(column => record[column])
    );

    const result = await client.query(query, values);
    return { inserted: result.rowCount, updated: 0 }; // PostgreSQL doesn't distinguish between insert/update
  }

  async executeParallelQueries(queries) {
    const client = await this.getConnection();
    const results = [];

    try {
      await client.query('BEGIN');

      const queryPromises = queries.map(async (query, index) => {
        try {
          const result = await client.query(query.sql, query.params || []);
          return { index, success: true, result };
        } catch (error) {
          return { index, success: false, error: error.message };
        }
      });

      const queryResults = await Promise.all(queryPromises);
      
      // Check if all queries succeeded
      const failedQueries = queryResults.filter(r => !r.success);
      if (failedQueries.length > 0) {
        throw new Error(`Failed queries: ${failedQueries.map(f => f.index).join(', ')}`);
      }

      await client.query('COMMIT');
      
      return queryResults.map(r => r.result);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async optimizeTable(tableName) {
    const client = await this.getConnection();
    
    try {
      console.log(`🔧 Optimizing table: ${tableName}`);
      
      // Analyze table for better query planning
      await client.query(`ANALYZE ${tableName}`);
      
      // Vacuum table to reclaim storage and update statistics
      await client.query(`VACUUM ${tableName}`);
      
      // Reindex table for better performance
      await client.query(`REINDEX TABLE ${tableName}`);
      
      console.log(`✅ Table ${tableName} optimized successfully`);
      
    } catch (error) {
      console.error(`❌ Error optimizing table ${tableName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createIndexes(tableName, indexes) {
    const client = await this.getConnection();
    
    try {
      console.log(`🔧 Creating indexes for table: ${tableName}`);
      
      for (const index of indexes) {
        const indexName = `${tableName}_${index.columns.join('_')}_idx`;
        
        try {
          await client.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} 
            ON ${tableName} (${index.columns.join(', ')})
            ${index.where ? `WHERE ${index.where}` : ''}
          `);
          console.log(`✅ Index created: ${indexName}`);
        } catch (error) {
          console.warn(`⚠️ Index creation failed for ${indexName}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error creating indexes for ${tableName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTableStats(tableName) {
    const client = await this.getConnection();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation,
          most_common_vals,
          most_common_freqs
        FROM pg_stats 
        WHERE tablename = $1
        ORDER BY attname
      `, [tableName]);
      
      return result.rows;
      
    } catch (error) {
      console.error(`❌ Error getting table stats for ${tableName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async monitorPerformance() {
    const client = await this.getConnection();
    
    try {
      // Get active connections
      const connectionsResult = await client.query(`
        SELECT 
          count(*) as active_connections,
          state,
          application_name
        FROM pg_stat_activity 
        WHERE state IS NOT NULL
        GROUP BY state, application_name
        ORDER BY count(*) DESC
      `);

      // Get slow queries (only if pg_stat_statements extension is available)
      let slowQueriesResult = { rows: [] };
      try {
        slowQueriesResult = await client.query(`
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements 
          ORDER BY mean_time DESC 
          LIMIT 10
        `);
      } catch (error) {
        console.log('⚠️ pg_stat_statements extension not available, skipping slow query monitoring');
      }

      // Get table sizes
      const tableSizesResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      return {
        connections: connectionsResult.rows,
        slowQueries: slowQueriesResult.rows,
        tableSizes: tableSizesResult.rows
      };
      
    } catch (error) {
      console.error('❌ Error monitoring performance:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async closePool() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 Database pool closed');
    }
  }
}

module.exports = DatabaseOptimizer;
