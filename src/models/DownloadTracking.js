const db = require('../config/database');

class DownloadTracking {
  static async create(filterData) {
    const {
      filterName,
      filterCriteria,
      totalRecords,
      fileSize
    } = filterData;

    const query = `
      INSERT INTO download_tracking (filter_name, filter_criteria, total_records, file_size)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [filterName, JSON.stringify(filterCriteria), totalRecords, fileSize];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByFilterCriteria(filterCriteria) {
    const query = `
      SELECT * FROM download_tracking 
      WHERE filter_criteria = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [JSON.stringify(filterCriteria)]);
    return result.rows[0];
  }

  static async incrementDownloadCount(id) {
    const query = `
      UPDATE download_tracking 
      SET download_count = download_count + 1,
          last_downloaded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getAllDownloads(options = {}) {
    const { page = 1, limit = 20, sortBy = 'last_downloaded_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT * FROM download_tracking
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = 'SELECT COUNT(*) FROM download_tracking';
    
    const [downloadsResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);

    return {
      downloads: downloadsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  static async getDownloadStats() {
    const query = `
      SELECT 
        COUNT(*) as total_downloads,
        SUM(download_count) as total_download_count,
        SUM(total_records) as total_records_downloaded,
        AVG(download_count) as avg_downloads_per_filter,
        MAX(last_downloaded_at) as last_download
      FROM download_tracking
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }

  static async getMostDownloadedFilters(limit = 10) {
    const query = `
      SELECT 
        filter_name,
        filter_criteria,
        download_count,
        total_records,
        last_downloaded_at
      FROM download_tracking
      ORDER BY download_count DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  static async deleteById(id) {
    const query = 'DELETE FROM download_tracking WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = DownloadTracking;
