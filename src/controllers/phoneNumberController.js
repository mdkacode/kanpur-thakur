const PhoneNumberGenerator = require('../services/phoneNumberGenerator');
const PhoneNumber = require('../models/PhoneNumber');
const Telecare = require('../models/Telecare');

class PhoneNumberController {
  // Generate phone numbers from telecare output
  static async generateFromTelecareOutput(req, res) {
    try {
      const { run_id } = req.params;
      const { zip } = req.body;

      if (!run_id || !zip) {
        return res.status(400).json({
          success: false,
          message: 'Run ID and zipcode are required'
        });
      }

      console.log(`🔢 API: Starting phone number generation for run ${run_id}, zip ${zip}`);

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
      
      // Generate phone numbers asynchronously
      generator.generatePhoneNumbersFromTelecareOutput(run_id, zip)
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

  // Generate phone numbers directly from CSV data
  static async generateFromCSV(req, res) {
    try {
      const { csvData, zip, filterId } = req.body;

      if (!csvData || !zip) {
        return res.status(400).json({
          success: false,
          message: 'CSV data and zipcode are required'
        });
      }

      console.log(`🔢 API: Starting phone number generation from CSV for zip ${zip}`);

      // Start phone number generation in background
      const generator = new PhoneNumberGenerator();
      
      // Generate phone numbers asynchronously from CSV
      generator.generatePhoneNumbersFromCSV(csvData, zip, filterId)
        .then((result) => {
          console.log(`✅ Phone number generation completed for zip ${zip}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Phone number generation failed for zip ${zip}:`, error);
        });

      // Return immediate response
      res.json({
        success: true,
        message: 'Phone number generation started from CSV',
        zip,
        filter_id: filterId,
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

  // Get phone numbers for a zipcode
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

  // Get phone number jobs for a run
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
      console.error('Error getting phone number jobs for run:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone number jobs for run',
        error: error.message
      });
    }
  }

  // Get phone number jobs for a zipcode
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
      console.error('Error getting phone number jobs for zip:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting phone number jobs for zip',
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

  // Export phone numbers to CSV
  static async exportToCSV(req, res) {
    try {
      const { job_id } = req.params;
      const { page = 1, limit = 1000 } = req.query;

      if (!job_id) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const generator = new PhoneNumberGenerator();
      const result = await generator.getPhoneNumbersForJob(job_id, parseInt(page), parseInt(limit));

      if (!result.phoneNumbers || result.phoneNumbers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No phone numbers found for this job'
        });
      }

      // Generate CSV content
      const csvContent = generator.formatPhoneNumbersForCSV(result.phoneNumbers);

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="phone_numbers_${job_id}.csv"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

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
        deleted_count: deletedCount
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
        deleted_count: deletedCount
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
}

module.exports = PhoneNumberController;
