const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const Record = require('../models/Record');
const FileUpload = require('../models/FileUpload');

class FileProcessor {
  constructor() {
    this.batchSize = 5000; // Increased batch size for better performance
    this.maxMemoryUsage = 500 * 1024 * 1024; // 500MB memory limit
    this.progressInterval = 10000; // Log progress every 10k records
  }

  async processFile(filePath, uploadId) {
    try {
      console.log(`Starting file processing for upload ${uploadId}: ${filePath}`);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      let records = [];

      if (fileExtension === '.csv') {
        records = await this.parseCSV(filePath);
      } else if (fileExtension === '.txt') {
        records = await this.parseTXT(filePath);
      } else {
        const errorMsg = 'Unsupported file format. Only .csv and .txt files are supported.';
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      console.log(`Parsed ${records.length} records from file`);

      // Validate records
      const validRecords = this.validateRecords(records);
      console.log(`Validated ${validRecords.length} records out of ${records.length} total`);
      
      if (validRecords.length === 0) {
        const errorMsg = 'No valid records found in file';
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      // Process records in batches
      const totalProcessed = await this.processRecordsInBatches(validRecords);
      console.log(`Successfully processed ${totalProcessed} records`);
      
      // Update upload status
      await FileUpload.updateStatus(uploadId, 'completed', totalProcessed);
      
      return { 
        success: true, 
        message: `Successfully processed ${totalProcessed} records`,
        totalProcessed 
      };

    } catch (error) {
      console.error('Error processing file:', error);
      const errorMsg = error.message || 'Unknown error occurred during file processing';
      await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Handle different CSV formats
          const record = this.parseCSVRow(row);
          if (record) {
            records.push(record);
          }
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async parseTXT(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      let buffer = '';

      readStream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            const record = this.parseTXTLine(line.trim());
            if (record) {
              records.push(record);
            }
          }
        }
      });

      readStream.on('end', () => {
        // Process remaining buffer
        if (buffer.trim()) {
          const record = this.parseTXTLine(buffer.trim());
          if (record) {
            records.push(record);
          }
        }
        resolve(records);
      });

      readStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseCSVRow(row) {
    try {
      // Handle different column name variations
      const npa = (row.NPA || row.npa || row[0] || '').toString().trim();
      const nxx = (row.NXX || row.nxx || row[1] || '').toString().trim();
      const zip = (row.ZIP || row.zip || row[2] || '').toString().trim();
      const state_code = (row.STATE || row.state || row.STATE_CODE || row.state_code || row[3] || '').toString().trim().toUpperCase();
      const city = (row.CITY || row.city || row[4] || '').toString().trim();
      const rc = (row.RC || row.rc || row[5] || '').toString().trim();

      // Check if any required field is empty
      if (!npa || !nxx || !zip || !state_code || !city || !rc) {
        console.log(`Missing required fields: NPA=${npa}, NXX=${nxx}, ZIP=${zip}, STATE=${state_code}, CITY=${city}, RC=${rc}`);
        return null;
      }

      return { npa, nxx, zip, state_code, city, rc };
    } catch (error) {
      console.error('Error parsing CSV row:', error);
      return null;
    }
  }

  parseTXTLine(line) {
    try {
      // Split by comma and handle quoted values
      const parts = this.splitCSVLine(line);
      
      if (parts.length < 6) {
        console.log(`Invalid line format (expected 6 parts, got ${parts.length}): ${line}`);
        return null;
      }

      const [npa, nxx, zip, state_code, city, rc] = parts.map(part => part.trim());

      // Check if any required field is empty
      if (!npa || !nxx || !zip || !state_code || !city || !rc) {
        console.log(`Missing required fields in line: NPA=${npa}, NXX=${nxx}, ZIP=${zip}, STATE=${state_code}, CITY=${city}, RC=${rc}`);
        return null;
      }

      // Convert state_code to uppercase
      const normalizedStateCode = state_code.toUpperCase();

      return { npa, nxx, zip, state_code: normalizedStateCode, city, rc };
    } catch (error) {
      console.error('Error parsing TXT line:', error);
      return null;
    }
  }

  splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  validateRecords(records) {
    return records.filter(record => {
      try {
        // Basic validation with better error handling
        if (!record) return false;
        
        // Validate NPA (3 digits)
        if (!record.npa || record.npa.length > 3 || !/^\d{1,3}$/.test(record.npa)) {
          console.log(`Invalid NPA: ${record.npa}`);
          return false;
        }
        
        // Validate NXX (3 digits)
        if (!record.nxx || record.nxx.length > 3 || !/^\d{1,3}$/.test(record.nxx)) {
          console.log(`Invalid NXX: ${record.nxx}`);
          return false;
        }
        
        // Validate ZIP (5 digits)
        if (!record.zip || record.zip.length > 5 || !/^\d{1,5}$/.test(record.zip)) {
          console.log(`Invalid ZIP: ${record.zip}`);
          return false;
        }
        
        // Validate State Code (2 characters)
        if (!record.state_code || record.state_code.length > 2 || !/^[A-Z]{2}$/.test(record.state_code)) {
          console.log(`Invalid State Code: ${record.state_code}`);
          return false;
        }
        
        // Validate City (non-empty string)
        if (!record.city || record.city.trim().length === 0) {
          console.log(`Invalid City: ${record.city}`);
          return false;
        }
        
        // Validate RC (non-empty string)
        if (!record.rc || record.rc.trim().length === 0) {
          console.log(`Invalid RC: ${record.rc}`);
          return false;
        }
        
        return true;
      } catch (error) {
        console.log(`Error validating record: ${error.message}`);
        return false;
      }
    });
  }

  async processRecordsInBatches(records) {
    let totalProcessed = 0;
    let failedBatches = 0;
    const maxFailedBatches = 5; // Increased tolerance for large files
    const startTime = Date.now();
    
    console.log(`🚀 Starting batch processing of ${records.length} records in batches of ${this.batchSize}`);
    
    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(records.length / this.batchSize);
      
      try {
        await Record.bulkCreate(batch);
        totalProcessed += batch.length;
        
        // Enhanced progress logging for large files
        if (totalProcessed % this.progressInterval === 0 || batchNumber === totalBatches) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = totalProcessed / elapsed;
          const remaining = records.length - totalProcessed;
          const eta = remaining / rate;
          
          console.log(`📊 Progress: ${totalProcessed}/${records.length} records (${((totalProcessed/records.length)*100).toFixed(1)}%)`);
          console.log(`⏱️  Rate: ${rate.toFixed(0)} records/sec | ETA: ${(eta/60).toFixed(1)} minutes`);
          
          // Memory usage check
          const memUsage = process.memoryUsage();
          console.log(`💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used`);
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${batchNumber}/${totalBatches}:`, error.message);
        failedBatches++;
        
        if (failedBatches >= maxFailedBatches) {
          throw new Error(`Too many failed batches (${failedBatches}/${totalBatches}). Stopping processing.`);
        }
        
        // Continue with next batch instead of failing completely
        console.log(`⚠️  Skipping failed batch and continuing with next batch...`);
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Completed processing ${totalProcessed} records in ${totalTime.toFixed(1)} seconds`);
    
    if (failedBatches > 0) {
      console.log(`⚠️  ${failedBatches} failed batches out of ${Math.ceil(records.length / this.batchSize)} total batches`);
    }
    
    return totalProcessed;
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

module.exports = new FileProcessor();
