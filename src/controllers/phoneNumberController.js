const PhoneNumberGenerator = require('../services/phoneNumberGenerator');
const PhoneNumber = require('../models/PhoneNumber');
const Telecare = require('../models/Telecare');

class PhoneNumberController {
  // Generate phone numbers from telecare output
  static async generateFromTelecareOutput(req, res) {
    try {
      const { run_id } = req.params;
      const { zip, filter_id } = req.body;

      if (!run_id || !zip) {
        return res.status(400).json({
          success: false,
          message: 'Run ID and zipcode are required'
        });
      }

      console.log(`🔢 API: Starting phone number generation for run ${run_id}, zip ${zip}, filter ${filter_id || 'none'}`);

      // Verify the telecare run exists
      const telecareRun = await Telecare.getRunById(run_id);
      if (!telecareRun) {
        return res.status(404).json({
          success: false,
          message: 'Telecare run not found'
        });
      }

      // Start phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously with filter_id
      generator.generatePhoneNumbersFromTelecareOutput(run_id, zip, filter_id || null)
        .then((result) => {
          console.log(`✅ Phone number generation completed for run ${run_id}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Phone number generation failed for run ${run_id}:`, error);
        });

      // Return immediate response with job info
      res.json({
        success: true,
        message: 'Phone number generation started',
        run_id,
        zip,
        filter_id: filter_id || null,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error starting phone number generation:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting phone number generation',
        error: error.message
      });
    }
  }

  // Generate phone numbers for a specific filter
  static async generateForFilter(req, res) {
    try {
      const { filter_id } = req.params;
      const { zip } = req.body;

      if (!filter_id || !zip) {
        return res.status(400).json({
          success: false,
          message: 'Filter ID and zipcode are required'
        });
      }

      console.log(`🔢 API: Starting phone number generation for filter ${filter_id}, zip ${zip}`);

      // Start phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously
      generator.generatePhoneNumbersForFilter(filter_id, zip)
        .then((result) => {
          console.log(`✅ Phone number generation completed for filter ${filter_id}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Phone number generation failed for filter ${filter_id}:`, error);
        });

      // Return immediate response
      res.json({
        success: true,
        message: 'Phone number generation started for filter',
        filter_id,
        zip,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error starting phone number generation for filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting phone number generation for filter',
        error: error.message
      });
    }
  }

  // Generate phone numbers for all zipcodes in a filter (BATCH GENERATION)
  static async generateForFilterBatch(req, res) {
    try {
      const { filter_id } = req.params;

      if (!filter_id) {
        return res.status(400).json({
          success: false,
          message: 'Filter ID is required'
        });
      }

      console.log(`🔢 API: Starting batch phone number generation for filter ${filter_id}`);

      // Get the filter and its zipcodes
      const Filter = require('../models/Filter');
      const DemographicRecord = require('../models/DemographicRecord');

      const filterResult = await Filter.getFilterById(filter_id);
      if (!filterResult.success) {
        return res.status(404).json({
          success: false,
          message: filterResult.error || 'Filter not found'
        });
      }

      const filter = filterResult.data;

      // Apply the filter to get zipcodes
      const filterConfig = filter.filter_config;
      console.log(`📋 Applying filter config:`, filterConfig);

      // Process filters
      const filters = {};
      const advancedFilters = {};

      // Process basic filters
      if (filterConfig.state) {
        filters.state = Array.isArray(filterConfig.state) 
          ? filterConfig.state 
          : filterConfig.state.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.zipcode) {
        filters.zipcode = Array.isArray(filterConfig.zipcode) 
          ? filterConfig.zipcode 
          : filterConfig.zipcode.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.county) {
        filters.county = Array.isArray(filterConfig.county) 
          ? filterConfig.county 
          : filterConfig.county.split(',').map(s => s.trim()).filter(s => s);
      }
      if (filterConfig.city) {
        filters.city = Array.isArray(filterConfig.city) 
          ? filterConfig.city 
          : filterConfig.city.split(',').map(s => s.trim()).filter(s => s);
      }

      // Process advanced filters (numeric ranges)
      const numericFields = [
        'mhhi_min', 'mhhi_max', 'avg_hhi_min', 'avg_hhi_max', 'pc_income_min', 'pc_income_max',
        'pct_hh_w_income_200k_plus_min', 'pct_hh_w_income_200k_plus_max', 'median_age_min', 'median_age_max',
        'pop_dens_sq_mi_min', 'pop_dens_sq_mi_max', 'race_ethnicity_white_min', 'race_ethnicity_white_max',
        'race_ethnicity_black_min', 'race_ethnicity_black_max', 'race_ethnicity_hispanic_min', 'race_ethnicity_hispanic_max',
        'households_min', 'households_max', 'family_hh_total_min', 'family_hh_total_max',
        'edu_att_bachelors_min', 'edu_att_bachelors_max', 'unemployment_pct_min', 'unemployment_pct_max',
        'housing_units_min', 'housing_units_max', 'owner_occupied_min', 'owner_occupied_max'
      ];

      numericFields.forEach(field => {
        if (filterConfig[field] && filterConfig[field].toString().trim() !== '') {
          advancedFilters[field] = filterConfig[field].toString().trim();
        }
      });

      // Apply the filter to get matching zipcodes
      const result = await DemographicRecord.findAll({
        page: 1,
        limit: 100000, // Large limit to get all zipcodes
        filters,
        advancedFilters
      });

      const zipcodes = result.filteredZipcodes || [];
      console.log(`📍 Found ${zipcodes.length} zipcodes for filter ${filter_id}`);

      if (zipcodes.length === 0) {
        return res.json({
          success: false,
          message: 'No zipcodes found for this filter',
          filter_id,
          zipcodes: []
        });
      }

      // Start batch phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously for all zipcodes
      generator.generatePhoneNumbersForFilterBatch(filter_id, zipcodes)
        .then((result) => {
          console.log(`✅ Batch phone number generation completed for filter ${filter_id}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Batch phone number generation failed for filter ${filter_id}:`, error);
        });

      // Return immediate response
      res.json({
        success: true,
        message: 'Batch phone number generation started for filter',
        filter_id,
        total_zipcodes: zipcodes.length,
        zipcodes: zipcodes.slice(0, 10), // Return first 10 zipcodes as preview
        status: 'processing'
      });

    } catch (error) {
      console.error('Error starting batch phone number generation for filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting batch phone number generation for filter',
        error: error.message
      });
    }
  }

  // Generate phone numbers from existing NPA NXX records (NO TELECARE REQUIRED)
  static async generateFromNpaNxxRecords(req, res) {
    try {
      const { zip, filter_id } = req.body;

      if (!zip) {
        return res.status(400).json({
          success: false,
          message: 'Zipcode is required'
        });
      }

      console.log(`🔢 API: Starting phone number generation from NPA NXX records for zip ${zip}, filter ${filter_id || 'none'}`);

      // Start phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously from NPA NXX records
      generator.generatePhoneNumbersFromNpaNxxRecords(zip, filter_id || null)
        .then((result) => {
          console.log(`✅ Phone number generation from NPA NXX records completed for zip ${zip}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Phone number generation from NPA NXX records failed for zip ${zip}:`, error);
        });

      // Return immediate response
      res.json({
        success: true,
        message: 'Phone number generation from NPA NXX records started',
        zip,
        filter_id: filter_id || null,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error starting phone number generation from NPA NXX records:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting phone number generation from NPA NXX records',
        error: error.message
      });
    }
  }

  // Generate phone numbers directly from CSV data
  static async generateFromCSV(req, res) {
    try {
      const { csvData, zip, filter_id } = req.body;

      if (!csvData || !zip) {
        return res.status(400).json({
          success: false,
          message: 'CSV data and zipcode are required'
        });
      }

      console.log(`🔢 API: Starting phone number generation from CSV for zip ${zip}, filter ${filter_id || 'none'}`);

      // Start phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously with filter_id
      generator.generatePhoneNumbersFromCSV(csvData, zip, filter_id || null)
        .then((result) => {
          console.log(`✅ Phone number generation from CSV completed for zip ${zip}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Phone number generation from CSV failed for zip ${zip}:`, error);
        });

      // Return immediate response with job info
      res.json({
        success: true,
        message: 'Phone number generation from CSV started',
        zip,
        filter_id: filter_id || null,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error starting phone number generation from CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting phone number generation from CSV',
        error: error.message
      });
    }
  }

  // Get phone number generation status
  static async getGenerationStatus(req, res) {
    try {
      const { job_id } = req.params;

      if (!job_id) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const generator = new PhoneNumberGenerator();
      const status = await generator.getGenerationStatus(job_id);

      res.json(status);

    } catch (error) {
      console.error('Error getting phone number generation status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone number generation status',
        error: error.message
      });
    }
  }

  // Get phone numbers for a job
  static async getPhoneNumbersForJob(req, res) {
    try {
      const { job_id } = req.params;
      const { page = 1, limit = 100 } = req.query;

      if (!job_id) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const generator = new PhoneNumberGenerator();
      const result = await generator.getPhoneNumbersForJob(job_id, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result.phoneNumbers,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting phone numbers for job:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone numbers for job',
        error: error.message
      });
    }
  }

  // Get all phone number jobs
  static async getAllJobs(req, res) {
    try {
      const { zip, run_id, filter_id, status } = req.query;

      const jobs = await PhoneNumber.getAllJobs({ zip, run_id, filter_id, status });

      res.json({
        success: true,
        data: jobs
      });

    } catch (error) {
      console.error('Error getting phone number jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone number jobs',
        error: error.message
      });
    }
  }

  // Check existing phone numbers for zipcode
  static async checkExistingForZip(req, res) {
    try {
      const { zip } = req.params;
      const { filter_id } = req.query;

      if (!zip) {
        return res.status(400).json({
          success: false,
          message: 'Zipcode is required'
        });
      }

      let existing;
      if (filter_id) {
        existing = await PhoneNumber.checkExistingPhoneNumbersForZipAndFilter(zip, filter_id);
      } else {
        existing = await PhoneNumber.checkExistingPhoneNumbersForZip(zip);
      }

      res.json({
        success: true,
        data: existing
      });

    } catch (error) {
      console.error('Error checking existing phone numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking existing phone numbers',
        error: error.message
      });
    }
  }

  // Get jobs for a specific run
  static async getJobsForRun(req, res) {
    try {
      const { run_id } = req.params;

      if (!run_id) {
        return res.status(400).json({
          success: false,
          message: 'Run ID is required'
        });
      }

      const jobs = await PhoneNumber.getJobsByRunId(run_id);

      res.json({
        success: true,
        data: jobs
      });

    } catch (error) {
      console.error('Error getting jobs for run:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting jobs for run',
        error: error.message
      });
    }
  }

  // Get jobs for a specific zip
  static async getJobsForZip(req, res) {
    try {
      const { zip } = req.params;

      if (!zip) {
        return res.status(400).json({
          success: false,
          message: 'Zipcode is required'
        });
      }

      const jobs = await PhoneNumber.getJobsByZip(zip);

      res.json({
        success: true,
        data: jobs
      });

    } catch (error) {
      console.error('Error getting jobs for zip:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting jobs for zip',
        error: error.message
      });
    }
  }

  // Get phone numbers for a run
  static async getPhoneNumbersForRun(req, res) {
    try {
      const { run_id } = req.params;
      const { page = 1, limit = 100 } = req.query;

      if (!run_id) {
        return res.status(400).json({
          success: false,
          message: 'Run ID is required'
        });
      }

      const result = await PhoneNumber.getPhoneNumbersByRunId(run_id, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result.phoneNumbers,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting phone numbers for run:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone numbers for run',
        error: error.message
      });
    }
  }

  // Get phone numbers for a zip
  static async getPhoneNumbersForZip(req, res) {
    try {
      const { zip } = req.params;
      const { page = 1, limit = 100 } = req.query;

      if (!zip) {
        return res.status(400).json({
          success: false,
          message: 'Zipcode is required'
        });
      }

      const result = await PhoneNumber.getPhoneNumbersByZip(zip, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result.phoneNumbers,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting phone numbers for zip:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone numbers for zip',
        error: error.message
      });
    }
  }

  // Export phone numbers to CSV
  static async exportToCSV(req, res) {
    try {
      const { job_id } = req.params;

      if (!job_id) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const generator = new PhoneNumberGenerator();
      const result = await generator.getPhoneNumbersForJob(job_id, 1, 100000); // Get all numbers
      
      if (!result.phoneNumbers || result.phoneNumbers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No phone numbers found for this job'
        });
      }

      const csvContent = generator.formatPhoneNumbersForCSV(result.phoneNumbers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="phone_numbers_${job_id}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Error exporting phone numbers to CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting phone numbers to CSV',
        error: error.message
      });
    }
  }

  // Get phone number statistics
  static async getStats(req, res) {
    try {
      const stats = await PhoneNumber.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting phone number stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone number stats',
        error: error.message
      });
    }
  }

  // Delete phone numbers for a job
  static async deletePhoneNumbersForJob(req, res) {
    try {
      const { job_id } = req.params;

      if (!job_id) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const deletedCount = await PhoneNumber.deletePhoneNumbersByJobId(job_id);

      res.json({
        success: true,
        message: `Deleted ${deletedCount} phone numbers`,
        deletedCount
      });

    } catch (error) {
      console.error('Error deleting phone numbers for job:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting phone numbers for job',
        error: error.message
      });
    }
  }

  // Delete phone numbers for a run
  static async deletePhoneNumbersForRun(req, res) {
    try {
      const { run_id } = req.params;

      if (!run_id) {
        return res.status(400).json({
          success: false,
          message: 'Run ID is required'
        });
      }

      const deletedCount = await PhoneNumber.deletePhoneNumbersByRunId(run_id);

      res.json({
        success: true,
        message: `Deleted ${deletedCount} phone numbers`,
        deletedCount
      });

    } catch (error) {
      console.error('Error deleting phone numbers for run:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting phone numbers for run',
        error: error.message
      });
    }
  }

  // Get phone numbers for a filter
  static async getPhoneNumbersForFilter(req, res) {
    try {
      const { filter_id } = req.params;
      const { page = 1, limit = 100 } = req.query;

      if (!filter_id) {
        return res.status(400).json({
          success: false,
          message: 'Filter ID is required'
        });
      }

      const result = await PhoneNumber.getPhoneNumbersByFilter(filter_id, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result.phoneNumbers,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting phone numbers for filter:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone numbers for filter',
        error: error.message
      });
    }
  }

  // Export phone numbers for a filter to CSV
  static async exportFilterToCSV(req, res) {
    try {
      const { filter_id } = req.params;

      if (!filter_id) {
        return res.status(400).json({
          success: false,
          message: 'Filter ID is required'
        });
      }

      const result = await PhoneNumber.getPhoneNumbersByFilter(filter_id, 1, 1000000); // Get all numbers
      
      if (!result.phoneNumbers || result.phoneNumbers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No phone numbers found for this filter'
        });
      }

      const generator = new PhoneNumberGenerator();
      const csvContent = generator.formatPhoneNumbersForCSV(result.phoneNumbers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="phone_numbers_filter_${filter_id}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Error exporting phone numbers for filter to CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting phone numbers for filter to CSV',
        error: error.message
      });
    }
  }

  // Dashboard: Get filter summary with phone number counts
  static async getFilterDashboard(req, res) {
    try {
      const dashboardData = await PhoneNumber.getFilterDashboard();

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Error getting filter dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting filter dashboard',
        error: error.message
      });
    }
  }
}

module.exports = PhoneNumberController;