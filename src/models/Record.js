const db = require('../config/database');

class Record {
  static async create(recordData) {
    const { npa, nxx, zip, state_code, city, rc } = recordData;
    
    // Get state_id from state_code
    const stateQuery = 'SELECT id FROM states WHERE state_code = $1';
    const stateResult = await db.query(stateQuery, [state_code]);
    const state_id = stateResult.rows[0]?.id || null;

    const query = `
      INSERT INTO records (npa, nxx, zip, state_id, state_code, city, rc)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [npa, nxx, zip, state_id, state_code, city, rc];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async bulkCreate(records) {
    if (records.length === 0) return [];
    
    // Get all unique state codes first
    const stateCodes = [...new Set(records.map(r => r.state_code))];
    const stateQuery = 'SELECT id, state_code FROM states WHERE state_code = ANY($1)';
    const stateResult = await db.query(stateQuery, [stateCodes]);
    const stateMap = {};
    stateResult.rows.forEach(row => {
      stateMap[row.state_code] = row.id;
    });
    
    const query = `
      INSERT INTO records (npa, nxx, zip, state_id, state_code, city, rc)
      VALUES ${records.map((_, index) => {
        const offset = index * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(', ')}
      RETURNING *
    `;
    
    const values = records.flatMap(record => [
      record.npa, 
      record.nxx, 
      record.zip, 
      stateMap[record.state_code] || null, 
      record.state_code, 
      record.city, 
      record.rc
    ]);
    const result = await db.query(query, values);
    return result.rows;
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
    
    let query = 'SELECT * FROM records';
    let countQuery = 'SELECT COUNT(*) FROM records';
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(
        npa ILIKE $${valueIndex} OR 
        nxx ILIKE $${valueIndex} OR 
        zip ILIKE $${valueIndex} OR 
        state_code ILIKE $${valueIndex} OR 
        city ILIKE $${valueIndex} OR 
        rc ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    // Add advanced filters
    if (filters.npa) {
      whereConditions.push(`npa = $${valueIndex}`);
      values.push(filters.npa);
      valueIndex++;
    }

    if (filters.nxx) {
      whereConditions.push(`nxx = $${valueIndex}`);
      values.push(filters.nxx);
      valueIndex++;
    }

    if (filters.zip) {
      whereConditions.push(`zip = $${valueIndex}`);
      values.push(filters.zip);
      valueIndex++;
    }

    if (filters.state_code) {
      whereConditions.push(`state_code = $${valueIndex}`);
      values.push(filters.state_code);
      valueIndex++;
    }

    if (filters.city) {
      whereConditions.push(`city ILIKE $${valueIndex}`);
      values.push(`%${filters.city}%`);
      valueIndex++;
    }

    if (filters.rc) {
      whereConditions.push(`rc ILIKE $${valueIndex}`);
      values.push(`%${filters.rc}%`);
      valueIndex++;
    }

    if (filters.date_from) {
      whereConditions.push(`created_at >= $${valueIndex}`);
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`created_at <= $${valueIndex}`);
      values.push(filters.date_to);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
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
        npa,
        nxx,
        zip,
        state_code,
        city,
        rc,
        created_at
      FROM records
    `;
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(
        npa ILIKE $${valueIndex} OR 
        nxx ILIKE $${valueIndex} OR 
        zip ILIKE $${valueIndex} OR 
        state_code ILIKE $${valueIndex} OR 
        city ILIKE $${valueIndex} OR 
        rc ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    // Add advanced filters
    if (filters.npa) {
      whereConditions.push(`npa = $${valueIndex}`);
      values.push(filters.npa);
      valueIndex++;
    }

    if (filters.nxx) {
      whereConditions.push(`nxx = $${valueIndex}`);
      values.push(filters.nxx);
      valueIndex++;
    }

    if (filters.zip) {
      whereConditions.push(`zip = $${valueIndex}`);
      values.push(filters.zip);
      valueIndex++;
    }

    if (filters.state_code) {
      whereConditions.push(`state_code = $${valueIndex}`);
      values.push(filters.state_code);
      valueIndex++;
    }

    if (filters.city) {
      whereConditions.push(`city ILIKE $${valueIndex}`);
      values.push(`%${filters.city}%`);
      valueIndex++;
    }

    if (filters.rc) {
      whereConditions.push(`rc ILIKE $${valueIndex}`);
      values.push(`%${filters.rc}%`);
      valueIndex++;
    }

    if (filters.date_from) {
      whereConditions.push(`created_at >= $${valueIndex}`);
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`created_at <= $${valueIndex}`);
      values.push(filters.date_to);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Add sorting
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const result = await db.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM records WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByNpaNxx(npa, nxx) {
    const query = 'SELECT * FROM records WHERE npa = $1 AND nxx = $2';
    const result = await db.query(query, [npa, nxx]);
    return result.rows;
  }

  static async findByZip(zip) {
    const query = 'SELECT * FROM records WHERE zip = $1';
    const result = await db.query(query, [zip]);
    return result.rows;
  }

  static async findByState(state) {
    const query = 'SELECT * FROM records WHERE state_code = $1';
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
}

module.exports = Record;
