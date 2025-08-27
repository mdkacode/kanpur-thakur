const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class PhoneNumber {
  // Create a new phone number generation job
  static async createJob(jobType, zip, filterId = null) {
    try {
      // Handle null run_id for CSV-based generation and direct NPA NXX generation
      let runId = null;
      if (jobType === 'telecare-generated') {
        // For telecare-generated jobs, we need a run_id
        // This should be passed as filterId when calling from telecare context
        runId = filterId;
        filterId = null;
      }
      
      const query = `
        INSERT INTO phone_number_jobs (run_id, job_type, status)
        VALUES ($1, $2, 'pending')
        RETURNING *
      `;
      
      const result = await db.query(query, [runId, jobType]);
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
        updateFields.push(`total_records = $${valueIndex++}`);
        values.push(additionalData.totalNumbers);
      }

      if (additionalData.generatedNumbers !== undefined) {
        updateFields.push(`generated_numbers = $${valueIndex++}`);
        values.push(additionalData.generatedNumbers);
      }

      if (additionalData.failedNumbers !== undefined) {
        updateFields.push(`processed_records = $${valueIndex++}`);
        values.push(additionalData.failedNumbers);
      }

      if (additionalData.finishedAt !== undefined) {
        updateFields.push(`completed_at = $${valueIndex++}`);
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
        WHERE id = $1
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
        SELECT * FROM phone_number_jobs WHERE id = $1
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
        SELECT DISTINCT pnj.* 
        FROM phone_number_jobs pnj
        INNER JOIN phone_numbers pn ON pnj.id = pn.job_id
        WHERE pn.zip = $1 
        ORDER BY pnj.created_at DESC
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
          job_id, npa, nxx, thousands, full_phone_number, 
          zip, state_code, city, county, timezone_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (full_phone_number) DO NOTHING
        RETURNING id
      `;

      const results = [];
      for (const phoneNumber of phoneNumbers) {
        try {
          
          const result = await db.query(query, [
            phoneNumber.job_id,
            phoneNumber.npa,
            phoneNumber.nxx,
            phoneNumber.thousands,
            phoneNumber.full_phone_number,
            phoneNumber.zip,
            phoneNumber.state_code || phoneNumber.state,
            phoneNumber.city,
            phoneNumber.county,
            phoneNumber.timezone_id || (typeof phoneNumber.timezone === 'number' ? phoneNumber.timezone : null)
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
          COUNT(DISTINCT zip) as total_zips,
          COUNT(DISTINCT state_code) as total_states
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
        DELETE FROM phone_numbers pn
        USING phone_number_jobs pnj
        WHERE pn.job_id = pnj.id AND pnj.run_id = $1
      `;
      
      const result = await db.query(query, [runId]);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting phone numbers by run ID:', error);
      throw error;
    }
  }

  // Check if phone numbers already exist for a zipcode
  static async checkExistingPhoneNumbersForZip(zip) {
    try {
      const query = `
        SELECT COUNT(*) as count, 
               COUNT(DISTINCT job_id) as job_count,
               MAX(created_at) as latest_generated
        FROM phone_numbers 
        WHERE zip = $1
      `;
      
      const result = await db.query(query, [zip]);
      const row = result.rows[0];
      
      return {
        exists: parseInt(row.count) > 0,
        count: parseInt(row.count),
        job_count: parseInt(row.job_count),
        latest_generated: row.latest_generated
      };
    } catch (error) {
      console.error('Error checking existing phone numbers for zip:', error);
      throw error;
    }
  }

    // Check if phone numbers exist for a specific zipcode and filter combination
  static async checkExistingPhoneNumbersForZipAndFilter(zip, filterId) {
    try {
      const query = `
        SELECT COUNT(*) as count, 
               MAX(created_at) as latest_generated
        FROM phone_numbers pn
        INNER JOIN phone_number_jobs pnj ON pn.job_id = pnj.id
        WHERE pn.zip = $1 AND pnj.job_type = $2
      `;
      
      const result = await db.query(query, [zip, filterId]);
      const row = result.rows[0];
      
      return {
        exists: parseInt(row.count) > 0,
        count: parseInt(row.count),
        latest_generated: row.latest_generated
      };
    } catch (error) {
      console.error('Error checking existing phone numbers for zip and filter:', error);
      throw error;
    }
  }

  // Check if a specific phone number already exists in the database
  static async checkExistingPhoneNumber(fullPhoneNumber) {
    try {
      const query = `
        SELECT COUNT(*) as count, 
               MAX(created_at) as latest_generated,
               MAX(job_id) as job_id,
               MAX(zip) as zip
        FROM phone_numbers 
        WHERE full_phone_number = $1
      `;
      
      const result = await db.query(query, [fullPhoneNumber]);
      const row = result.rows[0];
      
      return {
        exists: parseInt(row.count) > 0,
        count: parseInt(row.count),
        latest_generated: row.latest_generated,
        job_id: row.job_id,
        zip: row.zip
      };
    } catch (error) {
      console.error('Error checking existing phone number:', error);
      throw error;
    }
  }

  // Check for multiple existing phone numbers (batch check)
  static async checkExistingPhoneNumbers(phoneNumbers) {
    try {
      if (!phoneNumbers || phoneNumbers.length === 0) {
        return { existing: [], new: [] };
      }

      const fullPhoneNumbers = phoneNumbers.map(pn => pn.full_phone_number);
      const placeholders = fullPhoneNumbers.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        SELECT full_phone_number, 
               COUNT(*) as count,
               MAX(created_at) as latest_generated,
               MAX(job_id) as job_id,
               MAX(zip) as zip
        FROM phone_numbers 
        WHERE full_phone_number IN (${placeholders})
        GROUP BY full_phone_number
      `;
      
      const result = await db.query(query, fullPhoneNumbers);
      const existingNumbers = new Set(result.rows.map(row => row.full_phone_number));
      
      const existing = phoneNumbers.filter(pn => existingNumbers.has(pn.full_phone_number));
      const newNumbers = phoneNumbers.filter(pn => !existingNumbers.has(pn.full_phone_number));
      
      return {
        existing: existing,
        new: newNumbers,
        existingCount: existing.length,
        newCount: newNumbers.length
      };
    } catch (error) {
      console.error('Error checking existing phone numbers batch:', error);
      throw error;
    }
  }

  // Get all phone number jobs with optional filters
  static async getAllJobs(filters = {}) {
    try {
      let query = `
        SELECT * FROM phone_number_jobs 
        WHERE 1=1
      `;
      const values = [];
      let valueIndex = 1;

      if (filters.run_id) {
        query += ` AND run_id = $${valueIndex++}`;
        values.push(filters.run_id);
      }

      if (filters.job_type) {
        query += ` AND job_type = $${valueIndex++}`;
        values.push(filters.job_type);
      }

      if (filters.status) {
        query += ` AND status = $${valueIndex++}`;
        values.push(filters.status);
      }

      query += ` ORDER BY created_at DESC`;
      
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting all phone number jobs:', error);
      throw error;
    }
  }

  // Get phone numbers by filter ID
  static async getPhoneNumbersByFilter(filterId, page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT pn.* FROM phone_numbers pn
        INNER JOIN phone_number_jobs pnj ON pn.job_id = pnj.id
        WHERE pnj.job_type = $1 
        ORDER BY pn.created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) FROM phone_numbers pn
        INNER JOIN phone_number_jobs pnj ON pn.job_id = pnj.id
        WHERE pnj.job_type = $1
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, [filterId, limit, offset]),
        db.query(countQuery, [filterId])
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
      console.error('Error getting phone numbers by filter ID:', error);
      throw error;
    }
  }

  // Get filter dashboard with phone number counts
  static async getFilterDashboard() {
    try {
      const query = `
        SELECT 
          f.id as filter_id,
          f.name as filter_name,
          f.filter_type,
          f.is_active,
          f.created_at as filter_created_at,
          COUNT(pn.id) as phone_number_count,
          COUNT(DISTINCT pn.zip) as unique_zipcodes,
          COUNT(DISTINCT pn.job_id) as job_count,
          MAX(pn.created_at) as latest_generation
        FROM user_filters f
        LEFT JOIN phone_number_jobs pnj ON f.id::text = pnj.job_type
        LEFT JOIN phone_numbers pn ON pnj.id = pn.job_id
        WHERE f.filter_type = 'demographic'
        GROUP BY f.id, f.name, f.filter_type, f.is_active, f.created_at
        ORDER BY f.created_at DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting filter dashboard:', error);
      throw error;
    }
  }

  // Get phone numbers with filters
  static async getPhoneNumbersWithFilters(page = 1, limit = 50, search, sortBy = 'created_at', sortOrder = 'DESC', filters = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT pn.*, t.display_name as timezone_display_name
        FROM phone_numbers pn
        LEFT JOIN timezones t ON pn.timezone_id = t.id
        WHERE 1=1
      `;
      
      let countQuery = `
        SELECT COUNT(*) as count
        FROM phone_numbers pn
        LEFT JOIN timezones t ON pn.timezone_id = t.id
        WHERE 1=1
      `;
      
      const values = [];
      let valueIndex = 1;

      // Add search condition
      if (search) {
        const searchCondition = `(
          pn.full_phone_number ILIKE $${valueIndex} OR
          pn.npa ILIKE $${valueIndex} OR
          pn.nxx ILIKE $${valueIndex} OR
          pn.zip ILIKE $${valueIndex} OR
          pn.state_code ILIKE $${valueIndex}
        )`;
        query += ` AND ${searchCondition}`;
        countQuery += ` AND ${searchCondition}`;
        values.push(`%${search}%`);
        valueIndex++;
      }

      // Add filters
      if (filters.npa) {
        query += ` AND pn.npa = $${valueIndex}`;
        countQuery += ` AND pn.npa = $${valueIndex}`;
        values.push(filters.npa);
        valueIndex++;
      }

      if (filters.nxx) {
        query += ` AND pn.nxx = $${valueIndex}`;
        countQuery += ` AND pn.nxx = $${valueIndex}`;
        values.push(filters.nxx);
        valueIndex++;
      }

      if (filters.thousands) {
        query += ` AND pn.thousands = $${valueIndex}`;
        countQuery += ` AND pn.thousands = $${valueIndex}`;
        values.push(filters.thousands);
        valueIndex++;
      }

      if (filters.state_code) {
        query += ` AND pn.state_code = $${valueIndex}`;
        countQuery += ` AND pn.state_code = $${valueIndex}`;
        values.push(filters.state_code);
        valueIndex++;
      }

      if (filters.zip) {
        query += ` AND pn.zip = $${valueIndex}`;
        countQuery += ` AND pn.zip = $${valueIndex}`;
        values.push(filters.zip);
        valueIndex++;
      }

      if (filters.timezone_id) {
        query += ` AND pn.timezone_id = $${valueIndex}`;
        countQuery += ` AND pn.timezone_id = $${valueIndex}`;
        values.push(filters.timezone_id);
        valueIndex++;
      }

      // Add sorting
      const allowedSortFields = ['created_at', 'full_phone_number', 'npa', 'nxx', 'thousands', 'state_code', 'zip'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY pn.${sortField} ${sortDirection}`;
      query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
      values.push(limit, offset);

      const [result, countResult] = await Promise.all([
        db.query(query, values),
        db.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
      ]);

      return {
        phoneNumbers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page,
          limit,
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        },
        filters
      };
    } catch (error) {
      console.error('Error getting phone numbers with filters:', error);
      throw error;
    }
  }

  // Get unique values for a field
  static async getUniqueValues(field, limit = 1000) {
    try {
      const allowedFields = ['npa', 'nxx', 'thousands', 'state_code', 'zip', 'timezone_id'];
      
      if (!allowedFields.includes(field)) {
        throw new Error(`Invalid field: ${field}. Allowed fields: ${allowedFields.join(', ')}`);
      }

      let query;
      if (field === 'timezone_id') {
        query = `
          SELECT DISTINCT pn.timezone_id, t.display_name as timezone_display_name
          FROM phone_numbers pn
          LEFT JOIN timezones t ON pn.timezone_id = t.id
          WHERE pn.timezone_id IS NOT NULL
          ORDER BY t.display_name
          LIMIT $1
        `;
      } else {
        query = `
          SELECT DISTINCT ${field}
          FROM phone_numbers
          WHERE ${field} IS NOT NULL AND ${field} != ''
          ORDER BY ${field}
          LIMIT $1
        `;
      }

      const result = await db.query(query, [limit]);
      
      if (field === 'timezone_id') {
        return result.rows.map(row => ({
          value: row.timezone_id,
          label: row.timezone_display_name || `Timezone ${row.timezone_id}`
        }));
      } else {
        return result.rows.map(row => row[field]);
      }
    } catch (error) {
      console.error('Error getting unique values:', error);
      throw error;
    }
  }
}

module.exports = PhoneNumber;
