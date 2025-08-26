const PhoneNumberGeneration = require('../models/PhoneNumberGeneration');
const Record = require('../models/Record');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-writer');

class PhoneNumberGenerationController {
  // Generate phone numbers and create a CSV file
  static async generatePhoneNumbers(req, res) {
    try {
      const {
        generation_name,
        filter_criteria,
        user_name = 'Anonymous User'
      } = req.body;

      const user_id = req.user?.id || 'anonymous';

      if (!generation_name || !filter_criteria) {
        return res.status(400).json({
          success: false,
          message: 'Generation name and filter criteria are required'
        });
      }

      console.log('🔍 Generating phone numbers with criteria:', filter_criteria);

      // Get records based on filter criteria
      const recordOptions = {
        page: 1,
        limit: 10000, // Large limit to get all matching records
        filters: filter_criteria
      };

      const recordResult = await Record.findAll(recordOptions);
      const records = recordResult.records;

      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No records found matching the filter criteria'
        });
      }

      // Extract source data
      const source_zipcodes = [...new Set(records.map(r => r.zip))];
      const source_timezone_ids = [...new Set(records.map(r => r.timezone_id).filter(Boolean))];

      // Validate and generate phone numbers for each record
      const phoneNumbers = [];
      let validRecords = 0;
      let invalidRecords = 0;
      let duplicateRecords = 0;

      for (const record of records) {
        // Validate required fields (NPA, NXX, STATE)
        if (!record.npa || !record.nxx || !record.state_code) {
          console.warn(`⚠️ Skipping record with missing required fields:`, record);
          invalidRecords++;
          continue;
        }

        // Validate NPA and NXX format (3 digits each)
        const npaValid = /^\d{3}$/.test(record.npa);
        const nxxValid = /^\d{3}$/.test(record.nxx);
        
        if (!npaValid || !nxxValid) {
          console.warn(`⚠️ Skipping record with invalid NPA/NXX format: NPA=${record.npa} (valid: ${npaValid}), NXX=${record.nxx} (valid: ${nxxValid})`, record);
          invalidRecords++;
          continue;
        }

        // Generate a phone number for this valid record
        const generatedPhoneNumber = {
          npa: record.npa,
          nxx: record.nxx,
          line_number: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          full_number: `${record.npa}-${record.nxx}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          zip: record.zip,
          city: record.city,
          state_code: record.state_code,
          rate_center: record.rc,
          timezone_display_name: record.timezone_display_name,
          timezone_abbreviation: record.abbreviation_standard,
          timezone_id: record.timezone_id,
          created_at: new Date().toISOString()
        };

        // Check if this phone number already exists
        const PhoneNumber = require('../models/PhoneNumber');
        const existingCheck = await PhoneNumber.checkExistingPhoneNumber(generatedPhoneNumber.full_number);
        
        if (existingCheck.exists) {
          console.warn(`⚠️ Skipping duplicate phone number: ${generatedPhoneNumber.full_number} (already exists from job ${existingCheck.job_id})`);
          duplicateRecords++;
          continue;
        }

        phoneNumbers.push(generatedPhoneNumber);
        validRecords++;
      }

      console.log(`📊 Validation summary: ${validRecords} valid records, ${invalidRecords} invalid records skipped, ${duplicateRecords} duplicates skipped`);

      // Create CSV file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedName = generation_name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      const filename = `phone_numbers_${sanitizedName}_${timestamp}.csv`;
      const uploadsDir = path.join(process.cwd(), 'uploads', 'phone_numbers');
      
      // Ensure uploads directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, filename);

      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'npa', title: 'NPA (Area Code)' },
          { id: 'nxx', title: 'NXX (Exchange)' },
          { id: 'line_number', title: 'Line Number' },
          { id: 'full_number', title: 'Full Phone Number' },
          { id: 'zip', title: 'ZIP Code' },
          { id: 'city', title: 'City' },
          { id: 'state_code', title: 'State' },
          { id: 'rate_center', title: 'Rate Center' },
          { id: 'timezone_display_name', title: 'Timezone' },
          { id: 'timezone_abbreviation', title: 'TZ Abbreviation' },
          { id: 'timezone_id', title: 'Timezone ID' },
          { id: 'created_at', title: 'Generated At' }
        ]
      });

      // Write CSV file
      await csvWriter.writeRecords(phoneNumbers);

      // Get file size
      const stats = await fs.stat(filePath);
      const file_size = stats.size;

      // Save generation record to database
      const generationData = {
        generation_name,
        user_id,
        user_name,
        filter_criteria,
        source_zipcodes,
        source_timezone_ids,
        total_records: phoneNumbers.length,
        file_size,
        csv_filename: filename,
        csv_path: filePath,
        status: 'completed'
      };

      const generation = await PhoneNumberGeneration.create(generationData);

      res.json({
        success: true,
        data: {
          generation,
          phone_numbers_count: phoneNumbers.length,
          csv_filename: filename,
          file_size,
          download_url: `/api/v1/phone-generations/${generation.id}/download`,
                  validation_summary: {
          valid_records: validRecords,
          invalid_records: invalidRecords,
          duplicate_records: duplicateRecords,
          total_processed: records.length
        }
      },
      message: `Successfully generated ${phoneNumbers.length} phone numbers from ${validRecords} valid records (${invalidRecords} invalid records skipped, ${duplicateRecords} duplicates skipped)`
      });

    } catch (error) {
      console.error('Error generating phone numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating phone numbers',
        error: error.message
      });
    }
  }

  // Get all phone number generations
  static async getAllGenerations(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        user_id,
        status,
        date_from,
        date_to,
        timezone_ids
      } = req.query;

      const filters = {};
      if (user_id) filters.user_id = user_id;
      if (status) filters.status = status;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      if (timezone_ids) {
        filters.timezone_ids = timezone_ids.includes(',') 
          ? timezone_ids.split(',').map(id => parseInt(id.trim())) 
          : [parseInt(timezone_ids)];
      }

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search,
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        filters
      };

      const result = await PhoneNumberGeneration.findAll(options);

      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination,
        filters
      });

    } catch (error) {
      console.error('Error fetching phone number generations:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching phone number generations',
        error: error.message
      });
    }
  }

  // Get generation by ID
  static async getGenerationById(req, res) {
    try {
      const { id } = req.params;
      const generation = await PhoneNumberGeneration.findById(id);

      if (!generation) {
        return res.status(404).json({
          success: false,
          message: 'Phone number generation not found'
        });
      }

      res.json({
        success: true,
        data: generation
      });

    } catch (error) {
      console.error('Error fetching phone number generation:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching phone number generation',
        error: error.message
      });
    }
  }

  // Download CSV file
  static async downloadCSV(req, res) {
    try {
      const { id } = req.params;
      const generation = await PhoneNumberGeneration.findById(id);

      if (!generation) {
        return res.status(404).json({
          success: false,
          message: 'Phone number generation not found'
        });
      }

      if (!generation.csv_path || !await fs.access(generation.csv_path).then(() => true).catch(() => false)) {
        return res.status(404).json({
          success: false,
          message: 'CSV file not found'
        });
      }

      // Record the download
      const downloadData = {
        user_id: req.user?.id || 'anonymous',
        user_name: req.user?.name || req.body.user_name || 'Anonymous User',
        download_type: 'csv',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      };

      await PhoneNumberGeneration.recordDownload(id, downloadData);

      // Send file
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${generation.csv_filename}"`);
      
      const fileContent = await fs.readFile(generation.csv_path);
      res.send(fileContent);

    } catch (error) {
      console.error('Error downloading CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading CSV file',
        error: error.message
      });
    }
  }

  // Get download history for a generation
  static async getDownloadHistory(req, res) {
    try {
      const { id } = req.params;
      const downloads = await PhoneNumberGeneration.getDownloadHistory(id);

      res.json({
        success: true,
        data: downloads
      });

    } catch (error) {
      console.error('Error fetching download history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching download history',
        error: error.message
      });
    }
  }

  // Get statistics
  static async getStats(req, res) {
    try {
      const stats = await PhoneNumberGeneration.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching phone generation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching statistics',
        error: error.message
      });
    }
  }

  // Delete generation (and associated file)
  static async deleteGeneration(req, res) {
    try {
      const { id } = req.params;
      const deletedGeneration = await PhoneNumberGeneration.deleteById(id);

      if (!deletedGeneration) {
        return res.status(404).json({
          success: false,
          message: 'Phone number generation not found'
        });
      }

      res.json({
        success: true,
        data: deletedGeneration,
        message: 'Phone number generation deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting phone number generation:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting phone number generation',
        error: error.message
      });
    }
  }

  // Get unique values for filters
  static async getUniqueValues(req, res) {
    try {
      const { field } = req.params;
      const { search = '', limit = 100 } = req.query;

      const values = await PhoneNumberGeneration.getUniqueValues(field, search, parseInt(limit));

      res.json({
        success: true,
        data: values
      });

    } catch (error) {
      console.error('Error fetching unique values:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching unique values',
        error: error.message
      });
    }
  }
}

module.exports = PhoneNumberGenerationController;
