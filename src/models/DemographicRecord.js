const db = require('../config/database');

class DemographicRecord {
  // Add static db property for direct access
  static db = db;

  // Dynamic column mapping - automatically adapts to schema changes
  static async getTableColumns() {
    try {
      const query = `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'demographic_records' 
        AND column_name NOT IN ('id', 'created_at', 'updated_at')
        ORDER BY ordinal_position
      `;
      const result = await db.query(query);
      return result.rows.map(row => row.column_name);
    } catch (error) {
      console.error('Error getting table columns:', error);
      throw error;
    }
  }

  // Get column constraints for data validation
  static async getColumnConstraints() {
    try {
      const query = `
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'demographic_records' 
        AND column_name NOT IN ('id', 'created_at', 'updated_at')
        ORDER BY ordinal_position
      `;
      const result = await db.query(query);
      
      const constraints = {};
      result.rows.forEach(row => {
        constraints[row.column_name] = {
          dataType: row.data_type,
          maxLength: row.character_maximum_length,
          nullable: row.is_nullable === 'YES'
        };
      });
      
      return constraints;
    } catch (error) {
      console.error('Error getting column constraints:', error);
      return {};
    }
  }

  // Dynamic INSERT query builder
  static async buildInsertQuery(columns) {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    return `
      INSERT INTO demographic_records (${columns.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
  }

  // Dynamic bulk INSERT query builder
  static async buildBulkInsertQuery(columns, recordCount) {
    const valueGroups = [];
    for (let i = 0; i < recordCount; i++) {
      const offset = i * columns.length;
      const placeholders = columns.map((_, index) => `$${offset + index + 1}`).join(', ');
      valueGroups.push(`(${placeholders})`);
    }
    
    return `
      INSERT INTO demographic_records (${columns.join(', ')}) 
      VALUES ${valueGroups.join(', ')} 
      RETURNING *
    `;
  }

  // Dynamic value extractor - maps CSV data to database columns
  static extractValues(record, columns, constraints = {}) {
    return columns.map(column => {
      try {
        // Handle special cases and data transformations
        let value = record[column];
        
        // If value is undefined or null, return null for all fields
        if (value === undefined || value === null) {
          return null;
        }
        
        // Convert to string for processing
        value = value.toString().trim();
        
        // Clean up common data issues
        if (value === '-1' || value === '') {
          return null;
        }
        
        // Remove currency symbols and commas from numeric fields
        if (typeof value === 'string' && (value.includes('$') || value.includes(','))) {
          value = value.replace(/[$,]/g, '');
        }
        
        // Handle integer columns - convert empty strings to null for integer fields
        if (['timezone_id', 'population'].includes(column)) {
          if (value === '' || value === null || value === undefined) {
            return null;
          }
          // Try to convert to integer
          const numValue = parseInt(value);
          return isNaN(numValue) ? null : numValue;
        }
        
        // Handle numeric columns - convert empty strings to null
        if (['median_age', 'median_income'].includes(column)) {
          if (value === '' || value === null || value === undefined) {
            return null;
          }
          // Try to convert to numeric
          const numValue = parseFloat(value);
          return isNaN(numValue) ? null : numValue;
        }
        
        // For string fields, truncate based on actual column constraints
        if (typeof value === 'string' && constraints[column] && constraints[column].maxLength) {
          const maxLength = constraints[column].maxLength;
          if (value.length > maxLength) {
            console.warn(`⚠️ Truncating value for column ${column}: "${value.substring(0, 50)}..." (length: ${value.length} -> ${maxLength})`);
            value = value.substring(0, maxLength);
          }
        } else if (typeof value === 'string' && value.length > 100) {
          // Fallback truncation for unknown columns
          console.warn(`⚠️ Truncating value for column ${column}: "${value.substring(0, 50)}..." (length: ${value.length} -> 100)`);
          value = value.substring(0, 100);
        }
        
        // For all other fields, return null if empty, otherwise return the value
        const result = value === '' ? null : value;
        
        // Ensure we never return undefined
        if (result === undefined) {
          console.error(`❌ extractValues returned undefined for column: ${column}, value: ${value}`);
          return null;
        }
        
        return result;
      } catch (error) {
        console.error(`❌ Error processing column ${column}:`, error);
        return null;
      }
    });
  }

  // Dynamic single record creation
  static async create(recordData) {
    try {
      const columns = await this.getTableColumns();
      const query = await this.buildInsertQuery(columns);
      const values = this.extractValues(recordData, columns);
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating demographic record:', error);
      throw error;
    }
  }

  // Dynamic bulk record creation
  static async bulkCreate(records) {
    if (!Array.isArray(records) || records.length === 0) {
      console.log('🔍 bulkCreate called with empty or invalid records array');
      return [];
    }
    
    try {
      console.log(`🔍 bulkCreate called with ${records.length} records`);
      
      // Validate that all records are objects
      const validRecords = records.filter(record => record && typeof record === 'object');
      if (validRecords.length !== records.length) {
        console.error(`❌ Invalid records found: ${records.length - validRecords.length} records are not objects`);
        console.error(`❌ Records array:`, records);
        throw new Error(`Invalid records: ${records.length - validRecords.length} records are not objects`);
      }
      
      // Check if any records are empty objects
      const emptyRecords = validRecords.filter(record => Object.keys(record).length === 0);
      if (emptyRecords.length > 0) {
        console.error(`❌ Found ${emptyRecords.length} empty records`);
        throw new Error(`Found ${emptyRecords.length} empty records`);
      }
      
      console.log(`🔍 First record keys:`, Object.keys(records[0] || {}));
      
      const columns = await this.getTableColumns();
      console.log(`🔍 Database columns count: ${columns.length}`);
      
      // Get column constraints for data validation
      const constraints = await this.getColumnConstraints();
      console.log(`🔍 Loaded constraints for ${Object.keys(constraints).length} columns`);
      
      const query = await this.buildBulkInsertQuery(columns, records.length);
      console.log(`🔍 Query generated with ${columns.length * records.length} placeholders`);
      
      // Flatten all values for bulk insert
      console.log(`🔍 Starting flatMap operation with ${records.length} records`);
      
      const values = [];
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        console.log(`🔍 Processing record ${i + 1}/${records.length}:`, Object.keys(record));
        
        const recordValues = this.extractValues(record, columns, constraints);
        console.log(`🔍 Record ${i + 1} values type: ${typeof recordValues}, length: ${recordValues ? recordValues.length : 'undefined'}`);
        
        if (!Array.isArray(recordValues)) {
          console.error(`❌ Record ${i + 1} extractValues did not return an array:`, recordValues);
          throw new Error(`Record ${i + 1} extractValues did not return an array`);
        }
        
        if (recordValues.length !== columns.length) {
          console.error(`❌ Record ${i + 1} has wrong number of values: ${recordValues.length} vs ${columns.length}`);
          throw new Error(`Record ${i + 1} has wrong number of values: ${recordValues.length} vs ${columns.length}`);
        }
        
        values.push(...recordValues);
      }
      
      console.log(`🔍 Final values array length: ${values.length}`);
      console.log(`🔍 Expected length: ${columns.length * records.length}`);
      
      if (values.length !== columns.length * records.length) {
        console.error(`❌ Length mismatch! Expected ${columns.length * records.length}, got ${values.length}`);
        console.error(`❌ Records count: ${records.length}, Columns count: ${columns.length}`);
        throw new Error(`Parameter count mismatch: expected ${columns.length * records.length}, got ${values.length}`);
      }
      
      // Check for any undefined values in the array
      const undefinedCount = values.filter(v => v === undefined).length;
      if (undefinedCount > 0) {
        console.error(`❌ Found ${undefinedCount} undefined values in the values array`);
        throw new Error(`Found ${undefinedCount} undefined values in the values array`);
      }
      
      try {
        const result = await db.query(query, values);
        console.log(`✅ bulkCreate completed successfully`);
        return result.rows;
      } catch (error) {
        // If it's a data length error, try to identify and fix the problematic values
        if (error.code === '22001' && error.message.includes('too long for type character varying')) {
          console.warn(`⚠️ Data length error detected. Attempting to fix and retry...`);
          
          // Try to identify which values are too long and truncate them
          const fixedValues = values.map((value, index) => {
            if (typeof value === 'string' && value.length > 100) {
              console.warn(`⚠️ Truncating value at index ${index}: "${value.substring(0, 50)}..." (length: ${value.length})`);
              return value.substring(0, 100);
            }
            return value;
          });
          
          // Retry with fixed values
          const result = await db.query(query, fixedValues);
          console.log(`✅ bulkCreate completed successfully after fixing data length issues`);
          return result.rows;
        }
        
        // For other errors, re-throw
        throw error;
      }
    } catch (error) {
      console.error('Error bulk creating demographic records:', error);
      throw error;
    }
  }

  // Dynamic record finder with advanced filtering and zipcode extraction
  static async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      sortBy = 'created_at', 
      sortOrder = 'DESC',
      filters = {},
      advancedFilters = {}
    } = options;
    
    try {
      const columns = await this.getTableColumns();
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 50;
      const offset = (pageNum - 1) * limitNum;
      
      let query = `
        SELECT dr.*, 
               tz.id as timezone_id,
               tz.timezone_name,
               tz.display_name as timezone_display_name,
               tz.abbreviation_standard,
               tz.abbreviation_daylight,
               tz.utc_offset_standard,
               tz.utc_offset_daylight,
               tz.observes_dst
        FROM demographic_records dr
        LEFT JOIN timezones tz ON dr.timezone_id = tz.id
      `;
      let countQuery = 'SELECT COUNT(*) FROM demographic_records dr LEFT JOIN timezones tz ON dr.timezone_id = tz.id';
      let zipcodesQuery = 'SELECT DISTINCT dr.zip_code FROM demographic_records dr LEFT JOIN timezones tz ON dr.timezone_id = tz.id';
      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      // Dynamic search across searchable columns
      if (search) {
        const searchableColumns = ['zip_code', 'state_code', 'county', 'city'];
        const searchConditions = searchableColumns
          .filter(col => columns.includes(col))
          .map(col => `dr.${col} ILIKE $${valueIndex}`);
        
        if (searchConditions.length > 0) {
          whereConditions.push(`(${searchConditions.join(' OR ')})`);
          values.push(`%${search}%`);
          valueIndex++;
        }
      }

      // Basic filters - exact matches
      Object.entries(filters).forEach(([key, value]) => {
        // Special handling for timezone filters - always use timezone_id
        if (key === 'timezone' && value && value !== '') {
          console.log(`🔍 Processing timezone filter: key=${key}, value=${value}, type=${typeof value}`);
          if (Array.isArray(value) && value.length > 0) {
            // Convert all values to timezone IDs
            const timezoneIds = [];
            for (const v of value) {
              const trimmed = v.trim();
              // If it's already a number, use it as is
              if (!isNaN(parseInt(trimmed))) {
                timezoneIds.push(parseInt(trimmed));
              } else {
                // If it's a display name, convert it to ID using a subquery
                console.log(`🔄 Converting timezone display name "${trimmed}" to ID`);
                const subQuery = `(SELECT id FROM timezones WHERE display_name = $${valueIndex})`;
                whereConditions.push(`tz.id = ${subQuery}`);
                values.push(trimmed);
                valueIndex++;
              }
            }
            
            if (timezoneIds.length > 0) {
              const placeholders = timezoneIds.map((_, index) => `$${valueIndex + index}`).join(', ');
              whereConditions.push(`tz.id IN (${placeholders})`);
              values.push(...timezoneIds);
              valueIndex += timezoneIds.length;
              console.log(`✅ Added timezone ID IN filter: tz.id IN (${placeholders}) with values:`, timezoneIds);
            }
          } else if (typeof value === 'string' && value.trim() !== '') {
            const trimmed = value.trim();
            // If it's already a number, use it as is
            if (!isNaN(parseInt(trimmed))) {
              whereConditions.push(`tz.id = $${valueIndex}`);
              values.push(parseInt(trimmed));
              valueIndex++;
              console.log(`✅ Added timezone ID exact filter: tz.id = $${valueIndex-1} with value: ${parseInt(trimmed)}`);
            } else {
              // If it's a display name, convert it to ID using a subquery
              console.log(`🔄 Converting timezone display name "${trimmed}" to ID`);
              const subQuery = `(SELECT id FROM timezones WHERE display_name = $${valueIndex})`;
              whereConditions.push(`tz.id = ${subQuery}`);
              values.push(trimmed);
              valueIndex++;
              console.log(`✅ Added timezone display name conversion filter: tz.id = ${subQuery} with value: ${trimmed}`);
            }
          }
        } else if (columns.includes(key) && value && value !== '' && value !== 'All States') {
          if (Array.isArray(value) && value.length > 0) {
            // Handle multiselect arrays - use IN clause
            console.log(`✅ Adding IN filter for ${key} IN [${value.join(', ')}]`);
            const placeholders = value.map((_, index) => `$${valueIndex + index}`).join(', ');
            whereConditions.push(`dr.${key} IN (${placeholders})`);
            values.push(...value.map(v => v.trim()));
            console.log(`🔍 Added ${value.length} values for ${key}:`, value.map(v => v.trim()));
            valueIndex += value.length;
          } else if (typeof value === 'string' && value.trim() !== '') {
            // Handle single string values
            console.log(`✅ Adding exact match filter for ${key} = ${value.trim()}`);
            whereConditions.push(`dr.${key} = $${valueIndex}`);
            values.push(value.trim());
            valueIndex++;
          }
        }
      });

      // Advanced filters - range filters and partial matches
      console.log('🔍 Processing advanced filters:', advancedFilters);
      
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (!value || value === '') return;
        
        // Handle array filters (county, city, timezone)
        if ((key === 'county' || key === 'city' || key === 'timezone') && Array.isArray(value) && value.length > 0) {
          console.log(`✅ Adding array filter for ${key} IN [${value.join(', ')}]`);
          const placeholders = value.map((_, index) => `$${valueIndex + index}`).join(', ');
          
          if (key === 'timezone') {
            // Convert all values to timezone IDs
            const timezoneIds = [];
            for (const v of value) {
              const trimmed = v.toString().trim();
              // If it's already a number, use it as is
              if (!isNaN(parseInt(trimmed))) {
                timezoneIds.push(parseInt(trimmed));
              } else {
                // If it's a display name, convert it to ID using a subquery
                console.log(`🔄 Converting timezone display name "${trimmed}" to ID in advanced filters`);
                const subQuery = `(SELECT id FROM timezones WHERE display_name = $${valueIndex})`;
                whereConditions.push(`tz.id = ${subQuery}`);
                values.push(trimmed);
                valueIndex++;
              }
            }
            
            if (timezoneIds.length > 0) {
              const placeholders = timezoneIds.map((_, index) => `$${valueIndex + index}`).join(', ');
              whereConditions.push(`tz.id IN (${placeholders})`);
              values.push(...timezoneIds);
              valueIndex += timezoneIds.length;
              console.log(`✅ Added advanced timezone ID filter: tz.id IN (${placeholders}) with values:`, timezoneIds);
            }
          } else {
            whereConditions.push(`dr.${key} IN (${placeholders})`);
          }
          
          values.push(...value.map(v => v.toString().trim()));
          valueIndex += value.length;
          return;
        }
        
        // Skip processing if value is empty string after array check
        if (typeof value === 'string' && value.trim() === '') return;
        
        console.log(`🔍 Processing filter: ${key} = ${value}`);
        
        if (key.endsWith('_min') && value !== '') {
          const baseKey = key.replace('_min', '');
          if (columns.includes(baseKey)) {
            console.log(`✅ Adding min filter for ${baseKey} >= ${value}`);
            
            // Additional validation for numeric values
            const numericValue = parseFloat(value);
            if (isNaN(numericValue)) {
              console.warn(`⚠️ Skipping invalid numeric value for ${baseKey}: ${value}`);
              return;
            }
            
            // Handle percentage fields specially
            if (baseKey === 'unemployment_pct' || baseKey === 'pct_hh_w_income_200k_plus') {
              // For percentage fields, remove % symbol and compare as numeric
              whereConditions.push(`CAST(REPLACE(dr.${baseKey}, '%', '') AS NUMERIC) >= $${valueIndex}`);
            } else if (baseKey.includes('race_ethnicity')) {
              // For race fields, convert directly to numeric (no % symbol)
              whereConditions.push(`CAST(dr.${baseKey} AS NUMERIC) >= $${valueIndex}`);
            } else {
              // For other numeric fields, handle currency and commas
              whereConditions.push(`CAST(REPLACE(REPLACE(REPLACE(dr.${baseKey}, '%', ''), '$', ''), ',', '') AS NUMERIC) >= $${valueIndex}`);
            }
            values.push(numericValue);
            valueIndex++;
          } else {
            console.warn(`⚠️ Field ${baseKey} not found in columns:`, columns);
          }
        } else if (key.endsWith('_max') && value !== '') {
          const baseKey = key.replace('_max', '');
          if (columns.includes(baseKey)) {
            console.log(`✅ Adding max filter for ${baseKey} <= ${value}`);
            
            // Additional validation for numeric values
            const numericValue = parseFloat(value);
            if (isNaN(numericValue)) {
              console.warn(`⚠️ Skipping invalid numeric value for ${baseKey}: ${value}`);
              return;
            }
            
            // Handle percentage fields specially
            if (baseKey === 'unemployment_pct' || baseKey === 'pct_hh_w_income_200k_plus') {
              // For percentage fields, remove % symbol and compare as numeric
              whereConditions.push(`CAST(REPLACE(dr.${baseKey}, '%', '') AS NUMERIC) <= $${valueIndex}`);
            } else if (baseKey.includes('race_ethnicity')) {
              // For race fields, convert directly to numeric (no % symbol)
              whereConditions.push(`CAST(dr.${baseKey} AS NUMERIC) <= $${valueIndex}`);
            } else {
              // For other numeric fields, handle currency and commas
              whereConditions.push(`CAST(REPLACE(REPLACE(REPLACE(dr.${baseKey}, '%', ''), '$', ''), ',', '') AS NUMERIC) <= $${valueIndex}`);
            }
            values.push(numericValue);
            valueIndex++;
          } else {
            console.warn(`⚠️ Field ${baseKey} not found in columns:`, columns);
          }
        } else if (key.endsWith('_like') && value !== '') {
          const baseKey = key.replace('_like', '');
          if (columns.includes(baseKey)) {
            console.log(`✅ Adding like filter for ${baseKey} LIKE %${value}%`);
            whereConditions.push(`${baseKey} ILIKE $${valueIndex}`);
            values.push(`%${value}%`);
            valueIndex++;
          } else {
            console.warn(`⚠️ Field ${baseKey} not found in columns:`, columns);
          }
        }
      });

      console.log('🔍 Final where conditions:', whereConditions);
      console.log('🔍 Final values:', values);

      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
        zipcodesQuery += whereClause;
        
        console.log('🔍 Final SQL query:', query);
        console.log('🔍 Final count query:', countQuery);
        console.log('🔍 Final zipcodes query:', zipcodesQuery);
      }

      // Validate sort column exists
      let validSortBy = sortBy;
      if (!columns.includes(sortBy)) {
        validSortBy = 'created_at';
      }

      // Add sorting and pagination only to main query
      query += ` ORDER BY ${validSortBy} ${sortOrder} LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      
      // Add sorting to zipcodes query but NO pagination
      zipcodesQuery += ` ORDER BY zip_code`;
      
      values.push(limitNum, offset);

      // Execute all queries in parallel
      const [result, countResult, zipcodesResult] = await Promise.all([
        db.query(query, values),
        db.query(countQuery, values.slice(0, -2)),
        db.query(zipcodesQuery, values.slice(0, -2)) // Use same values but without pagination
      ]);

              // Extract unique zipcodes from filtered results (all matching records, not just current page)
        const filteredZipcodes = zipcodesResult.rows.map(row => row.zip_code).sort();
      console.log('🔍 Zipcodes query returned rows:', zipcodesResult.rows.length);
      console.log('🔍 All matching zipcodes:', filteredZipcodes);

      return {
        records: result.rows,
        filteredZipcodes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limitNum)
        }
      };
    } catch (error) {
      console.error('Error finding demographic records:', error);
      throw error;
    }
  }

  // Dynamic find by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM demographic_records WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding demographic record by ID:', error);
      throw error;
    }
  }

  // Dynamic find by zipcode
  static async findByZipcode(zipcode) {
    try {
      const query = 'SELECT * FROM demographic_records WHERE zip_code = $1';
      const result = await db.query(query, [zipcode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding demographic record by zipcode:', error);
      throw error;
    }
  }

  // Dynamic update method
  static async update(id, updateData) {
    try {
      const columns = await this.getTableColumns();
      const validFields = Object.keys(updateData).filter(field => columns.includes(field));
      
      if (validFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const fields = validFields;
      const values = validFields.map(field => updateData[field]);
      
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const query = `
        UPDATE demographic_records 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *
      `;
      
      const result = await db.query(query, [id, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating demographic record:', error);
      throw error;
    }
  }

  // Dynamic delete method
  static async delete(id) {
    try {
      const query = 'DELETE FROM demographic_records WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting demographic record:', error);
      throw error;
    }
  }

  // Dynamic statistics with column validation
  static async getStats() {
    try {
      const columns = await this.getTableColumns();
      
      // Build dynamic stats query based on available columns
      let statsQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT state) as unique_states,
          COUNT(DISTINCT county) as unique_counties,
          COUNT(DISTINCT city) as unique_cities
      `;

      // Add numeric field statistics if columns exist
      const numericFields = ['mhhi', 'avg_hhi', 'pc_income', 'median_age'];
      numericFields.forEach(field => {
        if (columns.includes(field)) {
          // Handle text fields (mhhi, avg_hhi, pc_income) differently from numeric fields (median_age)
          if (['mhhi', 'avg_hhi', 'pc_income'].includes(field)) {
            // Text fields - check for empty strings and invalid values
            statsQuery += `,
              AVG(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != '' 
                       AND ${field} != '-1' 
                       AND ${field} ~ '^-?[0-9]+(\\.[0-9]+)?$'
                       THEN CAST(${field} AS DECIMAL) END) as avg_${field},
              MIN(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != '' 
                       AND ${field} != '-1' 
                       AND ${field} ~ '^-?[0-9]+(\\.[0-9]+)?$'
                       THEN CAST(${field} AS DECIMAL) END) as min_${field},
              MAX(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != '' 
                       AND ${field} != '-1' 
                       AND ${field} ~ '^-?[0-9]+(\\.[0-9]+)?$'
                       THEN CAST(${field} AS DECIMAL) END) as max_${field}`;
          } else {
            // Numeric fields (median_age, median_income) - only check for NULL and invalid values
            statsQuery += `,
              AVG(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != -1
                       THEN ${field} END) as avg_${field},
              MIN(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != -1
                       THEN ${field} END) as min_${field},
              MAX(CASE WHEN ${field} IS NOT NULL 
                       AND ${field} != -1
                       THEN ${field} END) as max_${field}`;
          }
        }
      });

      statsQuery += ' FROM demographic_records';
      
      const result = await db.query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting demographic statistics:', error);
      throw error;
    }
  }

  // Get unique values for a specific field (for dropdowns)
  static async getUniqueValues(field, search = '', limit = 10) {
    try {
      console.log('🔍 Model getUniqueValues called with:', { field, search, limit });
      
      const columns = await this.getTableColumns();
      console.log('🔍 Available columns:', columns);
      
      // Special handling for timezone fields
      if (field === 'timezone_display_name' || field === 'timezone') {
        console.log('🔍 Processing timezone field with JOIN query');
        
        let query;
        let params = [];
        
        if (search && search.trim()) {
          query = `
            SELECT DISTINCT tz.display_name as timezone_display_name, tz.abbreviation_standard
            FROM demographic_records dr
            LEFT JOIN timezones tz ON dr.timezone_id = tz.id
            WHERE tz.display_name IS NOT NULL 
            AND tz.display_name ILIKE $1
            ORDER BY tz.display_name
            LIMIT $2
          `;
          params = [`%${search.trim()}%`, limit];
        } else {
          query = `
            SELECT DISTINCT tz.display_name as timezone_display_name, tz.abbreviation_standard
            FROM demographic_records dr
            LEFT JOIN timezones tz ON dr.timezone_id = tz.id
            WHERE tz.display_name IS NOT NULL 
            ORDER BY tz.display_name
            LIMIT $1
          `;
          params = [limit];
        }
        
        console.log('🔍 Executing timezone query:', query);
        const result = await db.query(query, params);
        console.log('🔍 Timezone query result rows:', result.rows.length);
        
        const timezoneValues = result.rows.map(row => row.timezone_display_name).filter(value => value !== null && value !== '');
        console.log('🔍 Timezone values:', timezoneValues);
        
        return timezoneValues;
      }
      
      if (!columns.includes(field)) {
        console.log('❌ Field not found in columns:', field);
        throw new Error(`Field ${field} does not exist in the table`);
      }

      let query;
      let params = [];
      
      if (search && search.trim()) {
        // Use ILIKE for case-insensitive search with wildcards
        query = `
          SELECT DISTINCT ${field} 
          FROM demographic_records 
          WHERE ${field} IS NOT NULL 
          AND ${field} != '' 
          AND ${field} ILIKE $1
          ORDER BY ${field}
          LIMIT $2
        `;
        params = [`%${search.trim()}%`, limit];
        console.log('🔍 Using search query with params:', { query, params });
      } else {
        // Return all unique values up to limit
        query = `
          SELECT DISTINCT ${field} 
          FROM demographic_records 
          WHERE ${field} IS NOT NULL 
          AND ${field} != '' 
          ORDER BY ${field}
          LIMIT $1
        `;
        params = [limit];
        console.log('🔍 Using default query with params:', { query, params });
      }
      
      console.log('🔍 Executing query:', query);
      const result = await db.query(query, params);
      console.log('🔍 Query result rows:', result.rows.length);
      
      const filteredValues = result.rows.map(row => row[field]).filter(value => value !== null && value !== '');
      console.log('🔍 Filtered values:', filteredValues);
      
      return filteredValues;
    } catch (error) {
      console.error('❌ Error in model getUniqueValues:', error);
      throw error;
    }
  }

  // Get all filter options for the UI
  static async getFilterOptions() {
    try {
      const columns = await this.getTableColumns();
      
      const options = {};
      
      // Get unique values for categorical fields
      const categoricalFields = ['state', 'county', 'city'];
      for (const field of categoricalFields) {
        if (columns.includes(field)) {
          try {
            options[field] = await this.getUniqueValues(field, '', 100);
          } catch (error) {
            console.warn(`Warning: Could not get unique values for ${field}:`, error.message);
          }
        }
      }

      // Get min/max ranges for numeric fields - simplified approach
      const numericFields = [
        'mhhi', 'avg_hhi', 'pc_income', 'median_age', 'households', 
        'family_hh_total', 'housing_units', 'owner_occupied', 'edu_att_bachelors', 'pop_dens_sq_mi'
      ];

      // Percentage fields (these actually contain % symbols)
      const percentageFields = [
        'unemployment_pct', 'pct_hh_w_income_200k_plus'
      ];

      // Race/ethnicity fields (these are raw numbers, not percentages)
      const raceFields = [
        'race_ethnicity_white', 'race_ethnicity_black', 'race_ethnicity_hispanic'
      ];

      // Process regular numeric fields
      for (const field of numericFields) {
        if (columns.includes(field)) {
          try {
            const query = `
              SELECT DISTINCT ${field} 
              FROM demographic_records 
              WHERE ${field} IS NOT NULL 
              AND ${field} != '' 
              AND ${field} != '-1'
              AND ${field} NOT LIKE '%N/A%'
              AND ${field} NOT LIKE '%Unknown%'
              ORDER BY ${field}
            `;
            
            const result = await db.query(query);
            if (result.rows.length > 0) {
              const values = result.rows.map(row => row[field]);
              
              // Clean and convert values to numbers
              const numericValues = values
                .map(val => {
                  if (typeof val === 'string') {
                    // For regular numeric fields, remove %, $, commas
                    const cleaned = val.replace(/[%,$]/g, '').replace(/,/g, '');
                    const num = parseFloat(cleaned);
                    return isNaN(num) ? null : num;
                  }
                  return typeof val === 'number' ? val : null;
                })
                .filter(val => val !== null);
              
              if (numericValues.length > 0) {
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                
                if (min !== Infinity && max !== -Infinity) {
                  options[field] = {
                    min: Math.floor(min),
                    max: Math.ceil(max)
                  };
                }
              }
            }
          } catch (fieldError) {
            console.warn(`Warning: Could not get range for field ${field}:`, fieldError.message);
            continue;
          }
        }
      }

      // Process percentage fields
      for (const field of percentageFields) {
        if (columns.includes(field)) {
          try {
            const query = `
              SELECT DISTINCT ${field} 
              FROM demographic_records 
              WHERE ${field} IS NOT NULL 
              AND ${field} != '' 
              AND ${field} != '-1'
              AND ${field} NOT LIKE '%N/A%'
              AND ${field} NOT LIKE '%Unknown%'
              ORDER BY ${field}
            `;
            
            const result = await db.query(query);
            if (result.rows.length > 0) {
              const values = result.rows.map(row => row[field]);
              
              console.log(`🔍 Processing percentage field ${field}:`, values.slice(0, 5));
              
              // Clean and convert percentage values to numbers
              const numericValues = values
                .map(val => {
                  if (typeof val === 'string') {
                    // For percentage fields, just remove % symbol
                    const cleaned = val.replace(/%/g, '');
                    const num = parseFloat(cleaned);
                    if (isNaN(num)) {
                      console.warn(`⚠️ Could not parse percentage value: "${val}" for field ${field}`);
                      return null;
                    }
                    return num;
                  }
                  return typeof val === 'number' ? val : null;
                })
                .filter(val => val !== null);
              
              if (numericValues.length > 0) {
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                
                if (min !== Infinity && max !== -Infinity) {
                  options[field] = {
                    min: Math.floor(min),
                    max: Math.ceil(max)
                  };
                  
                  console.log(`✅ Percentage field ${field} range: ${min} - ${max}`);
                }
              }
            }
          } catch (fieldError) {
            console.warn(`Warning: Could not get range for field ${field}:`, fieldError.message);
            continue;
          }
        }
      }

      // Process race/ethnicity fields (these are raw numbers, not percentages)
      for (const field of raceFields) {
        if (columns.includes(field)) {
          try {
            const query = `
              SELECT DISTINCT ${field} 
              FROM demographic_records 
              WHERE ${field} IS NOT NULL 
              AND ${field} != '' 
              AND ${field} != '-1'
              AND ${field} NOT LIKE '%N/A%'
              AND ${field} NOT LIKE '%Unknown%'
              ORDER BY ${field}
            `;
            
            const result = await db.query(query);
            if (result.rows.length > 0) {
              const values = result.rows.map(row => row[field]);
              
              console.log(`🔍 Processing race field ${field}:`, values.slice(0, 5));
              
              // Clean and convert race values to numbers
              const numericValues = values
                .map(val => {
                  if (typeof val === 'string') {
                    // For race fields, just convert to number (no % symbol to remove)
                    const num = parseFloat(val);
                    if (isNaN(num)) {
                      console.warn(`⚠️ Could not parse race value: "${val}" for field ${field}`);
                      return null;
                    }
                    return num;
                  }
                  return typeof val === 'number' ? val : null;
                })
                .filter(val => val !== null);
              
              if (numericValues.length > 0) {
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                
                if (min !== Infinity && max !== -Infinity) {
                  options[field] = {
                    min: Math.floor(min),
                    max: Math.ceil(max)
                  };
                  
                  console.log(`✅ Race field ${field} range: ${min} - ${max}`);
                }
              }
            }
          } catch (fieldError) {
            console.warn(`Warning: Could not get range for field ${field}:`, fieldError.message);
            continue;
          }
        }
      }

      return options;
    } catch (error) {
      console.error('Error getting filter options:', error);
      throw error;
    }
  }

  // Get basic filter options as fallback
  static async getBasicFilterOptions() {
    try {
      const columns = await this.getTableColumns();
      
      const options = {};
      
      // Get unique values for categorical fields (these should always work)
      const categoricalFields = ['state', 'county', 'city'];
      for (const field of categoricalFields) {
        if (columns.includes(field)) {
          try {
            options[field] = await this.getUniqueValues(field, '', 100);
          } catch (error) {
            console.warn(`Warning: Could not get unique values for ${field}:`, error.message);
          }
        }
      }

      // Add some basic numeric ranges as fallback
      options.mhhi = { min: 0, max: 200000 };
      options.avg_hhi = { min: 0, max: 200000 };
      options.median_age = { min: 18, max: 85 };
      options.households = { min: 0, max: 100000 };
      options.pop_dens_sq_mi = { min: 0, max: 50000 };

      return options;
    } catch (error) {
      console.error('Error getting basic filter options:', error);
      // Return minimal options as last resort
      return {
        state: ['Alabama', 'Alaska', 'Arizona', 'California', 'Texas'],
        mhhi: { min: 0, max: 200000 },
        median_age: { min: 18, max: 85 }
      };
    }
  }

  // Get table schema information
  static async getSchemaInfo() {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'demographic_records' 
        ORDER BY ordinal_position
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting schema info:', error);
      throw error;
    }
  }
}

module.exports = DemographicRecord;
