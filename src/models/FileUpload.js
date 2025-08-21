const db = require('../config/database');

class FileUpload {
  static async create(uploadData) {
    try {
      const { filename, originalName, fileSize, filePath } = uploadData;
      
      // Validate and sanitize inputs
      const filenameStr = String(filename || '').substring(0, 255);
      const originalNameStr = String(originalName || '').substring(0, 255);
      const fileSizeInt = parseInt(fileSize) || 0;
      const filePathStr = filePath ? String(filePath).substring(0, 500) : null;
      
      const query = `
        INSERT INTO file_uploads (filename, original_name, file_size, file_path, status)
        VALUES ($1::VARCHAR(255), $2::VARCHAR(255), $3::BIGINT, $4::VARCHAR(500), $5::VARCHAR(20))
        RETURNING *
      `;
      const values = [filenameStr, originalNameStr, fileSizeInt, filePathStr, 'processing'];
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating upload record:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, recordsCount = null, errorMessage = null) {
    try {
      // Convert parameters to proper types and validate
      const statusStr = String(status || 'processing').substring(0, 20);
      const recordsCountInt = recordsCount !== null && recordsCount !== undefined ? parseInt(recordsCount) || 0 : null;
      const errorMessageStr = errorMessage !== null && errorMessage !== undefined ? String(errorMessage).substring(0, 500) : null;
      
      // Use explicit type casting in the query
      const query = `
        UPDATE file_uploads 
        SET status = $2::VARCHAR(20), 
            records_count = COALESCE($3::INTEGER, records_count),
            error_message = $4::VARCHAR(500),
            completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $1::INTEGER
        RETURNING *
      `;
      const values = [id, statusStr, recordsCountInt, errorMessageStr];
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating upload status:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM file_uploads WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM file_uploads';
    let countQuery = 'SELECT COUNT(*) FROM file_uploads';
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    if (status) {
      whereConditions.push(`status = $${valueIndex}`);
      values.push(status);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` ORDER BY created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(limit, offset);

    const [uploadsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2))
    ]);

    return {
      uploads: uploadsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_uploads,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_uploads,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_uploads,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_uploads,
        SUM(records_count) as total_records_processed
      FROM file_uploads
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  static async deleteById(id) {
    const query = 'DELETE FROM file_uploads WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = FileUpload;
