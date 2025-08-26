const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const DemographicRecord = require('../models/DemographicRecord');
const FileUpload = require('../models/FileUpload');
const SchemaManager = require('../utils/schemaManager');
const timezoneResolver = require('./timezoneResolver');

class DemographicFileProcessor {
  constructor() {
    this.batchSize = 1000; // Smaller batch size for demographic data due to many columns
    this.maxMemoryUsage = 500 * 1024 * 1024; // 500MB memory limit
    this.progressInterval = 1000; // Log progress every 1k records
  }

  async processFile(filePath, uploadId) {
    try {
      console.log(`Starting demographic file processing for upload ${uploadId}: ${filePath}`);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      let records = [];
      let csvHeaders = [];

      if (fileExtension === '.csv') {
        const parseResult = await this.parseCSV(filePath);
        records = parseResult.records;
        csvHeaders = parseResult.headers;
      } else {
        const errorMsg = 'Unsupported file format. Only .csv files are supported for demographic data.';
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      console.log(`Parsed ${records.length} records from demographic file with ${csvHeaders.length} columns`);

      // Automatically sync database schema with CSV headers
      console.log('Syncing database schema with CSV headers...');
      try {
        await SchemaManager.syncSchemaWithCSV('demographic_records', csvHeaders);
        console.log('Database schema synchronized successfully');
      } catch (schemaError) {
        console.error('Warning: Schema sync failed, proceeding with existing schema:', schemaError.message);
        // Continue processing with existing schema
      }

      // Validate records
      const validRecords = this.validateRecords(records);
      console.log(`Validated ${validRecords.length} records out of ${records.length} total`);
      
      if (validRecords.length === 0) {
        const errorMsg = 'No valid records found in demographic file';
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      // Process records in batches
      const totalProcessed = await this.processRecordsInBatches(validRecords);
      console.log(`Successfully processed ${totalProcessed} demographic records`);
      
      // Update upload status
      await FileUpload.updateStatus(uploadId, 'completed', totalProcessed);
      
      return { 
        success: true, 
        message: `Successfully processed ${totalProcessed} demographic records`,
        totalProcessed,
        columnsProcessed: csvHeaders.length
      };

    } catch (error) {
      console.error('Error processing demographic file:', error);
      const errorMsg = error.message || 'Unknown error occurred during demographic file processing';
      await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      let headers = [];
      let isFirstRow = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (isFirstRow) {
            // Store headers from first row
            headers = Object.keys(row);
            console.log(`CSV Headers detected: ${headers.join(', ')}`);
            isFirstRow = false;
          }
          
          const record = this.parseCSVRow(row, headers);
          if (record) {
            records.push(record);
          }
        })
        .on('end', () => {
          console.log(`CSV parsing completed. Found ${headers.length} columns and ${records.length} records`);
          resolve({ records, headers });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  parseCSVRow(row, headers) {
    try {
      // Create a dynamic record object that maps CSV columns to database fields
      const record = {};
      
      // Map the first column (name) to zip_code if it exists
      if (row.name && !row.zip_code) {
        record.zip_code = row.name;
      }
      
      // Dynamically map all other columns
      headers.forEach(header => {
        if (header !== 'name') { // Skip name as we've already handled it
          record[header] = row[header] || '';
        }
      });
      
      // Ensure zip_code exists (required field)
      if (!record.zip_code) {
        console.warn('Row missing zip_code, skipping:', row);
        return null;
      }

      return record;
    } catch (error) {
      console.error('Error parsing CSV row:', error, row);
      return null;
    }
  }

  validateRecords(records) {
    return records.filter(record => {
      // Basic validation - ensure zip_code exists and is not empty
      if (!record.zip_code || record.zip_code.trim() === '') {
        return false;
      }
      
      // Ensure at least one other field has data
      const hasData = Object.values(record).some(value => 
        value && value.toString().trim() !== '' && value !== '-1'
      );
      
      return hasData;
    });
  }

  async processRecordsInBatches(records) {
    let totalProcessed = 0;
    const totalRecords = records.length;
    
    console.log(`Processing ${totalRecords} records in batches of ${this.batchSize}`);

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      
      try {
        // Add timezone resolution to each record in the batch
        const processedBatch = await this.addTimezoneToBatch(batch);
        
        await DemographicRecord.bulkCreate(processedBatch);
        totalProcessed += batch.length;
        
        // Log progress
        if (totalProcessed % this.progressInterval === 0 || totalProcessed === totalRecords) {
          console.log(`Processed ${totalProcessed}/${totalRecords} records (${((totalProcessed/totalRecords)*100).toFixed(1)}%)`);
        }
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > this.maxMemoryUsage) {
          console.log('Memory usage high, forcing garbage collection...');
          if (global.gc) {
            global.gc();
          }
        }
        
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i/this.batchSize) + 1}:`, error);
        throw error;
      }
    }
    
    return totalProcessed;
  }

  async addTimezoneToBatch(batch) {
    const processedBatch = [];
    
    for (const record of batch) {
      try {
        // Resolve timezone based on state and zip_code
        let timezoneId = record.timezone_id;
        if (!timezoneId && record.state_code) {
          const timezone = await timezoneResolver.resolveTimezone({
            state: record.state_code,
            city: record.city,
            zipcode: record.zip_code
          });
          timezoneId = timezone ? timezone.id : null;
        }
        
        // Add timezone_id to the record
        const processedRecord = {
          ...record,
          timezone_id: timezoneId
        };
        
        processedBatch.push(processedRecord);
      } catch (error) {
        console.error('Error adding timezone to record:', error);
        // Continue with the record without timezone
        processedBatch.push(record);
      }
    }
    
    return processedBatch;
  }

  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = new DemographicFileProcessor();
