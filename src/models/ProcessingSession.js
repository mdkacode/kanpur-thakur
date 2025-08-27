const db = require('../config/database');

class ProcessingSession {
  static async create(sessionData) {
    try {
      const {
        sessionId,
        userId,
        filterId,
        filterCriteria,
        sourceZipcodes,
        totalRecords,
        status = 'processing',
        sessionType = 'npa_nxx_processing'
      } = sessionData;

      const query = `
        INSERT INTO processing_sessions (
          session_id, user_id, filter_id, filter_criteria, source_zipcodes, 
          total_records, status, session_type, created_at, updated_at
        ) VALUES (
          $1::VARCHAR(255), $2::INTEGER, $3::INTEGER, $4::JSONB, $5::TEXT[], 
          $6::INTEGER, $7::VARCHAR(50), $8::VARCHAR(100), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `;

      const values = [
        sessionId,
        userId,
        filterId,
        JSON.stringify(filterCriteria),
        sourceZipcodes,
        totalRecords,
        status,
        sessionType
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating processing session:', error);
      throw error;
    }
  }

  static async addGeneratedFile(sessionId, fileData) {
    try {
      const {
        fileName,
        filePath,
        fileType,
        fileSize,
        recordCount,
        description
      } = fileData;

      const query = `
        INSERT INTO processing_files (
          session_id, file_name, file_path, file_type, file_size, 
          record_count, description, created_at
        ) VALUES (
          $1::VARCHAR(255), $2::VARCHAR(255), $3::VARCHAR(500), $4::VARCHAR(50), 
          $5::BIGINT, $6::INTEGER, $7::TEXT, CURRENT_TIMESTAMP
        ) RETURNING *
      `;

      const values = [
        sessionId,
        fileName,
        filePath,
        fileType,
        fileSize,
        recordCount,
        description
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding generated file:', error);
      throw error;
    }
  }

  static async updateStatus(sessionId, status, additionalData = {}) {
    try {
      const { processedRecords, errorMessage, completionTime } = additionalData;

      let query = `
        UPDATE processing_sessions 
        SET status = $2::VARCHAR(50), updated_at = CURRENT_TIMESTAMP
      `;
      let values = [sessionId, status];
      let valueIndex = 3;

      if (processedRecords !== undefined) {
        query += `, processed_records = $${valueIndex}::INTEGER`;
        values.push(processedRecords);
        valueIndex++;
      }

      if (errorMessage !== undefined) {
        query += `, error_message = $${valueIndex}::TEXT`;
        values.push(errorMessage);
        valueIndex++;
      }

      if (completionTime !== undefined) {
        query += `, completed_at = $${valueIndex}::TIMESTAMP`;
        values.push(completionTime);
        valueIndex++;
      }

      query += ` WHERE session_id = $1 RETURNING *`;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating processing session status:', error);
      throw error;
    }
  }

  static async findById(sessionId) {
    try {
      const query = `
        SELECT 
          ps.*,
          uf.name as filter_name,
          COUNT(pf.id) as generated_files_count
        FROM processing_sessions ps
        LEFT JOIN user_filters uf ON ps.filter_id = uf.id
        LEFT JOIN processing_files pf ON ps.session_id = pf.session_id
        WHERE ps.session_id = $1
        GROUP BY ps.id, uf.name
      `;

      const result = await db.query(query, [sessionId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding processing session:', error);
      throw error;
    }
  }

  static async findGeneratedFiles(sessionId) {
    try {
      const query = `
        SELECT * FROM processing_files 
        WHERE session_id = $1 
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [sessionId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding generated files:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      const { page = 1, limit = 20, status, sessionType, userId } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          ps.*,
          uf.name as filter_name,
          COUNT(pf.id) as generated_files_count
        FROM processing_sessions ps
        LEFT JOIN user_filters uf ON ps.filter_id = uf.id
        LEFT JOIN processing_files pf ON ps.session_id = pf.session_id
      `;

      let countQuery = `
        SELECT COUNT(*) FROM processing_sessions ps
      `;

      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      if (status) {
        whereConditions.push(`ps.status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }

      if (sessionType) {
        whereConditions.push(`ps.session_type = $${valueIndex}`);
        values.push(sessionType);
        valueIndex++;
      }

      if (userId) {
        whereConditions.push(`ps.user_id = $${valueIndex}`);
        values.push(userId);
        valueIndex++;
      }

      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      query += ` GROUP BY ps.id, uf.name ORDER BY ps.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);

      const [sessionsResult, countResult] = await Promise.all([
        db.query(query, values),
        db.query(countQuery, values.slice(0, -2))
      ]);

      return {
        records: sessionsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('Error finding processing sessions:', error);
      throw error;
    }
  }

  static async getSessionStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_sessions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
          SUM(total_records) as total_records_processed,
          AVG(total_records) as avg_records_per_session,
          COUNT(DISTINCT user_id) as unique_users
        FROM processing_sessions
      `;

      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }
}

module.exports = ProcessingSession;
