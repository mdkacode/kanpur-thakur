const OptimizedDemographicProcessor = require('../services/optimizedDemographicProcessor');
const SelfHealingScheduler = require('../services/selfHealingScheduler');
const DatabaseOptimizer = require('../services/databaseOptimizer');
const FileUpload = require('../models/FileUpload');
const path = require('path');

class OptimizedUploadController {
  constructor() {
    this.processor = new OptimizedDemographicProcessor();
    this.scheduler = new SelfHealingScheduler();
    this.dbOptimizer = new DatabaseOptimizer();
    
    // Initialize services
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Initialize database optimizer
      this.dbOptimizer.initializePool();
      
      // Initialize self-healing scheduler
      this.scheduler.initialize();
      
      console.log('✅ Optimized Upload Controller initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Optimized Upload Controller:', error);
    }
  }

  // Main upload endpoint with optimization
  async uploadDemographicFile(req, res) {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const filePath = req.file.path;
      const uploadId = req.body.uploadId || `upload_${Date.now()}`;

      console.log(`🚀 Starting optimized upload: ${uploadId}`);
      console.log(`📁 File: ${filePath}`);

      // Create upload record
      const uploadRecord = await FileUpload.create({
        filename: uploadId,
        originalName: req.file.originalname,
        filePath: filePath,
        fileSize: req.file.size,
        fileType: 'demographic'
      });

      const dbUploadId = uploadRecord.id;

      // Register job with self-healing scheduler
      const jobId = this.scheduler.registerJob(
        `demographic_upload_${uploadId}`,
        async (params) => {
          return await this.processor.processFile(params.filePath, params.uploadId);
        },
        {
          maxRetries: 3,
          timeout: 1800000, // 30 minutes
          recoveryStrategy: 'retry',
          priority: 'high'
        }
      );

      // Execute job asynchronously
      this.scheduler.executeJob(jobId, { filePath, uploadId })
        .then(async (result) => {
          const endTime = Date.now();
          const processingTime = (endTime - startTime) / 1000;
          
          console.log(`✅ Upload completed: ${uploadId} in ${processingTime}s`);
          
          if (result.success) {
            await FileUpload.updateStatus(uploadId, 'completed', result.totalProcessed);
          } else {
            await FileUpload.updateStatus(uploadId, 'failed', 0, result.message);
          }
        })
        .catch(async (error) => {
          console.error(`❌ Upload failed: ${uploadId}`, error);
          await FileUpload.updateStatus(uploadId, 'failed', 0, error.message);
        });

      // Return immediate response
      res.json({
        success: true,
        message: 'File upload started with optimized processing',
        uploadId,
        dbUploadId,
        jobId,
        status: 'processing',
        estimatedTime: 'Processing millions of records with multi-threading and self-healing'
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed',
        error: error.message
      });
    }
  }

  // Get upload status with detailed information
  async getUploadStatus(req, res) {
    try {
      const { uploadId } = req.params;
      
      // Try to find upload by database ID first, then by filename
      let upload = await FileUpload.findById(parseInt(uploadId));
      if (!upload) {
        // If not found by ID, try to find by filename
        const uploads = await FileUpload.findAll({ filters: { filename: uploadId } });
        if (uploads.records.length > 0) {
          upload = uploads.records[0];
        }
      }
      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      // Get job status from scheduler
      const jobId = `demographic_upload_${uploadId}`;
      const jobStatus = this.scheduler.getJobStatus(jobId);

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(uploadId);

      res.json({
        success: true,
        upload: {
          id: upload.id,
          filename: upload.filename,
          status: upload.status,
          file_size: upload.file_size,
          created_at: upload.created_at,
          updated_at: upload.updated_at,
          processed_records: upload.processed_records || 0,
          error_message: upload.error_message
        },
        job: jobStatus,
        performance: performanceMetrics
      });

    } catch (error) {
      console.error('❌ Get status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get upload status',
        error: error.message
      });
    }
  }

  // Get system performance metrics
  async getPerformanceMetrics(uploadId) {
    try {
      // Get database performance stats
      const dbStats = await this.dbOptimizer.monitorPerformance();
      
      // Get scheduler health
      const schedulerHealth = {
        totalJobs: this.scheduler.jobs.size,
        failedJobs: this.scheduler.failedJobs.size,
        allJobs: this.scheduler.getAllJobs(),
        failedJobsList: this.scheduler.getFailedJobs()
      };

      return {
        database: dbStats,
        scheduler: schedulerHealth,
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpu: process.cpuUsage()
        }
      };

    } catch (error) {
      console.error('❌ Performance metrics error:', error);
      return { error: error.message };
    }
  }

  // Cancel upload
  async cancelUpload(req, res) {
    try {
      const { uploadId } = req.params;

      // Update upload status
      await FileUpload.updateStatus(uploadId, 'cancelled', 0, 'Cancelled by user');

      // Cancel job in scheduler
      const jobId = `demographic_upload_${uploadId}`;
      const job = this.scheduler.jobs.get(jobId);
      if (job) {
        job.status = 'cancelled';
      }

      res.json({
        success: true,
        message: 'Upload cancelled successfully',
        uploadId
      });

    } catch (error) {
      console.error('❌ Cancel upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel upload',
        error: error.message
      });
    }
  }

  // Retry failed upload
  async retryUpload(req, res) {
    try {
      const { uploadId } = req.params;

      // Get upload record
      const upload = await FileUpload.findById(uploadId);
      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      if (upload.status !== 'failed') {
        return res.status(400).json({
          success: false,
          message: 'Upload is not in failed status'
        });
      }

      // Reset upload status
      await FileUpload.updateStatus(uploadId, 'processing', 0);

      // Retry job
      const jobId = `demographic_upload_${uploadId}`;
      const job = this.scheduler.jobs.get(jobId);
      
      if (job) {
        job.status = 'pending';
        job.retryCount = 0;
        job.errorHistory = [];
        
        // Execute job again
        this.scheduler.executeJob(jobId, { 
          filePath: upload.filepath, 
          uploadId 
        });
      }

      res.json({
        success: true,
        message: 'Upload retry started',
        uploadId,
        jobId
      });

    } catch (error) {
      console.error('❌ Retry upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry upload',
        error: error.message
      });
    }
  }

  // Get all uploads with optimization status
  async getAllUploads(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      // Get uploads from database
      const uploads = await FileUpload.findAll({ 
        limit: parseInt(limit), 
        offset: parseInt(offset),
        status: status || undefined
      });

      // Enhance with job status
      const enhancedUploads = uploads.records.map(upload => {
        const jobId = `demographic_upload_${upload.id}`;
        const jobStatus = this.scheduler.getJobStatus(jobId);
        
        return {
          ...upload,
          job_status: jobStatus
        };
      });

      res.json({
        success: true,
        uploads: enhancedUploads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: uploads.length
        }
      });

    } catch (error) {
      console.error('❌ Get uploads error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get uploads',
        error: error.message
      });
    }
  }

  // System health check
  async getSystemHealth(req, res) {
    try {
      const health = {
        timestamp: new Date(),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpu: process.cpuUsage()
        },
        database: await this.dbOptimizer.monitorPerformance(),
        scheduler: {
          totalJobs: this.scheduler.jobs.size,
          failedJobs: this.scheduler.failedJobs.size,
          health: await this.scheduler.performHealthCheck()
        },
        processor: {
          maxWorkers: this.processor.maxWorkers,
          batchSize: this.processor.batchSize,
          maxMemoryUsage: this.processor.maxMemoryUsage
        }
      };

      res.json({
        success: true,
        health
      });

    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  // Optimize database manually
  async optimizeDatabase(req, res) {
    try {
      console.log('🔧 Manual database optimization requested');

      // Optimize main tables
      const tables = ['demographic_records', 'phone_numbers', 'records'];
      const results = [];

      for (const table of tables) {
        try {
          await this.dbOptimizer.optimizeTable(table);
          results.push({ table, status: 'success' });
        } catch (error) {
          results.push({ table, status: 'failed', error: error.message });
        }
      }

      res.json({
        success: true,
        message: 'Database optimization completed',
        results
      });

    } catch (error) {
      console.error('❌ Database optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Database optimization failed',
        error: error.message
      });
    }
  }

  // Shutdown services gracefully
  async shutdown(req, res) {
    try {
      console.log('🔄 Graceful shutdown requested');

      // Shutdown scheduler
      await this.scheduler.shutdown();

      // Close database connections
      await this.dbOptimizer.closePool();

      res.json({
        success: true,
        message: 'Services shutdown successfully'
      });

    } catch (error) {
      console.error('❌ Shutdown error:', error);
      res.status(500).json({
        success: false,
        message: 'Shutdown failed',
        error: error.message
      });
    }
  }
}

module.exports = OptimizedUploadController;
