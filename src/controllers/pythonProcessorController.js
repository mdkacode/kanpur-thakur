const pythonProcessor = require('../services/pythonProcessor');

class PythonProcessorController {
    /**
     * Process missing Python script
     */
    static async processMissing(req, res) {
        try {
            const { zipcode, filter_config = {} } = req.body;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`🔧 Processing request for zipcode: ${zipcode}`);

            const result = await pythonProcessor.processMissing(zipcode, filter_config);

            switch (result.status) {
                case 'already_processed':
                    res.json({
                        success: true,
                        status: 'already_processed',
                        message: result.message
                    });
                    break;

                case 'completed':
                    res.json({
                        success: true,
                        status: 'completed',
                        jobId: result.jobId,
                        message: result.message,
                        rowCount: result.rowCount
                    });
                    break;

                case 'error':
                    res.status(500).json({
                        success: false,
                        status: 'error',
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
