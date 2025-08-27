const db = require('../config/database');

class FileUpload {
  static async create(uploadData) {
    try {
      const { filename, originalName, fileSize, filePath, fileType = 'standard' } = uploadData;
      
      // Validate and sanitize inputs
      const filenameStr = String(filename || '').substring(0, 255);
      const originalNameStr = String(originalName || '').substring(0, 255);
      const fileSizeInt = parseInt(fileSize) || 0;
      const filePathStr = filePath ? String(filePath).substring(0, 500) : null;
      const fileTypeStr = String(fileType || 'standard').substring(0, 50);
      
      const query = `
        INSERT INTO file_uploads (filename, original_name, file_size, file_path, file_type, status)
        VALUES ($1::VARCHAR(255), $2::VARCHAR(255), $3::BIGINT, $4::VARCHAR(500), $5::VARCHAR(50), $6::VARCHAR(20))
        RETURNING *
      `;
      const values = [filenameStr, originalNameStr, fileSizeInt, filePathStr, fileTypeStr, 'processing'];
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating upload record:', error);
      
      // Handle sequence issues specifically
      if (error.code === '23505' && error.constraint === 'file_uploads_pkey') {
        console.log('🔄 Detected sequence issue, attempting to fix...');
        try {
          // Fix the sequence
          await FileUpload.fixSequence();
          
          // Retry the insert
          const retryQuery = `
            INSERT INTO file_uploads (filename, original_name, file_size, file_path, file_type, status)
            VALUES ($1::VARCHAR(255), $2::VARCHAR(255), $3::BIGINT, $4::VARCHAR(500), $5::VARCHAR(50), $6::VARCHAR(20))
            RETURNING *
          `;
          const retryResult = await db.query(retryQuery, values);
          console.log('✅ Sequence fixed and insert retried successfully');
          return retryResult.rows[0];
        } catch (retryError) {
          console.error('❌ Failed to fix sequence and retry:', retryError);
          throw retryError;
        }
      }
      
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
    const { page = 1, limit = 20, status, filters = {} } = options;
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

    // Add file type filter
    if (filters.fileType) {
      whereConditions.push(`file_type = $${valueIndex}`);
      values.push(filters.fileType);
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
      records: uploadsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  static async delete(id) {
    try {
      const query = 'DELETE FROM file_uploads WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting upload:', error);
      throw error;
    }
  }

  static async getStatsByType(fileType = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_uploads,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_uploads,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_uploads,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_uploads,
          SUM(records_count) as total_records_processed,
          AVG(records_count) as avg_records_per_upload,
          SUM(file_size) as total_file_size,
          AVG(file_size) as avg_file_size
        FROM file_uploads
      `;
      
      let values = [];
      if (fileType) {
        query += ' WHERE file_type = $1';
        values.push(fileType);
      }
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting upload stats:', error);
      throw error;
    }
  }

  static async getRecentUploads(limit = 10, fileType = null) {
    try {
      let query = `
        SELECT * FROM file_uploads 
        ORDER BY created_at DESC 
        LIMIT $1
      `;
      
      let values = [limit];
      if (fileType) {
        query = `
          SELECT * FROM file_uploads 
          WHERE file_type = $2
          ORDER BY created_at DESC 
          LIMIT $1
        `;
        values = [limit, fileType];
      }
      
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent uploads:', error);
      throw error;
    }
  }

  static async fixSequence() {
    try {
      console.log('🔧 Fixing file_uploads sequence...');
      
      // Get current max ID
      const maxIdResult = await db.query('SELECT MAX(id) as max_id FROM file_uploads');
      const maxId = maxIdResult.rows[0].max_id || 0;
      
      // Set sequence to max ID + 1
      const newSequenceValue = maxId + 1;
      await db.query('SELECT setval(\'file_uploads_id_seq\', $1, true)', [newSequenceValue]);
      
      console.log(`✅ Sequence fixed to: ${newSequenceValue}`);
      return newSequenceValue;
    } catch (error) {
      console.error('Error fixing sequence:', error);
      throw error;
    }
  }
}

module.exports = FileUpload;
