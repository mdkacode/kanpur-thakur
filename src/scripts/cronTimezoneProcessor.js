#!/usr/bin/env node



const { TimezoneProcessor } = require('./processTimezones');
const fs = require('fs');
const path = require('path');

class CronTimezoneProcessor {
  constructor() {
    this.logFile = path.join(__dirname, '../../logs/timezone-processor.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Console output
    console.log(logMessage.trim());
    
    // File output
    fs.appendFileSync(this.logFile, logMessage);
  }

  async run() {
    try {
      this.log('🕐 Starting cron timezone processor...');
      this.log('=====================================');

      // Check if we should run (optional: add conditions like time of day, etc.)
      const shouldRun = await this.shouldRun();
      if (!shouldRun) {
        this.log('⏸️ Skipping timezone processing (conditions not met)');
        return;
      }

      // Process timezones
      const processor = new TimezoneProcessor();
      const result = await processor.processTimezones();

      if (result.success) {
        this.log(`✅ Timezone processing completed successfully!`);
        this.log(`📊 Processed: ${result.processed} records`);
        this.log(`❌ Errors: ${result.errors} records`);
        this.log(`⏱️ Duration: ${result.duration?.toFixed(2) || 'N/A'} seconds`);
        
        if (result.finalStats) {
          this.log(`📈 Final stats: ${result.finalStats.records_with_timezone}/${result.finalStats.total_records} records have timezone info`);
        }
      } else {
        this.log(`💥 Timezone processing failed: ${result.error}`);
      }

      this.log('=====================================');
      this.log('🏁 Cron timezone processor finished');

    } catch (error) {
      this.log(`💥 Fatal error in cron timezone processor: ${error.message}`);
      this.log(`📋 Stack trace: ${error.stack}`);
    }
  }

  async shouldRun() {
    // Add any conditions here that determine if the cron should run
    // For example: time of day, database load, etc.
    
    // Example: Only run between 6 AM and 10 PM
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      this.log(`⏰ Outside operating hours (${hour}:00), skipping`);
      return false;
    }

    // Example: Check if there are records to process
    try {
      const { TimezoneProcessor } = require('./processTimezones');
      const processor = new TimezoneProcessor();
      const recordsToProcess = await processor.getRecordsWithoutTimezone();
      
      if (recordsToProcess.length === 0) {
        this.log(`📊 No records need timezone processing, skipping`);
        return false;
      }

      this.log(`📊 Found ${recordsToProcess.length} records that need timezone processing`);
      return true;

    } catch (error) {
      this.log(`⚠️ Error checking if should run: ${error.message}`);
      // If we can't check, run anyway to be safe
      return true;
    }
  }

  // Clean up old log files (keep last 30 days)
  cleanupOldLogs() {
    try {
      const logDir = path.dirname(this.logFile);
      const files = fs.readdirSync(logDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          this.log(`🗑️ Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
      this.log(`⚠️ Error cleaning up old logs: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const cronProcessor = new CronTimezoneProcessor();
  
  // Clean up old logs (run once per day)
  if (new Date().getHours() === 2) { // At 2 AM
    cronProcessor.cleanupOldLogs();
  }
  
  await cronProcessor.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error in cron processor:', error);
    process.exit(1);
  });
}

module.exports = CronTimezoneProcessor;
