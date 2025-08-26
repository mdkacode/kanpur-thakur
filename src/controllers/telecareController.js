const telecareProcessor = require('../services/telecareProcessor');
const Telecare = require('../models/Telecare');
const Record = require('../models/Record');
const fileStorageService = require('../services/fileStorageService');
const path = require('path');
const fs = require('fs').promises;

class TelecareController {
  // Process telecare data for a zipcode
  static async processZipcode(req, res) {
    try {
      const { zipcode } = req.params;
      
      // Validate zipcode format
      if (!/^\d{5}$/.test(zipcode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid zipcode format. Must be 5 digits.'
        });
      }

      // Get NPA NXX records for the zipcode
      const records = await Record.findByZip(zipcode);
      
      if (!records || records.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No NPA NXX records found for this zipcode'
        });
      }

      // Start processing in background
      const processAsync = async () => {
        try {
          await telecareProcessor.processTelecareData(records, zipcode);
        } catch (error) {
          console.error(`Background telecare processing failed for zipcode ${zipcode}:`, error);
        }
      };

      // Start processing in the next tick
      process.nextTick(processAsync);

      res.json({
        success: true,
        message: 'Telecare processing started',
        data: {
          zipcode,
          records_count: records.length,
          status: 'processing'
        }
      });

    } catch (error) {
      console.error('Error starting telecare processing:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting telecare processing',
        error: error.message
      });
    }
  }

  // Get processing status for a run
  static async getProcessingStatus(req, res) {
    try {
      const { run_id } = req.params;
      
      const status = await telecareProcessor.getProcessingStatus(run_id);
      
      // Map database response to frontend expected format
      const mappedStatus = {
        run_id: status.run_id,
        zip: status.zip,
        status: status.status,
        started_at: status.started_at,
        finished_at: status.finished_at,
        row_count: status.row_count,
        input_csv_name: status.input_csv_name,
        output_csv_name: status.output_csv_name
      };
      
      res.json({
        success: true,
        data: mappedStatus
      });

    } catch (error) {
      console.error('Error getting processing status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting processing status',
        error: error.message
      });
    }
  }

  // Get telecare runs for a zipcode
  static async getRunsByZip(req, res) {
    try {
      const { zipcode } = req.params;
      const { limit = 10 } = req.query;
      
      // Validate zipcode format
      if (!/^\d{5}$/.test(zipcode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid zipcode format. Must be 5 digits.'
        });
      }

      const runs = await Telecare.getRunsByZip(zipcode, parseInt(limit));
      
      // Map database response to frontend expected format
      const mappedRuns = runs.map(run => ({
        run_id: run.id,
        zip: run.zipcode,
        input_csv_name: run.input_csv_name,
        output_csv_name: run.output_csv_name,
        row_count: run.row_count,
        status: run.status,
        script_version: run.script_version,
        started_at: run.started_at,
        finished_at: run.finished_at,
        file_refs: run.file_refs,
        created_at: run.created_at,
        updated_at: run.updated_at
      }));
      
      res.json({
        success: true,
        data: mappedRuns,
        pagination: {
          total: runs.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting telecare runs:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting telecare runs',
        error: error.message
      });
    }
  }

  // Get output rows for a run
  static async getOutputRows(req, res) {
    try {
      const { run_id } = req.params;
      
      const rows = await Telecare.getOutputRowsByRunId(run_id);
      
      res.json({
        success: true,
        data: rows,
        pagination: {
          total: rows.length
        }
      });

    } catch (error) {
      console.error('Error getting output rows:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting output rows',
        error: error.message
      });
    }
  }

  // Get telecare statistics
  static async getStats(req, res) {
    try {
      const stats = await Telecare.getStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting telecare stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting telecare stats',
        error: error.message
      });
    }
  }

  // Download input CSV for a run
  static async downloadInputCSV(req, res) {
    try {
      const { run_id } = req.params;
      console.log('Download input CSV requested for run_id:', run_id);
      
      const run = await Telecare.getRunById(run_id);
      if (!run) {
        console.log('Run not found for ID:', run_id);
        return res.status(404).json({
          success: false,
          message: 'Run not found'
        });
      }

      console.log('Found run:', { zip: run.zip, input_csv_name: run.input_csv_name });

      // Try to read from stored file first
      if (run.file_refs && run.file_refs.inputPath) {
        try {
          const filePath = path.join(__dirname, '..', '..', 'telecare_files', run.file_refs.inputPath);
          console.log('Attempting to read from stored file:', filePath);
          
          const fileContent = await fs.readFile(filePath, 'utf8');
          console.log('Successfully read stored file, size:', fileContent.length);
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${run.input_csv_name}"`);
          res.send(fileContent);
          console.log('Stored CSV sent successfully');
          return;
        } catch (fileError) {
          console.log('Could not read stored file, falling back to generation:', fileError.message);
        }
      }

      // Fallback: Generate CSV from records
      const records = await Record.findByZip(run.zip);
      console.log('Found records count:', records ? records.length : 0);
      
      if (!records || records.length === 0) {
        console.log('No records found for zipcode:', run.zip);
        return res.status(404).json({
          success: false,
          message: 'No records found for this zipcode'
        });
      }

      // Generate NPA/NXX CSV (only NPA and NXX columns)
      console.log('Generating NPA/NXX CSV for', records.length, 'records');
      const { csvString } = await telecareProcessor.generateInputCSV(records, run.zip);
      console.log('NPA/NXX CSV generated, length:', csvString.length);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${run.input_csv_name}"`);
      res.send(csvString);
      console.log('Generated CSV sent successfully');

    } catch (error) {
      console.error('Error downloading input CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading input CSV',
        error: error.message
      });
    }
  }

  // Download output CSV for a run
  static async downloadOutputCSV(req, res) {
    try {
      const { run_id } = req.params;
      console.log('Download output CSV requested for run_id:', run_id);
      
      const run = await Telecare.getRunById(run_id);
      if (!run) {
        console.log('Run not found for ID:', run_id);
        return res.status(404).json({
          success: false,
          message: 'Run not found'
        });
      }

      console.log('Found run:', { zip: run.zip, status: run.status, output_csv_name: run.output_csv_name });

      if (run.status !== 'success') {
        console.log('Run status is not success:', run.status);
        return res.status(400).json({
          success: false,
          message: 'Run has not completed successfully'
        });
      }

      // Try to read from stored file first
      if (run.file_refs && run.file_refs.outputPath) {
        try {
          const filePath = path.join(__dirname, '..', '..', 'telecare_files', run.file_refs.outputPath);
          console.log('Attempting to read from stored file:', filePath);
          
          const fileContent = await fs.readFile(filePath, 'utf8');
          console.log('Successfully read stored file, size:', fileContent.length);
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment: filename="${run.output_csv_name}"`);
          res.send(fileContent);
          console.log('Stored output CSV sent successfully');
          return;
        } catch (fileError) {
          console.log('Could not read stored file, falling back to database:', fileError.message);
        }
      }

      // Fallback: Get output rows from database
      const rows = await Telecare.getOutputRowsByRunId(run_id);
      console.log('Found output rows count:', rows.length);
      
      if (rows.length === 0) {
        console.log('No output rows found for run_id:', run_id);
        return res.status(404).json({
          success: false,
          message: 'No output data found for this run'
        });
      }

      // Convert JSONB payload back to CSV
      console.log('Converting rows to CSV...');
      const csv = require('csv-stringify');
      const csvString = await new Promise((resolve, reject) => {
        csv.stringify(rows.map(row => row.payload), { header: true }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
      
      console.log('CSV generated, length:', csvString.length);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${run.output_csv_name}"`);
      res.send(csvString);
      console.log('Generated output CSV sent successfully');

    } catch (error) {
      console.error('Error downloading output CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading output CSV',
        error: error.message
      });
    }
  }

  // Get latest run for a zipcode
  static async getLatestRun(req, res) {
    try {
      const { zipcode } = req.params;
      
      // Validate zipcode format
      if (!/^\d{5}$/.test(zipcode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid zipcode format. Must be 5 digits.'
        });
      }

      const run = await Telecare.getLatestRunByZip(zipcode);
      
      if (!run) {
        return res.status(404).json({
          success: false,
          message: 'No telecare runs found for this zipcode'
        });
      }

      // Map database response to frontend expected format
      const mappedRun = {
        run_id: run.id,
        zip: run.zipcode,
        input_csv_name: run.input_csv_name,
        output_csv_name: run.output_csv_name,
        row_count: run.row_count,
        status: run.status,
        script_version: run.script_version,
        started_at: run.started_at,
        finished_at: run.finished_at,
        file_refs: run.file_refs,
        created_at: run.created_at,
        updated_at: run.updated_at
      };

      res.json({
        success: true,
        data: mappedRun
      });

    } catch (error) {
      console.error('Error getting latest run:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting latest run',
        error: error.message
      });
    }
  }

  // Get file structure for a specific run
  static async getRunFileStructure(req, res) {
    try {
      const { run_id } = req.params;
      
      const run = await Telecare.getRunById(run_id);
      if (!run) {
        return res.status(404).json({
          success: false,
          message: 'Run not found'
        });
      }

      const fileInfo = await fileStorageService.getRunFileInfo(run.zip, run_id);
      
      res.json({
        success: true,
        data: {
          run_id: run.id,
          zip: run.zipcode,
          file_structure: fileInfo,
          file_refs: run.file_refs
        }
      });

    } catch (error) {
      console.error('Error getting run file structure:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting run file structure',
        error: error.message
      });
    }
  }

  // List files by date
  static async listFilesByDate(req, res) {
    try {
      const { date } = req.params; // Format: YYYY-MM-DD
      
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const files = await fileStorageService.listFilesByDate(date);
      
      res.json({
        success: true,
        data: {
          date,
          files
        }
      });

    } catch (error) {
      console.error('Error listing files by date:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing files by date',
        error: error.message
      });
    }
  }

  // Get file content for viewing (not downloading)
  static async getFileContent(req, res) {
    const { run_id, file_type } = req.params; // file_type: 'input' or 'output'
    
    try {
      
      if (!['input', 'output'].includes(file_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Must be "input" or "output"'
        });
      }

      const run = await Telecare.getRunById(run_id);
      if (!run) {
        return res.status(404).json({
          success: false,
          message: 'Run not found'
        });
      }

      // Try to read from stored file
      if (run.file_refs && run.file_refs[`${file_type}Path`]) {
        try {
          const filePath = path.join(__dirname, '..', '..', 'telecare_files', run.file_refs[`${file_type}Path`]);
          console.log(`Reading ${file_type} file for viewing:`, filePath);
          
          const fileContent = await fs.readFile(filePath, 'utf8');
          console.log(`Successfully read ${file_type} file, size:`, fileContent.length);
          
          res.json({
            success: true,
            data: {
              content: fileContent,
              filename: run[`${file_type}_csv_name`],
              size: fileContent.length,
              file_type
            }
          });
          return;
        } catch (fileError) {
          console.log(`Could not read stored ${file_type} file:`, fileError.message);
        }
      }

      // Fallback: Generate content on-demand
      if (file_type === 'input') {
        const records = await Record.findByZip(run.zipcode);
        if (!records || records.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No records found for this zipcode'
          });
        }

        const { csvString } = await telecareProcessor.generateInputCSV(records, run.zip);
        
        res.json({
          success: true,
          data: {
            content: csvString,
            filename: run.input_csv_name,
            size: csvString.length,
            file_type: 'input'
          }
        });
      } else {
        // Output file fallback
        const rows = await Telecare.getOutputRowsByRunId(run_id);
        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No output data found for this run'
          });
        }

        const csv = require('csv-stringify');
        const csvString = await new Promise((resolve, reject) => {
          csv.stringify(rows.map(row => ({
            NPA: row.npa,
            NXX: row.nxx,
            THOUSANDS: row.thousands,
            STATE: row.state_code,
            CITY: row.city,
            COUNTY: row.county,
            ZIP: row.zip,
            TIMEZONE_ID: row.timezone_id
          })), { header: true }, (err, output) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        res.json({
          success: true,
            data: {
              content: csvString,
              filename: run.output_csv_name,
              size: csvString.length,
              file_type: 'output'
            }
        });
      }

    } catch (error) {
      console.error(`Error getting ${file_type} file content:`, error);
      res.status(500).json({
        success: false,
        message: `Error getting ${file_type} file content`,
        error: error.message
      });
    }
  }
}

module.exports = TelecareController;
