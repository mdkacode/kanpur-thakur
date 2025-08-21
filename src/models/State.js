const db = require('../config/database');

class State {
  static async create(stateData) {
    const { state_code, state_name, region } = stateData;
    const query = `
      INSERT INTO states (state_code, state_name, region)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [state_code, state_name, region];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM states WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByCode(stateCode) {
    const query = 'SELECT * FROM states WHERE state_code = $1';
    const result = await db.query(query, [stateCode]);
    return result.rows[0];
  }

  static async findAll(options = {}) {
    let query = 'SELECT * FROM states';
    const values = [];
    let paramCount = 0;

    if (options.region) {
      paramCount++;
      query += ` WHERE region = $${paramCount}`;
      values.push(options.region);
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    } else {
      query += ' ORDER BY state_name';
    }

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(options.limit);
    }

    if (options.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(options.offset);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  static async update(id, stateData) {
    const { state_code, state_name, region } = stateData;
    const query = `
      UPDATE states 
      SET state_code = $1, state_name = $2, region = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const values = [state_code, state_name, region, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async deleteById(id) {
    const query = 'DELETE FROM states WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_states,
        COUNT(DISTINCT region) as total_regions,
        region,
        COUNT(*) as states_in_region
      FROM states 
      GROUP BY region 
      ORDER BY states_in_region DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async getRegions() {
    const query = 'SELECT DISTINCT region FROM states ORDER BY region';
    const result = await db.query(query);
    return result.rows.map(row => row.region);
  }

  static async getStatesByRegion(region) {
    const query = 'SELECT * FROM states WHERE region = $1 ORDER BY state_name';
    const result = await db.query(query, [region]);
    return result.rows;
  }

  static async searchStates(searchTerm) {
    const query = `
      SELECT * FROM states 
      WHERE state_name ILIKE $1 OR state_code ILIKE $1
      ORDER BY state_name
    `;
    const result = await db.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }
}

module.exports = State;
