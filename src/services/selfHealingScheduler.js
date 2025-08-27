const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const DatabaseOptimizer = require('./databaseOptimizer');

class SelfHealingScheduler {
  constructor() {
    this.jobs = new Map();
    this.failedJobs = new Map();
    this.recoveryStrategies = new Map();
    this.maxRetries = 5;
    this.retryDelays = [1000, 5000, 15000, 60000, 300000]; // Exponential backoff
    this.healthCheckInterval = 300000; // 5 minutes
    this.dbOptimizer = new DatabaseOptimizer();
  }

  initialize() {
    console.log('🔧 Initializing Self-Healing Scheduler...');
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start failed job recovery
    this.startFailedJobRecovery();
    
    // Start database optimization
    this.startDatabaseOptimization();
    
    console.log('✅ Self-Healing Scheduler initialized');
  }

  // Register a job with self-healing capabilities
  registerJob(jobId, jobFunction, options = {}) {
    const jobConfig = {
      id: jobId,
      function: jobFunction,
      maxRetries: options.maxRetries || this.maxRetries,
      retryDelays: options.retryDelays || this.retryDelays,
      timeout: options.timeout || 300000, // 5 minutes
      recoveryStrategy: options.recoveryStrategy || 'retry',
      dependencies: options.dependencies || [],
      priority: options.priority || 'normal',
      createdAt: new Date(),
      lastRun: null,
      nextRun: null,
      status: 'pending',
      retryCount: 0,
      errorHistory: []
    };

    this.jobs.set(jobId, jobConfig);
    console.log(`📋 Job registered: ${jobId}`);
    
    return jobId;
  }

  // Execute a job with self-healing
  async executeJob(jobId, params = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`🚀 Executing job: ${jobId}`);
    
    try {
      // Update job status
      job.status = 'running';
      job.lastRun = new Date();
      
      // Execute with timeout
      const result = await this.executeWithTimeout(job.function, params, job.timeout);
      
      // Success
      job.status = 'completed';
      job.retryCount = 0;
      job.errorHistory = [];
      
      console.log(`✅ Job completed: ${jobId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Job failed: ${jobId}`, error.message);
      
      // Record error
      job.errorHistory.push({
        timestamp: new Date(),
        error: error.message,
        stack: error.stack
      });
      
      // Handle failure with self-healing
      return await this.handleJobFailure(job, error, params);
    }
  }

  async executeWithTimeout(jobFunction, params, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job timeout after ${timeout}ms`));
      }, timeout);

      jobFunction(params)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async handleJobFailure(job, error, params) {
    job.status = 'failed';
    
    if (job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delay = job.retryDelays[job.retryCount] || job.retryDelays[job.retryDelays.length - 1];
      
      console.log(`🔄 Scheduling retry for job ${job.id} in ${delay}ms (attempt ${job.retryCount + 1}/${job.maxRetries})`);
      
      job.retryCount++;
      job.nextRun = new Date(Date.now() + delay);
      
      // Schedule retry
      setTimeout(async () => {
        try {
          await this.executeJob(job.id, params);
        } catch (retryError) {
          console.error(`❌ Retry failed for job ${job.id}:`, retryError.message);
        }
      }, delay);
      
      return { status: 'retrying', retryCount: job.retryCount, nextRetry: job.nextRun };
      
    } else {
      // Max retries exceeded, use recovery strategy
      console.log(`🚨 Max retries exceeded for job ${job.id}, applying recovery strategy: ${job.recoveryStrategy}`);
      
      this.failedJobs.set(job.id, { job, error, params });
      
      return await this.applyRecoveryStrategy(job, error, params);
    }
  }

  async applyRecoveryStrategy(job, error, params) {
    switch (job.recoveryStrategy) {
      case 'retry':
        return await this.retryWithBackoff(job, params);
        
      case 'restart':
        return await this.restartJob(job, params);
        
      case 'fallback':
        return await this.executeFallback(job, params);
        
      case 'manual':
        return await this.requireManualIntervention(job, error);
        
      default:
        console.error(`❌ Unknown recovery strategy: ${job.recoveryStrategy}`);
        return { status: 'failed', error: 'Unknown recovery strategy' };
    }
  }

  async retryWithBackoff(job, params) {
    // Reset retry count and try again with longer delays
    job.retryCount = 0;
    job.retryDelays = job.retryDelays.map(delay => delay * 2); // Double the delays
    
    console.log(`🔄 Applying retry with backoff for job ${job.id}`);
    
    return await this.executeJob(job.id, params);
  }

  async restartJob(job, params) {
    // Restart the job from scratch
    job.status = 'pending';
    job.retryCount = 0;
    job.errorHistory = [];
    
    console.log(`🔄 Restarting job ${job.id}`);
    
    return await this.executeJob(job.id, params);
  }

  async executeFallback(job, params) {
    // Execute a fallback function if available
    if (job.fallbackFunction) {
      console.log(`🔄 Executing fallback for job ${job.id}`);
      return await job.fallbackFunction(params);
    } else {
      console.error(`❌ No fallback function available for job ${job.id}`);
      return { status: 'failed', error: 'No fallback function available' };
    }
  }

  async requireManualIntervention(job, error) {
    // Log the issue for manual intervention
    const issue = {
      jobId: job.id,
      error: error.message,
      timestamp: new Date(),
      status: 'requires_manual_intervention'
    };
    
    await this.logIssue(issue);
    
    console.log(`🚨 Manual intervention required for job ${job.id}`);
    return { status: 'manual_intervention_required', issue };
  }

  // Health monitoring
  startHealthMonitoring() {
    cron.schedule('*/5 * * * *', async () => { // Every 5 minutes
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    });
  }

  async performHealthCheck() {
    console.log('🏥 Performing health check...');
    
    const healthStatus = {
      timestamp: new Date(),
      jobs: {
        total: this.jobs.size,
        running: 0,
        completed: 0,
        failed: 0,
        pending: 0
      },
      failedJobs: this.failedJobs.size,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpu: process.cpuUsage()
      }
    };

    // Count job statuses
    for (const job of this.jobs.values()) {
      healthStatus.jobs[job.status]++;
    }

    // Check for stuck jobs
    const stuckJobs = this.detectStuckJobs();
    if (stuckJobs.length > 0) {
      console.log(`⚠️ Detected ${stuckJobs.length} stuck jobs`);
      await this.handleStuckJobs(stuckJobs);
    }

    // Log health status
    await this.logHealthStatus(healthStatus);
    
    console.log('✅ Health check completed');
    return healthStatus;
  }

  detectStuckJobs() {
    const stuckJobs = [];
    const now = new Date();
    const stuckThreshold = 10 * 60 * 1000; // 10 minutes

    for (const job of this.jobs.values()) {
      if (job.status === 'running' && job.lastRun) {
        const runningTime = now - job.lastRun;
        if (runningTime > stuckThreshold) {
          stuckJobs.push(job);
        }
      }
    }

    return stuckJobs;
  }

  async handleStuckJobs(stuckJobs) {
    for (const job of stuckJobs) {
      console.log(`🔧 Handling stuck job: ${job.id}`);
      
      // Force restart the job
      job.status = 'pending';
      job.retryCount = 0;
      
      // Schedule immediate restart
      setTimeout(async () => {
        try {
          await this.executeJob(job.id);
        } catch (error) {
          console.error(`❌ Failed to restart stuck job ${job.id}:`, error);
        }
      }, 1000);
    }
  }

  // Failed job recovery
  startFailedJobRecovery() {
    cron.schedule('*/10 * * * *', async () => { // Every 10 minutes
      try {
        await this.recoverFailedJobs();
      } catch (error) {
        console.error('❌ Failed job recovery failed:', error);
      }
    });
  }

  async recoverFailedJobs() {
    if (this.failedJobs.size === 0) {
      return;
    }

    console.log(`🔄 Attempting to recover ${this.failedJobs.size} failed jobs...`);

    for (const [jobId, failedJob] of this.failedJobs) {
      try {
        console.log(`🔄 Attempting recovery for job: ${jobId}`);
        
        // Try to recover the job
        const result = await this.executeJob(jobId, failedJob.params);
        
        if (result.status === 'completed') {
          this.failedJobs.delete(jobId);
          console.log(`✅ Successfully recovered job: ${jobId}`);
        }
        
      } catch (error) {
        console.error(`❌ Recovery failed for job ${jobId}:`, error.message);
      }
    }
  }

  // Database optimization
  startDatabaseOptimization() {
    cron.schedule('0 2 * * *', async () => { // Daily at 2 AM
      try {
        await this.optimizeDatabase();
      } catch (error) {
        console.error('❌ Database optimization failed:', error);
      }
    });
  }

  async optimizeDatabase() {
    console.log('🔧 Starting database optimization...');
    
    try {
      // Optimize main tables
      const tables = ['demographic_records', 'phone_numbers', 'records'];
      
      for (const table of tables) {
        try {
          await this.dbOptimizer.optimizeTable(table);
        } catch (error) {
          console.warn(`⚠️ Failed to optimize table ${table}:`, error.message);
        }
      }

      // Create/update indexes
      await this.createOptimizedIndexes();
      
      console.log('✅ Database optimization completed');
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      throw error;
    }
  }

  async createOptimizedIndexes() {
    const indexConfigs = {
      demographic_records: [
        { columns: ['zip_code'] },
        { columns: ['state_code'] },
        { columns: ['timezone_id'] },
        { columns: ['zip_code', 'state_code'] },
        { columns: ['created_at'] }
      ],
      phone_numbers: [
        { columns: ['npa', 'nxx'] },
        { columns: ['zip'] },
        { columns: ['state_code'] },
        { columns: ['created_at'] }
      ],
      records: [
        { columns: ['zip'] },
        { columns: ['state_code'] },
        { columns: ['npa', 'nxx'] }
      ]
    };

    for (const [tableName, indexes] of Object.entries(indexConfigs)) {
      try {
        await this.dbOptimizer.createIndexes(tableName, indexes);
      } catch (error) {
        console.warn(`⚠️ Failed to create indexes for ${tableName}:`, error.message);
      }
    }
  }

  // Logging utilities
  async logIssue(issue) {
    const logPath = path.join(__dirname, '../logs/issues.json');
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    
    let issues = [];
    try {
      const data = await fs.promises.readFile(logPath, 'utf8');
      issues = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }
    
    issues.push(issue);
    
    // Keep only last 1000 issues
    if (issues.length > 1000) {
      issues = issues.slice(-1000);
    }
    
    await fs.promises.writeFile(logPath, JSON.stringify(issues, null, 2));
  }

  async logHealthStatus(healthStatus) {
    const logPath = path.join(__dirname, '../logs/health.json');
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    
    let healthLog = [];
    try {
      const data = await fs.promises.readFile(logPath, 'utf8');
      healthLog = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }
    
    healthLog.push(healthStatus);
    
    // Keep only last 1000 health checks
    if (healthLog.length > 1000) {
      healthLog = healthLog.slice(-1000);
    }
    
    await fs.promises.writeFile(logPath, JSON.stringify(healthLog, null, 2));
  }

  // Utility methods
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    return job ? {
      id: job.id,
      status: job.status,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      retryCount: job.retryCount,
      errorHistory: job.errorHistory
    } : null;
  }

  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      status: job.status,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      retryCount: job.retryCount,
      priority: job.priority
    }));
  }

  getFailedJobs() {
    return Array.from(this.failedJobs.entries()).map(([jobId, failedJob]) => ({
      jobId,
      error: failedJob.error.message,
      timestamp: failedJob.job.lastRun
    }));
  }

  async shutdown() {
    console.log('🔄 Shutting down Self-Healing Scheduler...');
    
    // Stop all cron jobs
    cron.getTasks().forEach(task => task.stop());
    
    // Close database connections
    await this.dbOptimizer.closePool();
    
    console.log('✅ Self-Healing Scheduler shutdown complete');
  }
}

module.exports = SelfHealingScheduler;
