const db = require('../config/database');
const timezoneResolver = require('../services/timezoneResolver');
const { generateDedupeKey } = require('../database/addDedupeKeyMigration');

class Record {
  static async create(recordData) {
    const { npa, nxx, zip, state_code, city, county, timezone_id, thousands } = recordData;

    const query = `
      INSERT INTO records (npa, nxx, zip, state_code, city, county, timezone_id, thousands)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [npa, nxx, zip, state_code, city, county, timezone_id, thousands];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async bulkCreate(records) {
    if (records.length === 0) return [];
    
    // Process records to add timezone resolution and dedupe keys
    const processedRecords = await this.processRecordsForBulkInsert(records);
    
    if (processedRecords.length === 0) return [];
    
    const query = `
      INSERT INTO records (npa, nxx, zip, state_code, city, county, timezone_id, thousands, dedupe_key)
      VALUES ${processedRecords.map((_, index) => {
        const offset = index * 9;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
      }).join(', ')}
      ON CONFLICT (dedupe_key) DO UPDATE SET
        timezone_id = EXCLUDED.timezone_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = processedRecords.flatMap(record => [
      record.npa, 
      record.nxx, 
      record.zip, 
      record.state_code, 
      record.city, 
      record.county, 
      record.timezone_id, 
      record.thousands,
      record.dedupe_key
    ]);
    
    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error in bulkCreate:', error);
      throw error;
    }
  }

  static async processRecordsForBulkInsert(records) {
    const processedRecords = [];
    
    for (const record of records) {
      try {
        // Generate dedupe key
        const dedupeKey = generateDedupeKey(record);
        
        // Resolve timezone if not already set
        let timezoneId = record.timezone_id;
        if (!timezoneId) {
          const timezone = await timezoneResolver.resolveTimezone({
            state: record.state_code,
            city: record.city,
            zipcode: record.zip
          });
          timezoneId = timezone ? timezone.id : null;
        }
        
        // Normalize empty strings to null for numeric fields
        const processedRecord = {
          ...record,
          dedupe_key: dedupeKey,
          timezone_id: timezoneId,
          npa: record.npa || null,
          nxx: record.nxx || null,
          zip: record.zip || null,
          thousands: record.thousands || null
        };
        
        processedRecords.push(processedRecord);
      } catch (error) {
        console.error('Error processing record for bulk insert:', error);
        // Continue with other records instead of failing completely
      }
    }
    
    return processedRecords;
  }

  static async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      sortBy = 'created_at', 
      sortOrder = 'DESC',
      filters = {}
    } = options;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT r.*, 
             tz.timezone_name,
             tz.display_name as timezone_display_name,
             tz.abbreviation_standard,
             tz.abbreviation_daylight,
             tz.utc_offset_standard,
             tz.utc_offset_daylight,
             tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
    `;
    let countQuery = `
      SELECT COUNT(*) 
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
    `;
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(
        r.npa ILIKE $${valueIndex} OR 
        r.nxx ILIKE $${valueIndex} OR 
        r.zip ILIKE $${valueIndex} OR 
        r.state_code ILIKE $${valueIndex} OR 
        r.city ILIKE $${valueIndex} OR 
        r.county ILIKE $${valueIndex} OR
        tz.timezone_name ILIKE $${valueIndex} OR
        tz.display_name ILIKE $${valueIndex} OR
        tz.abbreviation_standard ILIKE $${valueIndex} OR
        tz.abbreviation_daylight ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    // Add advanced filters
    if (filters.npa) {
      whereConditions.push(`r.npa = $${valueIndex}`);
      values.push(filters.npa);
      valueIndex++;
    }

    if (filters.nxx) {
      whereConditions.push(`r.nxx = $${valueIndex}`);
      values.push(filters.nxx);
      valueIndex++;
    }

    if (filters.zip) {
      if (Array.isArray(filters.zip)) {
        const placeholders = filters.zip.map(() => `$${valueIndex++}`).join(', ');
        whereConditions.push(`r.zip IN (${placeholders})`);
        values.push(...filters.zip);
        console.log(`✅ Added zip IN filter: r.zip IN (${placeholders}) with values:`, filters.zip);
      } else {
        whereConditions.push(`r.zip = $${valueIndex}`);
        values.push(filters.zip);
        valueIndex++;
        console.log(`✅ Added zip exact filter: r.zip = $${valueIndex-1} with value: ${filters.zip}`);
      }
    }

    if (filters.state_code) {
      whereConditions.push(`r.state_code = $${valueIndex}`);
      values.push(filters.state_code);
      valueIndex++;
    }

    if (filters.city) {
      whereConditions.push(`r.city ILIKE $${valueIndex}`);
      values.push(`%${filters.city}%`);
      valueIndex++;
    }

    if (filters.rc) {
      whereConditions.push(`r.county ILIKE $${valueIndex}`);
      values.push(`%${filters.rc}%`);
      valueIndex++;
    }

    if (filters.timezone_display_name) {
      // Convert timezone display names to IDs
      console.warn(`⚠️ timezone_display_name filter is deprecated. Use timezone_id instead.`);
      // For backward compatibility, we'll skip this filter for now
      // The frontend should be updated to send timezone_id instead
    }

    if (filters.timezone_id) {
      if (Array.isArray(filters.timezone_id)) {
        const placeholders = filters.timezone_id.map(() => `$${valueIndex++}`).join(', ');
        whereConditions.push(`r.timezone_id IN (${placeholders})`);
        values.push(...filters.timezone_id);
        console.log(`✅ Added timezone_id IN filter: r.timezone_id IN (${placeholders}) with values:`, filters.timezone_id);
      } else {
        whereConditions.push(`r.timezone_id = $${valueIndex}`);
        values.push(filters.timezone_id);
        valueIndex++;
        console.log(`✅ Added timezone_id exact filter: r.timezone_id = $${valueIndex-1} with value: ${filters.timezone_id}`);
      }
    }

    if (filters.date_from) {
      whereConditions.push(`r.created_at >= $${valueIndex}`);
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`r.created_at <= $${valueIndex}`);
      values.push(filters.date_to);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add sorting and pagination
    let orderByField = sortBy;
    if (sortBy === 'timezone_display_name') {
      orderByField = 'tz.display_name';
    } else {
      orderByField = `r.${sortBy}`;
    }
    query += ` ORDER BY ${orderByField} ${sortOrder} LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(parseInt(limit) || 50, parseInt(offset) || 0);

    console.log('🔍 SQL Query:', { query, values, filters });

    const [recordsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2))
    ]);

    return {
      records: recordsResult.rows,
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        total: parseInt(countResult.rows[0].count) || 0,
        totalPages: Math.ceil((parseInt(countResult.rows[0].count) || 0) / (parseInt(limit) || 50))
      }
    };
  }

  static async exportToCSV(options = {}) {
    const { 
      search, 
      sortBy = 'created_at', 
      sortOrder = 'DESC',
      filters = {}
    } = options;
    
    let query = `
      SELECT 
        r.npa,
        r.nxx,
        r.zip,
        r.state_code,
        r.city,
        r.county,
        r.created_at,
        tz.display_name as timezone_display_name,
        tz.abbreviation_standard,
        tz.abbreviation_daylight,
        tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
    `;
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(
        r.npa ILIKE $${valueIndex} OR 
        r.nxx ILIKE $${valueIndex} OR 
        r.zip ILIKE $${valueIndex} OR 
        r.state_code ILIKE $${valueIndex} OR 
        r.city ILIKE $${valueIndex} OR 
        r.county ILIKE $${valueIndex} OR
        tz.timezone_name ILIKE $${valueIndex} OR
        tz.display_name ILIKE $${valueIndex} OR
        tz.abbreviation_standard ILIKE $${valueIndex} OR
        tz.abbreviation_daylight ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    // Add advanced filters
    if (filters.npa) {
      whereConditions.push(`r.npa = $${valueIndex}`);
      values.push(filters.npa);
      valueIndex++;
    }

    if (filters.nxx) {
      whereConditions.push(`r.nxx = $${valueIndex}`);
      values.push(filters.nxx);
      valueIndex++;
    }

    if (filters.zip) {
      if (Array.isArray(filters.zip)) {
        const placeholders = filters.zip.map(() => `$${valueIndex++}`).join(', ');
        whereConditions.push(`r.zip IN (${placeholders})`);
        values.push(...filters.zip);
        console.log(`✅ Added zip IN filter: r.zip IN (${placeholders}) with values:`, filters.zip);
      } else {
        whereConditions.push(`r.zip = $${valueIndex}`);
        values.push(filters.zip);
        valueIndex++;
        console.log(`✅ Added zip exact filter: r.zip = $${valueIndex-1} with value: ${filters.zip}`);
      }
    }

    if (filters.state_code) {
      whereConditions.push(`r.state_code = $${valueIndex}`);
      values.push(filters.state_code);
      valueIndex++;
    }

    if (filters.city) {
      whereConditions.push(`r.city ILIKE $${valueIndex}`);
      values.push(`%${filters.city}%`);
      valueIndex++;
    }

    if (filters.county) {
      whereConditions.push(`r.county ILIKE $${valueIndex}`);
      values.push(`%${filters.county}%`);
      valueIndex++;
    }

    if (filters.date_from) {
      whereConditions.push(`r.created_at >= $${valueIndex}`);
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`r.created_at <= $${valueIndex}`);
      values.push(filters.date_to);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Add sorting
    query += ` ORDER BY r.${sortBy} ${sortOrder}`;

    const result = await db.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT r.*, 
             tz.timezone_name,
             tz.display_name as timezone_display_name,
             tz.abbreviation_standard,
             tz.abbreviation_daylight,
             tz.utc_offset_standard,
             tz.utc_offset_daylight,
             tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
      WHERE r.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByNpaNxx(npa, nxx) {
    const query = `
      SELECT r.*, 
             tz.timezone_name,
             tz.display_name as timezone_display_name,
             tz.abbreviation_standard,
             tz.abbreviation_daylight,
             tz.utc_offset_standard,
             tz.utc_offset_daylight,
             tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
      WHERE r.npa = $1 AND r.nxx = $2
    `;
    const result = await db.query(query, [npa, nxx]);
    return result.rows;
  }

  static async findByZip(zip) {
    const query = `
      SELECT r.*, 
             tz.timezone_name,
             tz.display_name as timezone_display_name,
             tz.abbreviation_standard,
             tz.abbreviation_daylight,
             tz.utc_offset_standard,
             tz.utc_offset_daylight,
             tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
      WHERE r.zip = $1
    `;
    const result = await db.query(query, [zip]);
    return result.rows;
  }

  static async findByState(state) {
    const query = `
      SELECT r.*, 
             tz.timezone_name,
             tz.display_name as timezone_display_name,
             tz.abbreviation_standard,
             tz.abbreviation_daylight,
             tz.utc_offset_standard,
             tz.utc_offset_daylight,
             tz.observes_dst
      FROM records r
      LEFT JOIN timezones tz ON r.timezone_id = tz.id
      WHERE r.state_code = $1
    `;
    const result = await db.query(query, [state]);
    return result.rows;
  }

  static async getStats() {
    try {
      // Try to use materialized view first (faster for large datasets)
      const query = `
        SELECT 
          total_records,
          unique_npa,
          unique_states,
          unique_zips,
          last_updated
        FROM records_stats
      `;
      const result = await db.query(query);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (error) {
      console.log('Materialized view not available, using direct query...');
    }

    // Fallback to direct query if materialized view doesn't exist
    const query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT npa) as unique_npa,
        COUNT(DISTINCT state_code) as unique_states,
        COUNT(DISTINCT zip) as unique_zips
      FROM records
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  static async deleteById(id) {
    const query = 'DELETE FROM records WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async deleteAll() {
    const query = 'DELETE FROM records';
    await db.query(query);
  }

  // Get unique values for a specific field (for filter dropdowns)
  static async getUniqueValues(field, search = '', limit = 10) {
    try {
      console.log('🔍 Record model getUniqueValues called with:', { field, search, limit });
      
      const validFields = ['npa', 'nxx', 'zip', 'state_code', 'city', 'rc', 'timezone_id'];
      if (!validFields.includes(field)) {
        throw new Error(`Field ${field} is not allowed for unique values`);
      }

      let query;
      let params = [];
      
      if (field === 'timezone_id') {
        // Special handling for timezone_id which comes from a join
        if (search && search.trim()) {
          query = `
            SELECT DISTINCT tz.id as timezone_id, tz.display_name
            FROM records r
            LEFT JOIN timezones tz ON r.timezone_id = tz.id
            WHERE tz.id IS NOT NULL 
            AND tz.display_name ILIKE $1
            ORDER BY tz.display_name
            LIMIT $2
          `;
          params = [`%${search.trim()}%`, limit];
        } else {
          query = `
            SELECT DISTINCT tz.id as timezone_id, tz.display_name
            FROM records r
            LEFT JOIN timezones tz ON r.timezone_id = tz.id
            WHERE tz.id IS NOT NULL 
            ORDER BY tz.display_name
            LIMIT $1
          `;
          params = [limit];
        }
      } else {
        if (search && search.trim()) {
          query = `
            SELECT DISTINCT ${field} 
            FROM records 
            WHERE ${field} IS NOT NULL 
            AND ${field} != '' 
            AND ${field} ILIKE $1
            ORDER BY ${field}
            LIMIT $2
          `;
          params = [`%${search.trim()}%`, limit];
        } else {
          query = `
            SELECT DISTINCT ${field} 
            FROM records 
            WHERE ${field} IS NOT NULL 
            AND ${field} != '' 
            ORDER BY ${field}
            LIMIT $1
          `;
          params = [limit];
        }
      }
      
      console.log('🔍 Executing query:', query);
      const result = await db.query(query, params);
      console.log('🔍 Query result rows:', result.rows.length);
      
      const values = result.rows.map(row => {
        if (field === 'timezone_id') {
          // Return both ID and display name for timezone options
          return {
            value: row.timezone_id,
            label: row.display_name
          };
        }
        return row[field];
      }).filter(value => value !== null && value !== '');
      console.log('🔍 Filtered values:', values);
      
      return values;
    } catch (error) {
      console.error('❌ Error in Record model getUniqueValues:', error);
      throw error;
    }
  }
}

module.exports = Record;
