const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Telecare = require('../models/Telecare');
const ProcessingSession = require('../models/ProcessingSession');
const { v4: uuidv4 } = require('uuid');

class PythonProcessor {
    constructor() {
        this.scriptPath = path.join(process.cwd(), 'scrap_improved.py');
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
    async processMissing(zipcode, filterConfig = {}, userId = 1) {
        try {
            console.log(`🔧 Starting Python processing for zipcode: ${zipcode}`);

            // Create processing session
            const sessionId = `python_processing_${uuidv4()}`;
            const sessionData = {
                sessionId,
                userId: parseInt(userId),
                filterId: filterConfig.filterId || null,
                filterCriteria: filterConfig,
                sourceZipcodes: Array.isArray(zipcode) ? zipcode : [zipcode],
                totalRecords: 0, // Will be updated after processing
                sessionType: 'python_script_processing'
            };

            const session = await ProcessingSession.create(sessionData);
            console.log(`📊 Created processing session: ${sessionId}`);

            // Check if already processed
            const alreadyProcessed = await this.checkProcessedOutput(zipcode);
            if (alreadyProcessed) {
                console.log(`✅ Output already exists for zipcode: ${zipcode}`);
                
                // Update session status
                await ProcessingSession.updateStatus(sessionId, 'completed', {
                    processedRecords: 0
                });

                return {
                    status: 'already_processed',
                    sessionId,
                    message: 'Output already exists for this zipcode'
                };
            }

            // Update session status to processing
            await ProcessingSession.updateStatus(sessionId, 'processing');

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

                // Update processing session status
                await ProcessingSession.updateStatus(sessionId, 'completed', {
                    processedRecords: result.rowCount
                });

                // Add generated file to session
                if (result.outputFile) {
                    await ProcessingSession.addGeneratedFile(sessionId, {
                        fileName: `scrap_output_${zipcode}.csv`,
                        filePath: result.outputFile,
                        fileType: 'python_output',
                        fileSize: result.fileSize || 0,
                        recordCount: result.rowCount,
                        description: `Python script output for zipcode: ${zipcode}`
                    });
                }

                console.log(`✅ Python processing completed successfully for zipcode: ${zipcode}`);
                return {
                    status: 'completed',
                    sessionId,
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

                // Update processing session status to failed
                await ProcessingSession.updateStatus(sessionId, 'failed', {
                    errorMessage: result.error
                });

                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`❌ Error processing Python script for zipcode ${zipcode}:`, error);
            
            // Update session status to failed if session was created
            if (sessionId) {
                try {
                    await ProcessingSession.updateStatus(sessionId, 'failed', {
                        errorMessage: error.message
                    });
                } catch (sessionError) {
                    console.error('Error updating session status:', sessionError);
                }
            }
            
            return {
                status: 'error',
                sessionId,
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

                // This is now handled above with error detection

                // Capture stderr
                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                    console.error(`🐍 Python stderr: ${data.toString().trim()}`);
                });

                // Capture stdout for error detection
                pythonProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    
                    // Check if this is an error message
                    if (output.startsWith('ERROR:')) {
                        console.error(`🐍 Python error detected: ${output.trim()}`);
                    } else {
                        console.log(`🐍 Python stdout: ${output.trim()}`);
                    }
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

                    // Check if stdout contains an error message
                    if (stdout.includes('ERROR:')) {
                        const errorMatch = stdout.match(/ERROR:\s*(.+)/);
                        const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error from Python script';
                        reject(new Error(errorMessage));
                        return;
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
     * Process multiple zipcodes with delay between jobs
     */
    async processMultipleZipcodes(zipcodes, filterConfig = {}, userId = 1) {
        try {
            console.log(`🔧 Starting batch processing for ${zipcodes.length} zipcodes`);
            
            const results = [];
            const sessionId = `batch_processing_${uuidv4()}`;
            
            // Create batch processing session
            const sessionData = {
                sessionId,
                userId: parseInt(userId),
                filterId: filterConfig.filterId || null,
                filterCriteria: filterConfig,
                sourceZipcodes: zipcodes,
                totalRecords: 0,
                sessionType: 'batch_python_processing'
            };

            const session = await ProcessingSession.create(sessionData);
            console.log(`📊 Created batch processing session: ${sessionId}`);

            let totalProcessedRecords = 0;
            let completedJobs = 0;
            let failedJobs = 0;

            for (let i = 0; i < zipcodes.length; i++) {
                const zipcode = zipcodes[i];
                console.log(`🔄 Processing zipcode ${i + 1}/${zipcodes.length}: ${zipcode}`);

                try {
                    // Process single zipcode
                    const result = await this.processMissing(zipcode, filterConfig, userId);
                    
                    if (result.status === 'completed') {
                        completedJobs++;
                        totalProcessedRecords += result.rowCount || 0;
                        console.log(`✅ Completed zipcode ${zipcode}: ${result.rowCount} records`);
                    } else if (result.status === 'already_processed') {
                        completedJobs++;
                        console.log(`✅ Already processed zipcode ${zipcode}`);
                    } else {
                        failedJobs++;
                        console.log(`❌ Failed zipcode ${zipcode}: ${result.message}`);
                    }

                    results.push({
                        zipcode,
                        ...result
                    });

                } catch (error) {
                    failedJobs++;
                    console.error(`❌ Error processing zipcode ${zipcode}:`, error);
                    results.push({
                        zipcode,
                        status: 'error',
                        message: error.message
                    });
                }

                // Add 10-second delay between jobs (except for the last one)
                if (i < zipcodes.length - 1) {
                    console.log(`⏳ Waiting 10 seconds before next job...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }

            // Update batch session status
            const finalStatus = failedJobs === 0 ? 'completed' : (completedJobs === 0 ? 'failed' : 'completed_with_errors');
            await ProcessingSession.updateStatus(sessionId, finalStatus, {
                processedRecords: totalProcessedRecords
            });

            console.log(`📊 Batch processing completed: ${completedJobs} successful, ${failedJobs} failed`);
            
            return {
                status: 'completed',
                sessionId,
                results,
                summary: {
                    total: zipcodes.length,
                    completed: completedJobs,
                    failed: failedJobs,
                    totalRecords: totalProcessedRecords
                }
            };

        } catch (error) {
            console.error('❌ Error in batch processing:', error);
            return {
                status: 'error',
                message: error.message
            };
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
