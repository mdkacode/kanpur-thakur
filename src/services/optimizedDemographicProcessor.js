const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const DemographicRecord = require('../models/DemographicRecord');
const FileUpload = require('../models/FileUpload');
const SchemaManager = require('../utils/schemaManager');
const timezoneResolver = require('./timezoneResolver');

class OptimizedDemographicProcessor {
  constructor() {
    this.batchSize = 1000; // Increased for better performance
    this.maxWorkers = Math.max(1, os.cpus().length - 1); // Use all CPU cores except one
    this.maxMemoryUsage = 1024 * 1024 * 1024; // 1GB memory limit
    this.progressInterval = 1000; // Log progress every 1000 records
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.checkpointInterval = 5000; // Save checkpoint every 5000 records
    this.workerTimeout = 300000; // 5 minutes timeout for workers
  }

  async processFile(filePath, uploadId) {
    const startTime = Date.now();
    console.log(`🚀 Starting optimized demographic processing for upload ${uploadId}: ${filePath}`);
    console.log(`🔧 Configuration: ${this.maxWorkers} workers, ${this.batchSize} batch size`);

    try {
      // Create processing checkpoint
      const checkpoint = await this.createCheckpoint(uploadId, filePath);
      
      // Parse CSV with streaming for memory efficiency
      const { records, headers } = await this.parseCSVWithStreaming(filePath);
      
      console.log(`📊 Parsed ${records.length} records with ${headers.length} columns`);

      // Sync schema
      await this.syncSchema(headers);

      // Validate records in parallel
      const validRecords = await this.validateRecordsParallel(records);
      
      if (validRecords.length === 0) {
        throw new Error('No valid records found in demographic file');
      }

      // Process records with multi-threading and self-healing
      const result = await this.processRecordsWithWorkers(validRecords, uploadId, checkpoint);
      
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      console.log(`✅ Processing completed in ${processingTime}s (${(validRecords.length / processingTime).toFixed(0)} records/sec)`);
      
      await FileUpload.updateStatus(uploadId, 'completed', result.totalProcessed);
      
      return {
        success: true,
        message: `Successfully processed ${result.totalProcessed} records in ${processingTime}s`,
        totalProcessed: result.totalProcessed,
        processingTime,
        recordsPerSecond: (validRecords.length / processingTime).toFixed(0),
        columnsProcessed: headers.length
      };

    } catch (error) {
      console.error('❌ Error in optimized processing:', error);
      await FileUpload.updateStatus(uploadId, 'failed', 0, error.message);
      return { success: false, message: error.message };
    }
  }

  async parseCSVWithStreaming(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      let headers = [];
      let isFirstRow = true;

      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (isFirstRow) {
            headers = Object.keys(row);
            isFirstRow = false;
          }
          records.push(row);
        })
        .on('end', () => {
          resolve({ records, headers });
        })
        .on('error', reject);
    });
  }

  async syncSchema(headers) {
    try {
      await SchemaManager.syncSchemaWithCSV('demographic_records', headers);
      console.log('✅ Database schema synchronized');
    } catch (error) {
      console.warn('⚠️ Schema sync warning:', error.message);
    }
  }

  async validateRecordsParallel(records) {
    console.log(`🔍 Validating ${records.length} records in parallel...`);
    
    const chunks = this.chunkArray(records, Math.ceil(records.length / this.maxWorkers));
    const validationPromises = chunks.map(chunk => this.validateChunk(chunk));
    
    const validatedChunks = await Promise.all(validationPromises);
    const validRecords = validatedChunks.flat();
    
    console.log(`✅ Validation complete: ${validRecords.length} valid records`);
    return validRecords;
  }

  async validateChunk(chunk) {
    const validRecords = [];
    
    for (const record of chunk) {
      try {
        const validRecord = await this.validateAndEnrichRecord(record);
        if (validRecord) {
          validRecords.push(validRecord);
        }
      } catch (error) {
        console.warn(`⚠️ Record validation failed:`, error.message);
      }
    }
    
    return validRecords;
  }

  async validateAndEnrichRecord(record) {
    try {
      // Basic validation
      if (!record.zip_code || record.zip_code.toString().trim() === '') {
        return null;
      }

      // State code mapping
      if (!record.state_code && record.state) {
        record.state_code = this.mapStateToCode(record.state);
      }

      // Timezone resolution
      try {
        const timezoneInfo = await timezoneResolver.resolveTimezone(record);
        record.timezone_id = timezoneInfo?.id || null;
      } catch (error) {
        record.timezone_id = null;
      }

      return record;
    } catch (error) {
      return null;
    }
  }

  mapStateToCode(state) {
    const stateMap = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
      'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
      'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
      'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
      'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
      'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
      'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
      'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
      'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
      'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
    };
    
    const stateUpper = state.toString().toUpperCase().trim();
    return stateMap[stateUpper] || state;
  }

  async processRecordsWithWorkers(records, uploadId, checkpoint) {
    const chunks = this.chunkArray(records, Math.ceil(records.length / this.maxWorkers));
    const workers = [];
    const results = [];
    
    console.log(`🔧 Starting ${chunks.length} worker threads for processing`);

    // Create workers
    for (let i = 0; i < chunks.length; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          chunk: chunks[i],
          chunkIndex: i,
          uploadId,
          checkpointId: checkpoint.id
        },
        timeout: this.workerTimeout
      });

      workers.push(worker);
    }

    // Process with self-healing
    const processedResults = await this.processWithSelfHealing(workers, chunks, uploadId, checkpoint);
    
    const totalProcessed = processedResults.reduce((sum, result) => sum + result.processed, 0);
    
    return { totalProcessed, results: processedResults };
  }

  async processWithSelfHealing(workers, chunks, uploadId, checkpoint) {
    const results = [];
    const failedChunks = [];

    // Process all chunks
    for (let i = 0; i < workers.length; i++) {
      try {
        const result = await this.processWorkerWithRetry(workers[i], chunks[i], i);
        results.push(result);
        
        // Update checkpoint
        await this.updateCheckpoint(checkpoint.id, {
          processedChunks: results.length,
          totalChunks: chunks.length,
          lastProcessedChunk: i
        });
        
      } catch (error) {
        console.error(`❌ Worker ${i} failed:`, error.message);
        failedChunks.push({ chunkIndex: i, chunk: chunks[i], error: error.message });
      }
    }

    // Self-healing: Retry failed chunks
    if (failedChunks.length > 0) {
      console.log(`🔄 Self-healing: Retrying ${failedChunks.length} failed chunks...`);
      
      for (const failedChunk of failedChunks) {
        try {
          const result = await this.processChunkDirectly(failedChunk.chunk, failedChunk.chunkIndex);
          results.push(result);
          
          console.log(`✅ Self-healing successful for chunk ${failedChunk.chunkIndex}`);
          
        } catch (retryError) {
          console.error(`❌ Self-healing failed for chunk ${failedChunk.chunkIndex}:`, retryError.message);
          
          // Final fallback: process records individually
          const individualResult = await this.processRecordsIndividually(failedChunk.chunk, failedChunk.chunkIndex);
          results.push(individualResult);
        }
      }
    }

    return results;
  }

  async processWorkerWithRetry(worker, chunk, chunkIndex) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.processWorker(worker, chunk, chunkIndex);
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        console.log(`🔄 Retry attempt ${attempt}/${this.retryAttempts} for chunk ${chunkIndex}`);
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  async processWorker(worker, chunk, chunkIndex) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Worker timeout for chunk ${chunkIndex}`));
      }, this.workerTimeout);

      worker.on('message', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  async processChunkDirectly(chunk, chunkIndex) {
    console.log(`🔧 Processing chunk ${chunkIndex} directly (${chunk.length} records)`);
    
    const batches = this.chunkArray(chunk, this.batchSize);
    let totalProcessed = 0;

    for (const batch of batches) {
      try {
        await DemographicRecord.bulkCreate(batch);
        totalProcessed += batch.length;
      } catch (error) {
        console.warn(`⚠️ Batch failed in chunk ${chunkIndex}:`, error.message);
        // Continue with next batch
      }
    }

    return { chunkIndex, processed: totalProcessed };
  }

  async processRecordsIndividually(records, chunkIndex) {
    console.log(`🔧 Processing chunk ${chunkIndex} records individually (${records.length} records)`);
    
    let totalProcessed = 0;

    for (const record of records) {
      try {
        await DemographicRecord.create(record);
        totalProcessed++;
      } catch (error) {
        console.warn(`⚠️ Individual record failed in chunk ${chunkIndex}:`, error.message);
        // Continue with next record
      }
    }

    return { chunkIndex, processed: totalProcessed };
  }

  async createCheckpoint(uploadId, filePath) {
    const checkpoint = {
      id: `checkpoint_${uploadId}_${Date.now()}`,
      uploadId,
      filePath,
      status: 'processing',
      startTime: new Date(),
      processedChunks: 0,
      totalChunks: 0,
      lastProcessedChunk: -1
    };

    // Save checkpoint to database or file
    await this.saveCheckpoint(checkpoint);
    
    return checkpoint;
  }

  async updateCheckpoint(checkpointId, updates) {
    // Update checkpoint with progress
    const checkpoint = await this.loadCheckpoint(checkpointId);
    Object.assign(checkpoint, updates);
    await this.saveCheckpoint(checkpoint);
  }

  async saveCheckpoint(checkpoint) {
    // Save to database or file system
    const checkpointPath = path.join(__dirname, '../data/checkpoints', `${checkpoint.id}.json`);
    await fs.promises.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.promises.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }

  async loadCheckpoint(checkpointId) {
    const checkpointPath = path.join(__dirname, '../data/checkpoints', `${checkpointId}.json`);
    const data = await fs.promises.readFile(checkpointPath, 'utf8');
    return JSON.parse(data);
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker thread code
if (!isMainThread) {
  const { chunk, chunkIndex, uploadId, checkpointId } = workerData;
  
  async function processChunk() {
    try {
      const processor = new OptimizedDemographicProcessor();
      const result = await processor.processChunkDirectly(chunk, chunkIndex);
      
      parentPort.postMessage(result);
    } catch (error) {
      parentPort.postMessage({ 
        chunkIndex, 
        processed: 0, 
        error: error.message 
      });
    }
  }

  processChunk();
}

module.exports = OptimizedDemographicProcessor;
