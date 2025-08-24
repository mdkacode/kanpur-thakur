const PhoneNumber = require('../models/PhoneNumber');
const Telecare = require('../models/Telecare');

class PhoneNumberGenerator {
  constructor() {
    // State to timezone mapping
    this.stateToTimezone = {
      'AL': 'America/Chicago',
      'AK': 'America/Anchorage',
      'AZ': 'America/Phoenix',
      'AR': 'America/Chicago',
      'CA': 'America/Los_Angeles',
      'CO': 'America/Denver',
      'CT': 'America/New_York',
      'DE': 'America/New_York',
      'FL': 'America/New_York',
      'GA': 'America/New_York',
      'HI': 'Pacific/Honolulu',
      'ID': 'America/Boise',
      'IL': 'America/Chicago',
      'IN': 'America/Indiana/Indianapolis',
      'IA': 'America/Chicago',
      'KS': 'America/Chicago',
      'KY': 'America/New_York',
      'LA': 'America/Chicago',
      'ME': 'America/New_York',
      'MD': 'America/New_York',
      'MA': 'America/New_York',
      'MI': 'America/Detroit',
      'MN': 'America/Chicago',
      'MS': 'America/Chicago',
      'MO': 'America/Chicago',
      'MT': 'America/Denver',
      'NE': 'America/Chicago',
      'NV': 'America/Los_Angeles',
      'NH': 'America/New_York',
      'NJ': 'America/New_York',
      'NM': 'America/Denver',
      'NY': 'America/New_York',
      'NC': 'America/New_York',
      'ND': 'America/Chicago',
      'OH': 'America/New_York',
      'OK': 'America/Chicago',
      'OR': 'America/Los_Angeles',
      'PA': 'America/New_York',
      'RI': 'America/New_York',
      'SC': 'America/New_York',
      'SD': 'America/Chicago',
      'TN': 'America/Chicago',
      'TX': 'America/Chicago',
      'UT': 'America/Denver',
      'VT': 'America/New_York',
      'VA': 'America/New_York',
      'WA': 'America/Los_Angeles',
      'WV': 'America/New_York',
      'WI': 'America/Chicago',
      'WY': 'America/Denver',
      'DC': 'America/New_York'
    };
  }

  // Get timezone for a state
  getTimezoneForState(state) {
    return this.stateToTimezone[state] || 'America/New_York'; // Default to EST
  }

  // Validate NPA, NXX, and THOUSANDS
  validatePhoneComponents(npa, nxx, thousands) {
    if (!npa || !nxx) {
      return { valid: false, error: 'NPA and NXX are required' };
    }

    if (npa.length !== 3 || !/^\d{3}$/.test(npa)) {
      return { valid: false, error: 'NPA must be exactly 3 digits' };
    }

    if (nxx.length !== 3 || !/^\d{3}$/.test(nxx)) {
      return { valid: false, error: 'NXX must be exactly 3 digits' };
    }

    if (thousands && thousands !== '-' && (thousands.length !== 3 || !/^\d{3}$/.test(thousands))) {
      return { valid: false, error: 'THOUSANDS must be exactly 3 digits or "-"' };
    }

    return { valid: true };
  }

  // Generate phone numbers for a single NPA-NXX combination
  generatePhoneNumbersForNpaNxx(npa, nxx, thousands, state, zip, companyType, company, ratecenter, filterId = null) {
    const phoneNumbers = [];
    
    // Validate components
    const validation = this.validatePhoneComponents(npa, nxx, thousands);
    if (!validation.valid) {
      console.warn(`⚠️ Skipping invalid NPA-NXX: ${npa}-${nxx} (${validation.error})`);
      return phoneNumbers;
    }

    // Get timezone for the state
    const timezone = this.getTimezoneForState(state);

    // Generate numbers from 000 to 999
    for (let i = 0; i <= 999; i++) {
      const thousandsStr = i.toString().padStart(3, '0');
      const fullPhoneNumber = `${npa}${nxx}${thousandsStr}`;
      
      phoneNumbers.push({
        npa,
        nxx,
        thousands: thousandsStr,
        full_phone_number: fullPhoneNumber,
        state,
        timezone,
        company_type: companyType,
        company: company,
        ratecenter,
        zip,
        filter_id: filterId
      });
    }

    return phoneNumbers;
  }

  // Generate phone numbers from telecare output data
  async generatePhoneNumbersFromTelecareOutput(runId, zip, filterId = null) {
    try {
      console.log(`🔢 Starting phone number generation for run ${runId}, zip ${zip}`);

      // Create a new job
      const job = await PhoneNumber.createJob(runId, zip, filterId);
      console.log(`✅ Created phone number job: ${job.job_id}`);

      // Update job status to processing
      await PhoneNumber.updateJobStatus(job.job_id, 'processing');

      // Get telecare output rows
      const outputRows = await Telecare.getOutputRowsByRunId(runId);
      if (!outputRows || outputRows.length === 0) {
        throw new Error('No telecare output data found for this run');
      }

      console.log(`📊 Found ${outputRows.length} output rows to process`);

      // Update job with total count
      await PhoneNumber.updateJobStatus(job.job_id, 'processing', {
        totalNumbers: outputRows.length * 1000 // Each NPA-NXX generates 1000 numbers
      });

      let totalGenerated = 0;
      let totalFailed = 0;
      const allPhoneNumbers = [];

      // Process each output row
      for (const row of outputRows) {
        try {
          const payload = row.payload;
          
          // Extract required fields
          const npa = payload.NPA;
          const nxx = payload.NXX;
          const thousands = payload.THOUSANDS || '-';
          const state = payload.STATE;
          const companyType = payload['COMPANY TYPE'] || payload.COMPANY_TYPE;
          const company = payload.COMPANY;
          const ratecenter = payload.RATECENTER;

          // Validate required fields
          if (!npa || !nxx || !state) {
            console.warn(`⚠️ Skipping row with missing required fields:`, payload);
            totalFailed += 1000; // Count as failed since we can't generate numbers
            continue;
          }

          // Generate phone numbers for this NPA-NXX
          const phoneNumbers = this.generatePhoneNumbersForNpaNxx(
            npa, nxx, thousands, state, zip, companyType, company, ratecenter, filterId
          );

          if (phoneNumbers.length > 0) {
            allPhoneNumbers.push(...phoneNumbers);
            totalGenerated += phoneNumbers.length;
            
            // Update progress every 1000 numbers
            if (totalGenerated % 1000 === 0) {
              await PhoneNumber.updateJobStatus(job.job_id, 'processing', {
                generatedNumbers: totalGenerated,
                failedNumbers: totalFailed
              });
              console.log(`📈 Progress: ${totalGenerated} numbers generated, ${totalFailed} failed`);
            }
          }

        } catch (error) {
          console.error(`❌ Error processing output row:`, error);
          totalFailed += 1000; // Count as failed
        }
      }

      // Insert all phone numbers into database
      if (allPhoneNumbers.length > 0) {
        console.log(`💾 Inserting ${allPhoneNumbers.length} phone numbers into database...`);
        
        // Add job_id and run_id to each phone number
        const phoneNumbersWithJob = allPhoneNumbers.map(phoneNumber => ({
          ...phoneNumber,
          job_id: job.job_id,
          run_id: runId
        }));

        const insertedResults = await PhoneNumber.bulkInsertPhoneNumbers(phoneNumbersWithJob);
        console.log(`✅ Successfully inserted ${insertedResults.length} phone numbers`);
      }

      // Update job status to completed
      await PhoneNumber.updateJobStatus(job.job_id, 'completed', {
        generatedNumbers: totalGenerated,
        failedNumbers: totalFailed,
        finishedAt: new Date()
      });

      console.log(`🎉 Phone number generation completed successfully!`);
      console.log(`📊 Summary: ${totalGenerated} generated, ${totalFailed} failed`);

      return {
        success: true,
        job_id: job.job_id,
        total_generated: totalGenerated,
        total_failed: totalFailed,
        total_processed: outputRows.length
      };

    } catch (error) {
      console.error(`❌ Error in phone number generation:`, error);
      
      // Update job status to failed
      if (job && job.job_id) {
        await PhoneNumber.updateJobStatus(job.job_id, 'failed', {
          errorMessage: error.message,
          finishedAt: new Date()
        });
      }

      throw error;
    }
  }

  // Generate phone numbers for a specific filter
  async generatePhoneNumbersForFilter(filterId, zip) {
    try {
      console.log(`🔢 Starting phone number generation for filter ${filterId}, zip ${zip}`);

      // Get the latest telecare run for this zip
      const latestRun = await Telecare.getLatestRunByZip(zip);
      if (!latestRun) {
        throw new Error(`No telecare run found for zipcode ${zip}`);
      }

      // Generate phone numbers using the telecare output
      return await this.generatePhoneNumbersFromTelecareOutput(latestRun.run_id, zip, filterId);

    } catch (error) {
      console.error(`❌ Error generating phone numbers for filter:`, error);
      throw error;
    }
  }

  // Generate phone numbers directly from CSV data
  async generatePhoneNumbersFromCSV(csvData, zip, filterId = null) {
    let job = null;
    
    try {
      console.log(`🔢 Starting phone number generation from CSV for zip ${zip}`);

      // Create a new job
      job = await PhoneNumber.createJob('csv-generated', zip, filterId);
      console.log(`✅ Created phone number job: ${job.job_id}`);

      // Update job status to processing
      await PhoneNumber.updateJobStatus(job.job_id, 'processing');

      // Parse CSV data
      const rows = this.parseCSVData(csvData);
      if (!rows || rows.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      console.log(`📊 Found ${rows.length} rows to process`);

      // Update job with total count
      await PhoneNumber.updateJobStatus(job.job_id, 'processing', {
        totalNumbers: rows.length * 1000 // Each NPA-NXX generates 1000 numbers
      });

      let totalGenerated = 0;
      let totalFailed = 0;
      const allPhoneNumbers = [];

      // Process each CSV row
      for (const row of rows) {
        try {
          // Debug: Log the row structure
          console.log(`🔍 Processing CSV row:`, Object.keys(row));
          
          // Extract required fields from CSV row with better fallbacks
          const npa = row.NPA || row.npa || row.Npa;
          const nxx = row.NXX || row.nxx || row.Nxx;
          const thousands = row.THOUSANDS || row.thousands || row.Thousands || '-';
          const state = row.STATE || row.state || row.State;
          const companyType = row['COMPANY TYPE'] || row.COMPANY_TYPE || row.company_type || row['Company Type'];
          const company = row.COMPANY || row.company || row.Company;
          const ratecenter = row.RATECENTER || row.ratecenter || row.Ratecenter;

          // Debug: Log extracted values
          console.log(`📊 Extracted values: NPA=${npa}, NXX=${nxx}, STATE=${state}, THOUSANDS=${thousands}`);

          // Validate required fields
          if (!npa || !nxx || !state) {
            console.warn(`⚠️ Skipping row with missing required fields:`, row);
            totalFailed += 1000; // Count as failed since we can't generate numbers
            continue;
          }

          // Validate state format (should be 2 characters)
          if (state.length !== 2) {
            console.warn(`⚠️ Skipping row with invalid state format (${state}):`, row);
            totalFailed += 1000;
            continue;
          }

          // Generate phone numbers for this NPA-NXX
          const phoneNumbers = this.generatePhoneNumbersForNpaNxx(
            npa, nxx, thousands, state, zip, companyType, company, ratecenter, filterId
          );

          if (phoneNumbers.length > 0) {
            allPhoneNumbers.push(...phoneNumbers);
            totalGenerated += phoneNumbers.length;
            
            // Update progress every 1000 numbers
            if (totalGenerated % 1000 === 0) {
              await PhoneNumber.updateJobStatus(job.job_id, 'processing', {
                generatedNumbers: totalGenerated,
                failedNumbers: totalFailed
              });
              console.log(`📈 Progress: ${totalGenerated} numbers generated, ${totalFailed} failed`);
            }
          }

        } catch (error) {
          console.error(`❌ Error processing CSV row:`, error);
          totalFailed += 1000; // Count as failed
        }
      }

      // Insert all phone numbers into database
      if (allPhoneNumbers.length > 0) {
        console.log(`💾 Inserting ${allPhoneNumbers.length} phone numbers into database...`);
        
        // Add job_id to each phone number (no run_id for CSV generation)
        const phoneNumbersWithJob = allPhoneNumbers.map(phoneNumber => ({
          ...phoneNumber,
          job_id: job.job_id
          // run_id is null for CSV-generated numbers
        }));

        const insertedResults = await PhoneNumber.bulkInsertPhoneNumbers(phoneNumbersWithJob);
        console.log(`✅ Successfully inserted ${insertedResults.length} phone numbers`);
      }

      // Update job status to completed
      await PhoneNumber.updateJobStatus(job.job_id, 'completed', {
        generatedNumbers: totalGenerated,
        failedNumbers: totalFailed,
        finishedAt: new Date()
      });

      console.log(`🎉 Phone number generation completed successfully!`);
      console.log(`📊 Summary: ${totalGenerated} generated, ${totalFailed} failed`);

      return {
        success: true,
        job_id: job.job_id,
        total_generated: totalGenerated,
        total_failed: totalFailed,
        total_processed: rows.length
      };

    } catch (error) {
      console.error(`❌ Error in phone number generation from CSV:`, error);
      
      // Update job status to failed
      if (job && job.job_id) {
        await PhoneNumber.updateJobStatus(job.job_id, 'failed', {
          errorMessage: error.message,
          finishedAt: new Date()
        });
      }

      throw error;
    }
  }

  // Parse CSV data string into rows
  parseCSVData(csvData) {
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log(`📋 Detected CSV headers:`, headers);
      
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        rows.push(row);
      }

      console.log(`📊 Parsed ${rows.length} CSV rows`);
      if (rows.length > 0) {
        console.log(`🔍 Sample row structure:`, Object.keys(rows[0]));
        console.log(`📝 Sample row data:`, rows[0]);
      }

      return rows;
    } catch (error) {
      console.error('Error parsing CSV data:', error);
      throw new Error('Invalid CSV format');
    }
  }

  // Get phone number generation status
  async getGenerationStatus(jobId) {
    try {
      const job = await PhoneNumber.getJobById(jobId);
      if (!job) {
        throw new Error('Phone number job not found');
      }

      return {
        success: true,
        job: {
          job_id: job.job_id,
          status: job.status,
          total_numbers: job.total_numbers,
          generated_numbers: job.generated_numbers,
          failed_numbers: job.failed_numbers,
          started_at: job.started_at,
          finished_at: job.finished_at,
          error_message: job.error_message
        }
      };

    } catch (error) {
      console.error('Error getting phone number generation status:', error);
      throw error;
    }
  }

  // Get phone numbers for a job with pagination
  async getPhoneNumbersForJob(jobId, page = 1, limit = 100) {
    try {
      return await PhoneNumber.getPhoneNumbersByJobId(jobId, page, limit);
    } catch (error) {
      console.error('Error getting phone numbers for job:', error);
      throw error;
    }
  }

  // Export phone numbers to CSV format
  formatPhoneNumbersForCSV(phoneNumbers) {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return '';
    }

    // Define CSV headers
    const headers = [
      'NPA', 'NXX', 'THOUSANDS', 'FULL_PHONE_NUMBER', 'STATE', 'TIMEZONE',
      'COMPANY_TYPE', 'COMPANY', 'RATECENTER', 'ZIPCODE'
    ];

    // Create CSV content
    const csvRows = [headers.join(',')];
    
    for (const phoneNumber of phoneNumbers) {
      const row = [
        phoneNumber.npa,
        phoneNumber.nxx,
        phoneNumber.thousands,
        phoneNumber.full_phone_number,
        phoneNumber.state,
        phoneNumber.timezone,
        phoneNumber.company_type || '',
        phoneNumber.company || '',
        phoneNumber.ratecenter || '',
        phoneNumber.zip
      ].map(field => `"${field}"`).join(',');
      
      csvRows.push(row);
    }

    return csvRows.join('\n');
  }
}

module.exports = PhoneNumberGenerator;
