const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Telecare = require('../models/Telecare');

class PythonProcessor {
    constructor() {
        this.scriptPath = path.join(process.cwd(), 'scrap.py');
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Check if processed output exists for a given filter/upload
     */
    async checkProcessedOutput(zipcode, runId = null) {
        try {
            if (runId) {
                // Check for specific run
                const run = await Telecare.getRunById(runId);
                return run && run.status === 'success';
            } else {
                // Check for latest run for zipcode
                const latestRun = await Telecare.getLatestRunByZip(zipcode);
                return latestRun && latestRun.status === 'success';
            }
        } catch (error) {
            console.error('Error checking processed output:', error);
            return false;
        }
    }

    /**
     * Process missing Python script for a given dataset/filter
     */
    async processMissing(zipcode, filterConfig = {}) {
        try {
            console.log(`🔧 Starting Python processing for zipcode: ${zipcode}`);

            // Check if already processed
            const alreadyProcessed = await this.checkProcessedOutput(zipcode);
            if (alreadyProcessed) {
                console.log(`✅ Output already exists for zipcode: ${zipcode}`);
                return {
                    status: 'already_processed',
                    message: 'Output already exists for this zipcode'
                };
            }

            // Create a new telecare run
            const run = await Telecare.createRun(zipcode, 'scrap.py', 'output.csv', '1.0', {});
            console.log(`📝 Created telecare run: ${run.id}`);

            // Prepare input data
            const inputData = await this.prepareInputData(zipcode, filterConfig);
            if (!inputData) {
                throw new Error('Failed to prepare input data');
            }

            // Run Python script
            const result = await this.runPythonScript(zipcode, inputData, run.id);

            if (result.success) {
                // Update run status to success
                await Telecare.updateRunStatus(run.id, 'success', {
                    row_count: result.rowCount,
                    finished_at: new Date()
                });

                console.log(`✅ Python processing completed successfully for zipcode: ${zipcode}`);
                return {
                    status: 'completed',
                    jobId: run.id,
                    message: 'Processing completed successfully',
                    rowCount: result.rowCount
                };
            } else {
                // Update run status to error
                await Telecare.updateRunStatus(run.id, 'error', {
                    finished_at: new Date(),
                    error_message: result.error
                });

                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`❌ Error processing Python script for zipcode ${zipcode}:`, error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Prepare input data for Python script
     */
    async prepareInputData(zipcode, filterConfig) {
        try {
            // Get records for this zipcode with optional filters
            const Record = require('../models/Record');
            const records = await Record.findByZip(zipcode);

            if (!records || records.length === 0) {
                throw new Error(`No records found for zipcode: ${zipcode}`);
            }

            // Apply additional filters if provided
            let filteredRecords = records;
            if (filterConfig.timezone_id) {
                filteredRecords = filteredRecords.filter(r => r.timezone_id === filterConfig.timezone_id);
            }
            if (filterConfig.state_code) {
                filteredRecords = filteredRecords.filter(r => r.state_code === filterConfig.state_code);
            }

            if (filteredRecords.length === 0) {
                throw new Error(`No records match the filter criteria for zipcode: ${zipcode}`);
            }

            // Convert to CSV format
            const csvData = this.convertToCSV(filteredRecords);
            return csvData;

        } catch (error) {
            console.error('Error preparing input data:', error);
            return null;
        }
    }

    /**
     * Convert records to CSV format
     */
    convertToCSV(records) {
        const headers = ['NPA', 'NXX', 'THOUSANDS', 'COMPANY TYPE', 'OCN', 'COMPANY', 'LATA', 'RATECENTER', 'CLLI', 'STATE'];
        const csvRows = [headers.join(',')];

        for (const record of records) {
            const row = [
                record.npa || '',
                record.nxx || '',
                record.thousands || '',
                'STANDARD', // Default company type
                '', // OCN
                '', // COMPANY
                '', // LATA
                record.county || '', // RATECENTER
                '', // CLLI
                record.state_code || ''
            ];
            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Run Python script with input data
     */
    async runPythonScript(zipcode, inputData, runId) {
        return new Promise((resolve, reject) => {
            try {
                // Create temporary input file
                const inputFile = path.join(this.logDir, `input_${zipcode}_${runId}.csv`);
                fs.writeFileSync(inputFile, inputData);

                // Create output file path
                const outputFile = path.join(this.logDir, `output_${zipcode}_${runId}.csv`);

                // Prepare Python script arguments
                const args = [
                    inputFile,
                    outputFile,
                    '--zipcode', zipcode,
                    '--run-id', runId.toString()
                ];

                console.log(`🐍 Running Python script: ${this.scriptPath} ${args.join(' ')}`);

                // Spawn Python process
                const pythonProcess = spawn('python3', [this.scriptPath, ...args], {
                    cwd: process.cwd(),
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let stdout = '';
                let stderr = '';
                let startTime = Date.now();

                // Capture stdout
                pythonProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                    console.log(`🐍 Python stdout: ${data.toString().trim()}`);
                });

                // Capture stderr
                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                    console.error(`🐍 Python stderr: ${data.toString().trim()}`);
                });

                // Handle process completion
                pythonProcess.on('close', async (code) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;

                    // Log the execution
                    await this.logExecution(runId, {
                        command: `${this.scriptPath} ${args.join(' ')}`,
                        exitCode: code,
                        duration,
                        stdout,
                        stderr
                    });

                    // Clean up input file
                    try {
                        fs.unlinkSync(inputFile);
                    } catch (error) {
                        console.warn('Could not clean up input file:', error.message);
                    }

                    if (code === 0) {
                        // Check if output file exists and has content
                        if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
                            const outputContent = fs.readFileSync(outputFile, 'utf8');
                            const rowCount = outputContent.split('\n').filter(line => line.trim()).length - 1; // Subtract header

                            // Clean up output file
                            try {
                                fs.unlinkSync(outputFile);
                            } catch (error) {
                                console.warn('Could not clean up output file:', error.message);
                            }

                            resolve({
                                success: true,
                                rowCount,
                                outputFile: outputFile
                            });
                        } else {
                            reject(new Error('Python script completed but no output file was generated'));
                        }
                    } else {
                        reject(new Error(`Python script failed with exit code ${code}: ${stderr}`));
                    }
                });

                // Handle process errors
                pythonProcess.on('error', (error) => {
                    reject(new Error(`Failed to start Python process: ${error.message}`));
                });

                // Set timeout (5 minutes)
                setTimeout(() => {
                    pythonProcess.kill('SIGTERM');
                    reject(new Error('Python script execution timed out'));
                }, 5 * 60 * 1000);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Log execution details
     */
    async logExecution(runId, executionDetails) {
        try {
            const logFile = path.join(this.logDir, 'py-process.log');
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] Run ${runId}: ${JSON.stringify(executionDetails)}\n`;
            
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('Error logging execution:', error);
        }
    }

    /**
     * Get processing status
     */
    async getProcessingStatus(runId) {
        try {
            const run = await Telecare.getRunById(runId);
            if (!run) {
                return {
                    status: 'not_found',
                    message: 'Run not found'
                };
            }

            return {
                status: run.status,
                started_at: run.started_at,
                finished_at: run.finished_at,
                row_count: run.row_count,
                error_message: run.error_message
            };
        } catch (error) {
            console.error('Error getting processing status:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = new PythonProcessor();
