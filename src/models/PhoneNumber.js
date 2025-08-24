const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class PhoneNumber {
  // Create a new phone number generation job
  static async createJob(runId, zip, filterId = null) {
    try {
      const jobId = uuidv4();
      
      // Handle null run_id for CSV-based generation
      if (runId === 'csv-generated') {
        runId = null;
      }
      
      const query = `
        INSERT INTO phone_number_jobs (job_id, run_id, zip, filter_id, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `;
      
      const result = await db.query(query, [jobId, runId, zip, filterId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating phone number job:', error);
      throw error;
    }
  }

  // Update job status
  static async updateJobStatus(jobId, status, additionalData = {}) {
    try {
      const updateFields = ['status = $2'];
      const values = [jobId, status];
      let valueIndex = 3;

      if (additionalData.totalNumbers !== undefined) {
        updateFields.push(`total_numbers = $${valueIndex++}`);
        values.push(additionalData.totalNumbers);
      }

      if (additionalData.generatedNumbers !== undefined) {
        updateFields.push(`generated_numbers = $${valueIndex++}`);
        values.push(additionalData.generatedNumbers);
      }

      if (additionalData.failedNumbers !== undefined) {
        updateFields.push(`failed_numbers = $${valueIndex++}`);
        values.push(additionalData.failedNumbers);
      }

      if (additionalData.finishedAt !== undefined) {
        updateFields.push(`finished_at = $${valueIndex++}`);
        values.push(additionalData.finishedAt);
      }

      if (additionalData.errorMessage !== undefined) {
        updateFields.push(`error_message = $${valueIndex++}`);
        values.push(additionalData.errorMessage);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE phone_number_jobs 
        SET ${updateFields.join(', ')}
        WHERE job_id = $1
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating phone number job:', error);
      throw error;
    }
  }

  // Get job by ID
  static async getJobById(jobId) {
    try {
      const query = `
        SELECT * FROM phone_number_jobs WHERE job_id = $1
      `;
      
      const result = await db.query(query, [jobId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting phone number job:', error);
      throw error;
    }
  }

  // Get jobs by run ID
  static async getJobsByRunId(runId) {
    try {
      const query = `
        SELECT * FROM phone_number_jobs WHERE run_id = $1 ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [runId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting phone number jobs by run ID:', error);
      throw error;
    }
  }

  // Get jobs by zip
  static async getJobsByZip(zip) {
    try {
      const query = `
        SELECT * FROM phone_number_jobs WHERE zip = $1 ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [zip]);
      return result.rows;
    } catch (error) {
      console.error('Error getting phone number jobs by zip:', error);
      throw error;
    }
  }

  // Bulk insert phone numbers
  static async bulkInsertPhoneNumbers(phoneNumbers) {
    try {
      if (phoneNumbers.length === 0) return [];

      const query = `
        INSERT INTO phone_numbers (
          job_id, run_id, zip, npa, nxx, thousands, full_phone_number, 
          state, timezone, company_type, company, ratecenter, filter_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (full_phone_number, job_id) DO NOTHING
        RETURNING id
      `;

      const results = [];
      for (const phoneNumber of phoneNumbers) {
        try {
          // Handle null run_id for CSV-based generation
          const runId = phoneNumber.run_id || null;
          
          const result = await db.query(query, [
            phoneNumber.job_id,
            runId,
            phoneNumber.zip,
            phoneNumber.npa,
            phoneNumber.nxx,
            phoneNumber.thousands,
            phoneNumber.full_phone_number,
            phoneNumber.state,
            phoneNumber.timezone,
            phoneNumber.company_type,
            phoneNumber.company,
            phoneNumber.ratecenter,
            phoneNumber.filter_id
          ]);
          
          if (result.rows[0]) {
            results.push(result.rows[0]);
          }
        } catch (error) {
          console.error('Error inserting phone number:', phoneNumber, error);
          // Continue with other phone numbers
        }
      }

      return results;
    } catch (error) {
      console.error('Error bulk inserting phone numbers:', error);
      throw error;
    }
  }

  // Get phone numbers by job ID
  static async getPhoneNumbersByJobId(jobId, page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT * FROM phone_numbers 
        WHERE job_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) FROM phone_numbers WHERE job_id = $1
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, [jobId, limit, offset]),
        db.query(countQuery, [jobId])
      ]);

      return {
        phoneNumbers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page,
          limit,
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting phone numbers by job ID:', error);
      throw error;
    }
  }

  // Get phone numbers by run ID
  static async getPhoneNumbersByRunId(runId, page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT * FROM phone_numbers 
        WHERE run_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) FROM phone_numbers WHERE run_id = $1
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, [runId, limit, offset]),
        db.query(countQuery, [runId])
      ]);

      return {
        phoneNumbers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page,
          limit,
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting phone numbers by run ID:', error);
      throw error;
    }
  }

  // Get phone numbers by zip
  static async getPhoneNumbersByZip(zip, page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT * FROM phone_numbers 
        WHERE zip = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) FROM phone_numbers WHERE zip = $1
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, [zip, limit, offset]),
        db.query(countQuery, [zip])
      ]);

      return {
        phoneNumbers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page,
          limit,
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting phone numbers by zip:', error);
      throw error;
    }
  }

  // Get phone number statistics
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_phone_numbers,
          COUNT(DISTINCT job_id) as total_jobs,
          COUNT(DISTINCT run_id) as total_runs,
          COUNT(DISTINCT zip) as total_zips,
          COUNT(DISTINCT state) as total_states
        FROM phone_numbers
      `;
      
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting phone number stats:', error);
      throw error;
    }
  }

  // Delete phone numbers by job ID
  static async deletePhoneNumbersByJobId(jobId) {
    try {
      const query = `
        DELETE FROM phone_numbers WHERE job_id = $1
      `;
      
      const result = await db.query(query, [jobId]);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting phone numbers by job ID:', error);
      throw error;
    }
  }

  // Delete phone numbers by run ID
  static async deletePhoneNumbersByRunId(runId) {
    try {
      const query = `
        DELETE FROM phone_numbers WHERE run_id = $1
      `;
      
      const result = await db.query(query, [runId]);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting phone numbers by run ID:', error);
      throw error;
    }
  }
}

module.exports = PhoneNumber;
