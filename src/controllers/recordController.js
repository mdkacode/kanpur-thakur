const Record = require('../models/Record');

class RecordController {
  async getAllRecords(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        sortBy = 'created_at', 
        sortOrder = 'DESC',
        npa,
        nxx,
        zip,
        state_code,
        city,
        rc,
        timezone_id,
        date_from,
        date_to
      } = req.query;
      
      // Build filters object
      const filters = {};
      if (npa) filters.npa = npa;
      if (nxx) filters.nxx = nxx;
      if (zip) {
        // Handle comma-separated values for array-based filtering
        filters.zip = zip.includes(',') ? zip.split(',').map(s => s.trim()) : zip;
      }
      if (state_code) {
        // Handle comma-separated values for array-based filtering
        filters.state_code = state_code.includes(',') ? state_code.split(',').map(s => s.trim()) : state_code;
      }
      if (city) {
        // Handle comma-separated values for array-based filtering
        filters.city = city.includes(',') ? city.split(',').map(s => s.trim()) : city;
      }
      if (rc) filters.rc = rc;
      if (timezone_id) {
        // Handle comma-separated values for array-based filtering
        filters.timezone_id = timezone_id.includes(',') ? timezone_id.split(',').map(s => s.trim()) : timezone_id;
      }
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      
      console.log('📊 Backend received filters:', { filters, query: req.query });
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search,
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        filters
      };

      const result = await Record.findAll(options);

      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination,
        filters
      });

    } catch (error) {
      console.error('Get all records error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching records',
        error: error.message
      });
    }
  }

  async getRecordById(req, res) {
    try {
      const { id } = req.params;
      const record = await Record.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Get record by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching record',
        error: error.message
      });
    }
  }

  async searchRecords(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search: q
      };

      const result = await Record.findAll(options);

      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination,
        searchQuery: q
      });

    } catch (error) {
      console.error('Search records error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching records',
        error: error.message
      });
    }
  }

  async getRecordsByNpaNxx(req, res) {
    try {
      const { npa, nxx } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!npa || !nxx) {
        return res.status(400).json({
          success: false,
          message: 'NPA and NXX are required'
        });
      }

      const records = await Record.findByNpaNxx(npa, nxx);
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 50;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedRecords = records.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: records.length,
          totalPages: Math.ceil(records.length / limitNum)
        },
        filters: { npa, nxx }
      });

    } catch (error) {
      console.error('Get records by NPA/NXX error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching records by NPA/NXX',
        error: error.message
      });
    }
  }

  async getRecordsByZip(req, res) {
    try {
      const { zip } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!zip) {
        return res.status(400).json({
          success: false,
          message: 'ZIP code is required'
        });
      }

      const records = await Record.findByZip(zip);
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 50;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedRecords = records.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: records.length,
          totalPages: Math.ceil(records.length / limitNum)
        },
        filters: { zip }
      });

    } catch (error) {
      console.error('Get records by ZIP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching records by ZIP',
        error: error.message
      });
    }
  }

  async getRecordsByState(req, res) {
    try {
      const { state } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!state) {
        return res.status(400).json({
          success: false,
          message: 'State is required'
        });
      }

      const records = await Record.findByState(state);
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedRecords = records.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: records.length,
          totalPages: Math.ceil(records.length / parseInt(limit))
        },
        filters: { state }
      });

    } catch (error) {
      console.error('Get records by state error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching records by state',
        error: error.message
      });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await Record.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching stats',
        error: error.message
      });
    }
  }

  async deleteRecord(req, res) {
    try {
      const { id } = req.params;
      const record = await Record.deleteById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      res.json({
        success: true,
        message: 'Record deleted successfully',
        data: record
      });

    } catch (error) {
      console.error('Delete record error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting record',
        error: error.message
      });
    }
  }

  async deleteAllRecords(req, res) {
    try {
      await Record.deleteAll();

      res.json({
        success: true,
        message: 'All records deleted successfully'
      });

    } catch (error) {
      console.error('Delete all records error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting all records',
        error: error.message
      });
    }
  }

  async getUniqueValues(req, res) {
    try {
      const { field } = req.params;
      const { search = '', limit = 10 } = req.query;
      
      console.log('🔍 getUniqueValues called with:', { field, search, limit });
      
      if (!field) {
        return res.status(400).json({
          success: false,
          message: 'Field parameter is required'
        });
      }

      const values = await Record.getUniqueValues(field, search, parseInt(limit));
      
      res.json({
        success: true,
        data: values
      });

    } catch (error) {
      console.error('❌ Error in getUniqueValues:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving unique values'
      });
    }
  }
}

module.exports = new RecordController();
