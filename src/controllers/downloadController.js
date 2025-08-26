const Record = require('../models/Record');
const DownloadTracking = require('../models/DownloadTracking');
const { stringify } = require('csv-stringify/sync');

const downloadController = {
  // Export filtered data to CSV
  exportToCSV: async (req, res) => {
    try {
      const {
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        filters = {},
        filterName = 'Custom Filter'
      } = req.body;

      console.log('📊 Exporting data to CSV with filters:', { search, filters, filterName });

      // Get data for CSV export
      const records = await Record.exportToCSV({
        search,
        sortBy,
        sortOrder,
        filters
      });

      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No records found for the specified filters'
        });
      }

      // Convert to CSV
      const csv = stringify(records, {
        header: true,
        columns: {
          npa: 'NPA',
          nxx: 'NXX',
          zip: 'ZIP',
          state_code: 'State',
          city: 'City',
          rc: 'RC',
          timezone_display_name: 'Timezone',
          abbreviation_standard: 'Timezone Abbr',
          created_at: 'Created At'
        }
      });

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `records_export_${timestamp}.csv`;

      // Track download
      const filterCriteria = { search, sortBy, sortOrder, filters };
      const existingDownload = await DownloadTracking.findByFilterCriteria(filterCriteria);

      if (existingDownload) {
        // Increment existing download count
        await DownloadTracking.incrementDownloadCount(existingDownload.id);
        console.log(`📈 Incremented download count for filter: ${existingDownload.filter_name}`);
      } else {
        // Create new download tracking entry
        const fileSize = Buffer.byteLength(csv, 'utf8');
        await DownloadTracking.create({
          filterName,
          filterCriteria,
          totalRecords: records.length,
          fileSize
        });
        console.log(`📝 Created new download tracking for filter: ${filterName}`);
      }

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));

      res.json({
        success: true,
        message: 'CSV export successful',
        data: {
          filename,
          recordCount: records.length,
          fileSize: Buffer.byteLength(csv, 'utf8'),
          csv
        }
      });

    } catch (error) {
      console.error('❌ CSV export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting CSV',
        error: error.message
      });
    }
  },

  // Get download tracking statistics
  getDownloadStats: async (req, res) => {
    try {
      const stats = await DownloadTracking.getDownloadStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Get download stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching download statistics',
        error: error.message
      });
    }
  },

  // Get all download history
  getAllDownloads: async (req, res) => {
    try {
      const { page = 1, limit = 20, sortBy = 'last_downloaded_at', sortOrder = 'DESC' } = req.query;
      
      const result = await DownloadTracking.getAllDownloads({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: result.downloads,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('❌ Get all downloads error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching download history',
        error: error.message
      });
    }
  },

  // Get most downloaded filters
  getMostDownloadedFilters: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const filters = await DownloadTracking.getMostDownloadedFilters(parseInt(limit));
      
      res.json({
        success: true,
        data: filters
      });
    } catch (error) {
      console.error('❌ Get most downloaded filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching most downloaded filters',
        error: error.message
      });
    }
  },

  // Delete download tracking entry
  deleteDownload: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await DownloadTracking.deleteById(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Download tracking entry not found'
        });
      }

      res.json({
        success: true,
        message: 'Download tracking entry deleted successfully',
        data: deleted
      });
    } catch (error) {
      console.error('❌ Delete download error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting download tracking entry',
        error: error.message
      });
    }
  }
};

module.exports = downloadController;
