const db = require('../config/database');

class Filter {
  static async createFilter(filterData) {
    try {
      const { name, user_id, filter_type, filter_config, is_active = true } = filterData;
      
      const query = `
        INSERT INTO user_filters (name, user_id, filter_type, filter_config, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [name, user_id, filter_type, filter_config, is_active];
      const result = await db.query(query, values);
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error creating filter:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getFiltersByUser(userId, filterType = null) {
    try {
      let query = `
        SELECT * FROM user_filters 
        WHERE user_id = $1 AND is_active = true
      `;
      let values = [userId];
      
      if (filterType) {
        query += ` AND filter_type = $2`;
        values.push(filterType);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await db.query(query, values);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error getting filters:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async updateFilter(filterId, filterData) {
    try {
      const { name, filter_config, is_active } = filterData;
      
      const query = `
        UPDATE user_filters 
        SET name = $1, filter_config = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      
      const values = [name, filter_config, is_active, filterId];
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Filter not found'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error updating filter:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async deleteFilter(filterId) {
    try {
      const query = `
        UPDATE user_filters 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [filterId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Filter not found'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error deleting filter:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getFilterById(filterId) {
    try {
      const query = `
        SELECT * FROM user_filters 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await db.query(query, [filterId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Filter not found'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting filter:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Filter;
