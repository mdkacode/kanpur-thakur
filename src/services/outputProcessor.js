const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const Telecare = require('../models/Telecare');
const PhoneNumber = require('../models/PhoneNumber');

class OutputProcessor {
    constructor() {
        this.outputDir = path.join(process.cwd(), 'telecare_files', 'output');
        this.ensureOutputDirectory();
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Load files from processed CSV and generate phone numbers
     */
    async loadFilesAndGeneratePhoneNumbers(zipcode, filterConfig = {}) {
        try {
            console.log(`📁 Loading files for zipcode: ${zipcode}`);

            // Get the latest successful run for this zipcode
            const latestRun = await Telecare.getLatestRunByZip(zipcode);
            if (!latestRun || latestRun.status !== 'success') {
                throw new Error(`No successful processing found for zipcode: ${zipcode}`);
            }

            // Get output rows from database
            const outputRows = await Telecare.getOutputRowsByRunId(latestRun.id);
            if (!outputRows || outputRows.length === 0) {
                throw new Error(`No output data found for run: ${latestRun.id}`);
            }

            console.log(`📊 Found ${outputRows.length} output rows for zipcode: ${zipcode}`);

            // Generate phone numbers from output data
            const phoneNumbers = await this.generatePhoneNumbersFromOutput(outputRows, zipcode, filterConfig);

            return {
                success: true,
                runId: latestRun.id,
                outputRowCount: outputRows.length,
                phoneNumberCount: phoneNumbers.length,
                phoneNumbers: phoneNumbers
            };

        } catch (error) {
            console.error(`❌ Error loading files for zipcode ${zipcode}:`, error);
            throw error;
        }
    }

    /**
     * Generate phone numbers from output data
     */
    async generatePhoneNumbersFromOutput(outputRows, zipcode, filterConfig = {}) {
        const phoneNumbers = [];
        let validRows = 0;
        let invalidRows = 0;

        for (const row of outputRows) {
            try {
                // Extract NPA, NXX, THOUSANDS from the output row
                const npa = row.npa;
                const nxx = row.nxx;
                const thousands = row.thousands;

                // Validate required fields
                if (!npa || !nxx) {
                    console.warn(`⚠️ Skipping row with missing required fields: NPA=${npa}, NXX=${nxx}`);
                    invalidRows++;
                    continue;
                }

                // Skip rows with THOUSANDS = "-" (don't generate phone numbers for invalid data)
                if (thousands === '-') {
                    console.warn(`⚠️ Skipping row with THOUSANDS = "-" - NPA: ${npa}, NXX: ${nxx} (no phone numbers generated)`);
                    invalidRows++;
                    continue;
                }
                
                // If THOUSANDS is null/empty, generate for all digits (0-9)
                // If THOUSANDS is a specific digit, validate it's 0-9
                if (!thousands || thousands === '') {
                    // Generate for all thousands digits (0-9)
                    for (let thousandsDigit = 0; thousandsDigit <= 9; thousandsDigit++) {
                        for (let i = 0; i <= 999; i++) {
                            const lastThree = i.toString().padStart(3, '0');
                            const fullPhoneNumber = `${npa}${nxx}${thousandsDigit}${lastThree}`;

                            phoneNumbers.push({
                                npa,
                                nxx,
                                thousands: thousandsDigit.toString(),
                                full_phone_number: fullPhoneNumber,
                                zip: zipcode,
                                state_code: row.state_code,
                                city: row.city,
                                county: row.county,
                                timezone_id: row.timezone_id,
                                source_run_id: row.run_id
                            });
                        }
                    }
                    validRows++;
                    continue;
                }

                // Validate THOUSANDS is single digit 0-9
                if (thousands.length !== 1 || !/^\d$/.test(thousands)) {
                    console.warn(`⚠️ Skipping row with invalid THOUSANDS: "${thousands}" (must be single digit 0-9)`);
                    invalidRows++;
                    continue;
                }

                // Generate 1000 phone numbers for this NPA-NXX-THOUSANDS combination
                // Format: NPA + NXX + THOUSANDS + 000-999
                for (let i = 0; i <= 999; i++) {
                    const lastThree = i.toString().padStart(3, '0');
                    const fullPhoneNumber = `${npa}${nxx}${thousands}${lastThree}`;

                    phoneNumbers.push({
                        npa,
                        nxx,
                        thousands,
                        full_phone_number: fullPhoneNumber,
                        zip: zipcode,
                        state_code: row.state_code,
                        city: row.city,
                        county: row.county,
                        timezone_id: row.timezone_id,
                        source_run_id: row.run_id
                    });
                }

                validRows++;

            } catch (error) {
                console.error('Error processing output row:', error);
                invalidRows++;
            }
        }

        console.log(`📊 Phone number generation summary:`);
        console.log(`   Valid rows processed: ${validRows}`);
        console.log(`   Invalid rows skipped: ${invalidRows}`);
        console.log(`   Total phone numbers generated: ${phoneNumbers.length}`);

        return phoneNumbers;
    }

    /**
     * Save phone numbers to database
     */
    async savePhoneNumbersToDatabase(phoneNumbers, zipcode, filterConfig = {}) {
        try {
            if (phoneNumbers.length === 0) {
                console.log('No phone numbers to save');
                return { success: true, savedCount: 0 };
            }

            console.log(`💾 Saving ${phoneNumbers.length} phone numbers to database...`);

            // Create a phone number generation job
            const job = await PhoneNumber.createJob('output-csv-generated', zipcode, null);
            console.log(`📝 Created phone number job: ${job.id}`);

            // Update job status to processing
            await PhoneNumber.updateJobStatus(job.id, 'processing', {
                total_records: phoneNumbers.length
            });

            // Add job_id to each phone number
            const phoneNumbersWithJob = phoneNumbers.map(phoneNumber => ({
                ...phoneNumber,
                job_id: job.id
            }));

            // Bulk insert phone numbers with deduplication
            const savedResults = await PhoneNumber.bulkInsertPhoneNumbers(phoneNumbersWithJob);

            // Update job status to completed
            await PhoneNumber.updateJobStatus(job.id, 'completed', {
                processed_records: savedResults.length,
                completed_at: new Date()
            });

            console.log(`✅ Successfully saved ${savedResults.length} phone numbers to database`);

            return {
                success: true,
                jobId: job.id,
                savedCount: savedResults.length,
                totalCount: phoneNumbers.length
            };

        } catch (error) {
            console.error('Error saving phone numbers to database:', error);
            throw error;
        }
    }

    /**
     * Generate downloadable CSV file
     */
    async generateDownloadableCSV(phoneNumbers, zipcode, filterConfig = {}) {
        try {
            if (phoneNumbers.length === 0) {
                throw new Error('No phone numbers to export');
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `phone_numbers_${zipcode}_${timestamp}.csv`;
            const filePath = path.join(this.outputDir, filename);

            // Create CSV writer
            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'full_phone_number', title: 'PHONE_NUMBER' },
                    { id: 'npa', title: 'NPA' },
                    { id: 'nxx', title: 'NXX' },
                    { id: 'thousands', title: 'THOUSANDS' },
                    { id: 'zip', title: 'ZIPCODE' },
                    { id: 'state_code', title: 'STATE' },
                    { id: 'city', title: 'CITY' },
                    { id: 'county', title: 'COUNTY' },
                    { id: 'timezone_id', title: 'TIMEZONE_ID' }
                ]
            });

            // Write phone numbers to CSV
            await csvWriter.writeRecords(phoneNumbers);

            console.log(`📄 Generated CSV file: ${filePath}`);

            return {
                success: true,
                filename,
                filePath,
                recordCount: phoneNumbers.length
            };

        } catch (error) {
            console.error('Error generating CSV file:', error);
            throw error;
        }
    }

    /**
     * Stream phone numbers CSV for download
     */
    async streamPhoneNumbersCSV(res, zipcode, filterConfig = {}) {
        try {
            console.log(`📥 Streaming phone numbers CSV for zipcode: ${zipcode}`);

            // Get phone numbers from database
            const phoneNumbers = await this.getPhoneNumbersFromDatabase(zipcode, filterConfig);

            if (phoneNumbers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No phone numbers found for this zipcode'
                });
            }

            // Set response headers for CSV download
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `phone_numbers_${zipcode}_${timestamp}.csv`;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache');

            // Write CSV header
            const headers = [
                'PHONE_NUMBER', 'NPA', 'NXX', 'THOUSANDS',
                'ZIPCODE', 'STATE', 'CITY', 'COUNTY', 'TIMEZONE_ID'
            ];
            res.write(headers.join(',') + '\n');

            // Stream phone numbers
            let count = 0;
            for (const phoneNumber of phoneNumbers) {
                const row = [
                    phoneNumber.full_phone_number,
                    phoneNumber.npa,
                    phoneNumber.nxx,
                    phoneNumber.thousands,
                    phoneNumber.zip,
                    phoneNumber.state_code,
                    phoneNumber.city,
                    phoneNumber.county,
                    phoneNumber.timezone_id
                ];
                res.write(row.join(',') + '\n');
                count++;

                // Log progress every 1000 records
                if (count % 1000 === 0) {
                    console.log(`📊 Streamed ${count}/${phoneNumbers.length} phone numbers`);
                }
            }

            console.log(`✅ Successfully streamed ${count} phone numbers`);
            res.end();

        } catch (error) {
            console.error('Error streaming phone numbers CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error streaming phone numbers',
                error: error.message
            });
        }
    }

    /**
     * Get phone numbers from database
     */
    async getPhoneNumbersFromDatabase(zipcode, filterConfig = {}) {
        try {
            // Build query with filters
            let query = `
                SELECT pn.*, tz.display_name as timezone_display_name
                FROM phone_numbers pn
                LEFT JOIN timezones tz ON pn.timezone_id = tz.id
                WHERE pn.zip = $1
            `;
            let values = [zipcode];
            let valueIndex = 2;

            // Add additional filters
            if (filterConfig.timezone_id) {
                query += ` AND pn.timezone_id = $${valueIndex++}`;
                values.push(filterConfig.timezone_id);
            }

            if (filterConfig.state_code) {
                query += ` AND pn.state_code = $${valueIndex++}`;
                values.push(filterConfig.state_code);
            }

            query += ` ORDER BY pn.full_phone_number`;

            const result = await require('../config/database').query(query, values);
            return result.rows;

        } catch (error) {
            console.error('Error getting phone numbers from database:', error);
            throw error;
        }
    }
}

module.exports = new OutputProcessor();
