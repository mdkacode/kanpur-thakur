const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Telecare {
  // Create a new telecare run
  static async createRun(runData) {
    try {
      const {
        zip,
        input_csv_name,
        output_csv_name,
        script_version = '1.0.0',
        file_refs = {}
      } = runData;

      const run_id = uuidv4();
      const query = `
        INSERT INTO telecare_runs (
          run_id, zip, input_csv_name, output_csv_name, 
          script_version, file_refs, status, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'processing', CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [run_id, zip, input_csv_name, output_csv_name, script_version, file_refs];
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating telecare run:', error);
      throw error;
    }
  }

  // Update run status
  static async updateRunStatus(run_id, status, additionalData = {}) {
    try {
      const updateFields = ['status = $2'];
      const values = [run_id, status];
      let valueIndex = 3;

      if (additionalData.row_count !== undefined) {
        updateFields.push(`row_count = $${valueIndex++}`);
        values.push(additionalData.row_count);
      }

      if (additionalData.finished_at !== undefined) {
        updateFields.push(`finished_at = $${valueIndex++}`);
        values.push(additionalData.finished_at);
      }

      if (additionalData.file_refs !== undefined) {
        updateFields.push(`file_refs = $${valueIndex++}`);
        values.push(additionalData.file_refs);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE telecare_runs 
        SET ${updateFields.join(', ')}
        WHERE run_id = $1
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating telecare run status:', error);
      throw error;
    }
  }

  // Get run by ID
  static async getRunById(run_id) {
    try {
      const query = 'SELECT * FROM telecare_runs WHERE run_id = $1';
      const result = await db.query(query, [run_id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting telecare run by ID:', error);
      throw error;
    }
  }

  // Get runs by zipcode
  static async getRunsByZip(zip, limit = 10) {
    try {
      const query = `
        SELECT * FROM telecare_runs 
        WHERE zip = $1 
        ORDER BY started_at DESC 
        LIMIT $2
      `;
      const result = await db.query(query, [zip, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting telecare runs by zip:', error);
      throw error;
    }
  }

  // Get latest run for a zipcode
  static async getLatestRunByZip(zip) {
    try {
      const query = `
        SELECT * FROM telecare_runs 
        WHERE zip = $1 
        ORDER BY started_at DESC 
        LIMIT 1
      `;
      const result = await db.query(query, [zip]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting latest telecare run by zip:', error);
      throw error;
    }
  }

  // Save output rows
  static async saveOutputRows(run_id, zip, rows) {
    try {
      if (rows.length === 0) return [];

      const query = `
        INSERT INTO telecare_output_rows (run_id, zip, payload)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      const savedRows = [];
      for (const row of rows) {
        const result = await db.query(query, [run_id, zip, row]);
        savedRows.push(result.rows[0]);
      }

      return savedRows;
    } catch (error) {
      console.error('Error saving telecare output rows:', error);
      throw error;
    }
  }

  // Get output rows for a run
  static async getOutputRowsByRunId(run_id) {
    try {
      const query = `
        SELECT * FROM telecare_output_rows 
        WHERE run_id = $1 
        ORDER BY id
      `;
      const result = await db.query(query, [run_id]);
      return result.rows;
    } catch (error) {
      console.error('Error getting telecare output rows by run ID:', error);
      throw error;
    }
  }

  // Get telecare statistics
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_runs,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_runs,
          COUNT(DISTINCT zip) as unique_zips,
          SUM(row_count) as total_rows_processed
        FROM telecare_runs
      `;
      
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting telecare stats:', error);
      throw error;
    }
  }

  // Clean up old runs (optional maintenance)
  static async cleanupOldRuns(daysOld = 30) {
    try {
      const query = `
        DELETE FROM telecare_runs 
        WHERE started_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        AND status IN ('success', 'error')
      `;
      
      const result = await db.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up old telecare runs:', error);
      throw error;
    }
  }
}

module.exports = Telecare;
