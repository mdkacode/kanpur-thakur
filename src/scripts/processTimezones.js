const db = require('../config/database');

class TimezoneProcessor {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.startTime = null;
  }

  async processTimezones() {
    try {
      this.startTime = new Date();
      console.log('🕐 Starting timezone processing at:', this.startTime.toISOString());
      console.log('=====================================');

      // Step 1: Check for records without timezone_id
      const recordsToProcess = await this.getRecordsWithoutTimezone();
      console.log(`📊 Found ${recordsToProcess.length} records without timezone information`);

      if (recordsToProcess.length === 0) {
        console.log('✅ All records already have timezone information. No processing needed.');
        return {
          success: true,
          processed: 0,
          errors: 0,
          message: 'All records already have timezone information'
        };
      }

      // Step 2: Process records in batches
      const batchSize = 1000;
      const batches = this.chunkArray(recordsToProcess, batchSize);
      
      console.log(`🔄 Processing ${recordsToProcess.length} records in ${batches.length} batches of ${batchSize}`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);
        
        await this.processBatch(batch);
        
        // Add a small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await this.sleep(100);
        }
      }

      // Step 3: Final verification
      const finalStats = await this.getProcessingStats();
      
      const endTime = new Date();
      const duration = (endTime - this.startTime) / 1000;

      console.log('\n🎉 Timezone processing completed!');
      console.log('================================');
      console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
      console.log(`✅ Processed: ${this.processedCount} records`);
      console.log(`❌ Errors: ${this.errorCount} records`);
      console.log(`📊 Final stats: ${finalStats.recordsWithTimezone}/${finalStats.totalRecords} records have timezone info`);

      return {
        success: true,
        processed: this.processedCount,
        errors: this.errorCount,
        duration: duration,
        finalStats: finalStats
      };

    } catch (error) {
      console.error('💥 Timezone processing failed:', error);
      return {
        success: false,
        error: error.message,
        processed: this.processedCount,
        errors: this.errorCount
      };
    }
  }

  async getRecordsWithoutTimezone() {
    try {
      const query = `
        SELECT id, zip_code, state_code, state, city, county
        FROM demographic_records 
        WHERE timezone_id IS NULL 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting records without timezone:', error);
      throw error;
    }
  }

  async processBatch(records) {
    for (const record of records) {
      try {
        await this.processSingleRecord(record);
        this.processedCount++;
      } catch (error) {
        console.error(`❌ Error processing record ${record.id}:`, error.message);
        this.errorCount++;
      }
    }
  }

  async processSingleRecord(record) {
    try {
      // Step 1: Ensure state_code is set
      if (!record.state_code && record.state) {
        const stateCode = this.getStateCodeFromName(record.state);
        if (stateCode) {
          await db.query(
            'UPDATE demographic_records SET state_code = $1 WHERE id = $2',
            [stateCode, record.id]
          );
          record.state_code = stateCode;
        }
      }

      // Step 2: Get timezone_id from state_code
      if (record.state_code) {
        const timezoneId = await this.getTimezoneIdFromState(record.state_code);
        if (timezoneId) {
          await db.query(
            'UPDATE demographic_records SET timezone_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [timezoneId, record.id]
          );
        } else {
          console.warn(`⚠️ No timezone found for state: ${record.state_code} (record ${record.id})`);
        }
      } else {
        console.warn(`⚠️ No state_code available for record ${record.id}`);
      }

    } catch (error) {
      console.error(`❌ Error processing record ${record.id}:`, error);
      throw error;
    }
  }

  getStateCodeFromName(stateName) {
    const stateMap = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    return stateMap[stateName] || null;
  }

  async getTimezoneIdFromState(stateCode) {
    try {
      const query = `
        SELECT timezone_id 
        FROM states 
        WHERE state_code = $1 AND timezone_id IS NOT NULL
        LIMIT 1
      `;
      
      const result = await db.query(query, [stateCode]);
      return result.rows[0]?.timezone_id || null;
    } catch (error) {
      console.error(`❌ Error getting timezone for state ${stateCode}:`, error);
      return null;
    }
  }

  async getProcessingStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(timezone_id) as records_with_timezone,
          COUNT(*) - COUNT(timezone_id) as records_without_timezone
        FROM demographic_records
      `;
      
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting processing stats:', error);
      return { total_records: 0, records_with_timezone: 0, records_without_timezone: 0 };
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution function
async function main() {
  const processor = new TimezoneProcessor();
  const result = await processor.processTimezones();
  
  if (result.success) {
    console.log('\n✅ Timezone processing completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Timezone processing failed!');
    process.exit(1);
  }
}

// Export for use as module
module.exports = { TimezoneProcessor, main };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
