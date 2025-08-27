const pythonProcessor = require('../services/pythonProcessor');
const ProcessingSession = require('../models/ProcessingSession');
const { v4: uuidv4 } = require('uuid');

class PythonProcessorController {
    /**
     * Process missing Python script
     */
    static async processMissing(req, res) {
        try {
            const { zipcode, filter_config = {}, userId = 1 } = req.body;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`🔧 Processing request for zipcode: ${zipcode}`);

            // Create processing session
            const sessionId = `npa_nxx_${uuidv4()}`;
            const sessionData = {
                sessionId,
                userId: parseInt(userId),
                filterId: filter_config.filterId || null,
                filterCriteria: filter_config,
                sourceZipcodes: Array.isArray(zipcode) ? zipcode : [zipcode],
                totalRecords: 0, // Will be updated after processing
                sessionType: 'npa_nxx_processing'
            };

            const session = await ProcessingSession.create(sessionData);
            console.log(`📊 Created processing session: ${sessionId}`);

            // Check if we're processing multiple zipcodes
            const zipcodes = Array.isArray(zipcode) ? zipcode : [zipcode];
            
            let result;
            if (zipcodes.length > 1) {
                // Use batch processing with 10-second delays
                result = await pythonProcessor.processMultipleZipcodes(zipcodes, filter_config, userId);
            } else {
                // Use single zipcode processing
                result = await pythonProcessor.processMissing(zipcodes[0], filter_config, userId);
            }

            switch (result.status) {
                case 'already_processed':
                    res.json({
                        success: true,
                        status: 'already_processed',
                        message: result.message
                    });
                    break;

                case 'completed':
                    // For batch processing, the session is already updated by the processor
                    if (result.summary) {
                        // This is a batch processing result
                        res.json({
                            success: true,
                            status: 'completed',
                            sessionId: result.sessionId,
                            message: `Batch processing completed: ${result.summary.completed}/${result.summary.total} successful`,
                            summary: result.summary,
                            results: result.results
                        });
                    } else {
                        // This is a single processing result
                        res.json({
                            success: true,
                            status: 'completed',
                            sessionId: result.sessionId,
                            jobId: result.jobId,
                            message: result.message,
                            rowCount: result.rowCount
                        });
                    }
                    break;

                case 'error':
                    // Update session with error
                    await ProcessingSession.updateStatus(sessionId, 'failed', {
                        errorMessage: result.message
                    });

                    res.status(500).json({
                        success: false,
                        status: 'error',
                        sessionId,
                        message: result.message
                    });
                    break;

                default:
                    res.status(500).json({
                        success: false,
                        status: 'unknown',
                        message: 'Unknown processing status'
                    });
            }

        } catch (error) {
            console.error('Error in processMissing:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing Python script',
                error: error.message
            });
        }
    }

    /**
     * Get processing status
     */
    static async getProcessingStatus(req, res) {
        try {
            const { runId } = req.params;

            if (!runId) {
                return res.status(400).json({
                    success: false,
                    message: 'Run ID is required'
                });
            }

            const status = await pythonProcessor.getProcessingStatus(runId);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Error getting processing status:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting processing status',
                error: error.message
            });
        }
    }

    /**
     * Check if output exists
     */
    static async checkOutputExists(req, res) {
        try {
            const { zipcode, runId } = req.query;

            if (!zipcode && !runId) {
                return res.status(400).json({
                    success: false,
                    message: 'Either zipcode or runId is required'
                });
            }

            const exists = await pythonProcessor.checkProcessedOutput(zipcode, runId);

            res.json({
                success: true,
                data: {
                    exists,
                    zipcode,
                    runId
                }
            });

        } catch (error) {
            console.error('Error checking output existence:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking output existence',
                error: error.message
            });
        }
    }

    /**
     * Batch process multiple zipcodes
     */
    static async batchProcess(req, res) {
        try {
            const { zipcodes, filter_config = {} } = req.body;

            if (!zipcodes || !Array.isArray(zipcodes) || zipcodes.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcodes array is required'
                });
            }

            console.log(`🔧 Batch processing ${zipcodes.length} zipcodes`);

            const results = [];
            const maxConcurrent = 3; // Limit concurrent processing
            const chunks = [];

            // Split zipcodes into chunks
            for (let i = 0; i < zipcodes.length; i += maxConcurrent) {
                chunks.push(zipcodes.slice(i, i + maxConcurrent));
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`📦 Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} zipcodes`);

                const chunkPromises = chunk.map(async (zipcode) => {
                    try {
                        const result = await pythonProcessor.processMissing(zipcode, filter_config);
                        return {
                            zipcode,
                            ...result
                        };
                    } catch (error) {
                        return {
                            zipcode,
                            status: 'error',
                            message: error.message
                        };
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);

                // Small delay between chunks to avoid overwhelming the system
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Count results
            const completed = results.filter(r => r.status === 'completed').length;
            const alreadyProcessed = results.filter(r => r.status === 'already_processed').length;
            const errors = results.filter(r => r.status === 'error').length;

            res.json({
                success: true,
                message: `Batch processing completed: ${completed} new, ${alreadyProcessed} already processed, ${errors} errors`,
                data: {
                    total: results.length,
                    completed,
                    alreadyProcessed,
                    errors,
                    results
                }
            });

        } catch (error) {
            console.error('Error in batchProcess:', error);
            res.status(500).json({
                success: false,
                message: 'Error in batch processing',
                error: error.message
            });
        }
    }
}

module.exports = PythonProcessorController;
