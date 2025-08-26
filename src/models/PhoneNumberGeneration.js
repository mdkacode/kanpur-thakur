const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class PhoneNumberGeneration {
  static async create(generationData) {
    const {
      generation_name,
      user_id = 'anonymous',
      user_name,
      filter_criteria,
      source_zipcodes,
      source_timezone_ids,
      total_records,
      file_size,
      csv_filename,
      csv_path,
      status = 'generated'
    } = generationData;

    const query = `
      INSERT INTO phone_number_generations (
        generation_name, user_id, user_name, filter_criteria, 
        source_zipcodes, source_timezone_ids, total_records, 
        file_size, csv_filename, csv_path, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      generation_name,
      user_id,
      user_name,
      JSON.stringify(filter_criteria),
      source_zipcodes,
      source_timezone_ids,
      total_records,
      file_size,
      csv_filename,
      csv_path,
      status
    ];

    const result = await db.query(query, values);
    return result.rows[0];
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

    let query = `
      SELECT 
        png.*,
        COUNT(pnd.id) as download_count_actual
      FROM phone_number_generations png
      LEFT JOIN phone_number_downloads pnd ON png.id = pnd.generation_id
    `;

    let countQuery = `
      SELECT COUNT(DISTINCT png.id) as count
      FROM phone_number_generations png
      LEFT JOIN phone_number_downloads pnd ON png.id = pnd.generation_id
    `;

    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(
        png.generation_name ILIKE $${valueIndex} OR 
        png.user_name ILIKE $${valueIndex} OR
        png.user_id ILIKE $${valueIndex} OR
        png.csv_filename ILIKE $${valueIndex}
      )`);
      values.push(`%${search}%`);
      valueIndex++;
    }

    // Add filters
    if (filters.user_id) {
      whereConditions.push(`png.user_id = $${valueIndex}`);
      values.push(filters.user_id);
      valueIndex++;
    }

    if (filters.status) {
      whereConditions.push(`png.status = $${valueIndex}`);
      values.push(filters.status);
      valueIndex++;
    }

    if (filters.date_from) {
      whereConditions.push(`png.created_at >= $${valueIndex}`);
      values.push(filters.date_from);
      valueIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`png.created_at <= $${valueIndex}`);
      values.push(filters.date_to);
      valueIndex++;
    }

    if (filters.timezone_ids && Array.isArray(filters.timezone_ids)) {
      whereConditions.push(`png.source_timezone_ids && $${valueIndex}`);
      values.push(filters.timezone_ids);
      valueIndex++;
    }

    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` GROUP BY png.id`;
    query += ` ORDER BY png.${sortBy} ${sortOrder}`;
    query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(limitNum, offset);

    console.log('🔍 Phone Generation SQL Query:', { query, values });

    const [recordsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2))
    ]);

    return {
      records: recordsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].count) || 0,
        totalPages: Math.ceil((parseInt(countResult.rows[0].count) || 0) / limitNum)
      }
    };
  }

  static async findById(id) {
    const query = `
      SELECT 
        png.*,
        COUNT(pnd.id) as download_count_actual
      FROM phone_number_generations png
      LEFT JOIN phone_number_downloads pnd ON png.id = pnd.generation_id
      WHERE png.id = $1
      GROUP BY png.id
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async recordDownload(generationId, downloadData) {
    const {
      user_id = 'anonymous',
      user_name,
      download_type = 'csv',
      ip_address,
      user_agent
    } = downloadData;

    // Insert download record
    const insertQuery = `
      INSERT INTO phone_number_downloads (
        generation_id, user_id, user_name, download_type, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const insertValues = [generationId, user_id, user_name, download_type, ip_address, user_agent];
    const downloadResult = await db.query(insertQuery, insertValues);

    // Update generation record
    const updateQuery = `
      UPDATE phone_number_generations 
      SET 
        download_count = download_count + 1,
        last_downloaded_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [generationId]);

    return {
      download: downloadResult.rows[0],
      generation: updateResult.rows[0]
    };
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_generations,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(total_records) as total_phone_numbers,
        SUM(download_count) as total_downloads,
        AVG(total_records) as avg_records_per_generation,
        MAX(created_at) as last_generation
      FROM phone_number_generations
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  static async getDownloadHistory(generationId) {
    const query = `
      SELECT 
        pnd.*,
        png.generation_name
      FROM phone_number_downloads pnd
      JOIN phone_number_generations png ON pnd.generation_id = png.id
      WHERE pnd.generation_id = $1
      ORDER BY pnd.downloaded_at DESC
    `;
    const result = await db.query(query, [generationId]);
    return result.rows;
  }

  static async deleteById(id) {
    // Get file path before deletion
    const fileQuery = 'SELECT csv_path FROM phone_number_generations WHERE id = $1';
    const fileResult = await db.query(fileQuery, [id]);
    
    // Delete the record (cascades to downloads)
    const query = 'DELETE FROM phone_number_generations WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    // Delete physical file if it exists
    if (fileResult.rows[0]?.csv_path) {
      try {
        await fs.unlink(fileResult.rows[0].csv_path);
        console.log(`✅ Deleted file: ${fileResult.rows[0].csv_path}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete file: ${fileResult.rows[0].csv_path}`, error.message);
      }
    }
    
    return result.rows[0];
  }

  static async getUniqueValues(field, search = '', limit = 10) {
    const validFields = ['generation_name', 'user_id', 'user_name', 'status'];
    if (!validFields.includes(field)) {
      throw new Error(`Field ${field} is not allowed for unique values`);
    }

    let query;
    let params = [];

    if (search && search.trim()) {
      query = `
        SELECT DISTINCT ${field} 
        FROM phone_number_generations 
        WHERE ${field} IS NOT NULL 
        AND ${field} != '' 
        AND ${field} ILIKE $1
        ORDER BY ${field}
        LIMIT $2
      `;
      params = [`%${search.trim()}%`, limit];
    } else {
      query = `
        SELECT DISTINCT ${field} 
        FROM phone_number_generations 
        WHERE ${field} IS NOT NULL 
        AND ${field} != '' 
        ORDER BY ${field}
        LIMIT $1
      `;
      params = [limit];
    }

    const result = await db.query(query, params);
    return result.rows.map(row => row[field]).filter(value => value !== null && value !== '');
  }
}

module.exports = PhoneNumberGeneration;
