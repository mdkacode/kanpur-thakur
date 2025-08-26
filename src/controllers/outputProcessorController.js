const outputProcessor = require('../services/outputProcessor');

class OutputProcessorController {
    /**
     * Load files and generate phone numbers
     */
    static async loadFilesAndGeneratePhoneNumbers(req, res) {
        try {
            const { zipcode, filter_config = {}, save_to_db = true } = req.body;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`📁 Loading files and generating phone numbers for zipcode: ${zipcode}`);

            // Load files and generate phone numbers
            const result = await outputProcessor.loadFilesAndGeneratePhoneNumbers(zipcode, filter_config);

            if (!result.success) {
                throw new Error(result.message || 'Failed to load files and generate phone numbers');
            }

            let saveResult = null;
            if (save_to_db && result.phoneNumbers.length > 0) {
                // Save phone numbers to database
                saveResult = await outputProcessor.savePhoneNumbersToDatabase(
                    result.phoneNumbers, 
                    zipcode, 
                    filter_config
                );
            }

            res.json({
                success: true,
                message: 'Files loaded and phone numbers generated successfully',
                data: {
                    runId: result.runId,
                    outputRowCount: result.outputRowCount,
                    phoneNumberCount: result.phoneNumbers.length,
                    savedToDatabase: saveResult ? saveResult.success : false,
                    savedCount: saveResult ? saveResult.savedCount : 0,
                    jobId: saveResult ? saveResult.jobId : null
                }
            });

        } catch (error) {
            console.error('Error in loadFilesAndGeneratePhoneNumbers:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading files and generating phone numbers',
                error: error.message
            });
        }
    }

    /**
     * Download phone numbers CSV
     */
    static async downloadPhoneNumbersCSV(req, res) {
        try {
            const { zipcode, filter_config = {} } = req.query;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`📥 Downloading phone numbers CSV for zipcode: ${zipcode}`);

            // Stream the CSV response
            await outputProcessor.streamPhoneNumbersCSV(res, zipcode, filter_config);

        } catch (error) {
            console.error('Error in downloadPhoneNumbersCSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error downloading phone numbers CSV',
                error: error.message
            });
        }
    }

    /**
     * Generate downloadable CSV file
     */
    static async generateDownloadableCSV(req, res) {
        try {
            const { zipcode, filter_config = {} } = req.body;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`📄 Generating downloadable CSV for zipcode: ${zipcode}`);

            // Load files and generate phone numbers
            const result = await outputProcessor.loadFilesAndGeneratePhoneNumbers(zipcode, filter_config);

            if (!result.success) {
                throw new Error(result.message || 'Failed to load files and generate phone numbers');
            }

            // Generate CSV file
            const csvResult = await outputProcessor.generateDownloadableCSV(
                result.phoneNumbers, 
                zipcode, 
                filter_config
            );

            res.json({
                success: true,
                message: 'CSV file generated successfully',
                data: {
                    filename: csvResult.filename,
                    filePath: csvResult.filePath,
                    recordCount: csvResult.recordCount,
                    downloadUrl: `/api/v1/outputs/download/${csvResult.filename}`
                }
            });

        } catch (error) {
            console.error('Error in generateDownloadableCSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating downloadable CSV',
                error: error.message
            });
        }
    }

    /**
     * Get phone numbers summary
     */
    static async getPhoneNumbersSummary(req, res) {
        try {
            const { zipcode, filter_config = {} } = req.query;

            if (!zipcode) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcode is required'
                });
            }

            console.log(`📊 Getting phone numbers summary for zipcode: ${zipcode}`);

            // Get phone numbers from database
            const phoneNumbers = await outputProcessor.getPhoneNumbersFromDatabase(zipcode, filter_config);

            // Calculate summary statistics
            const summary = {
                totalCount: phoneNumbers.length,
                uniqueNPAs: [...new Set(phoneNumbers.map(pn => pn.npa))].length,
                uniqueNXXs: [...new Set(phoneNumbers.map(pn => `${pn.npa}-${pn.nxx}`))].length,
                states: [...new Set(phoneNumbers.map(pn => pn.state_code))].filter(Boolean),
                cities: [...new Set(phoneNumbers.map(pn => pn.city))].filter(Boolean),
                timezones: [...new Set(phoneNumbers.map(pn => pn.timezone_display_name))].filter(Boolean)
            };

            res.json({
                success: true,
                data: {
                    zipcode,
                    summary,
                    samplePhoneNumbers: phoneNumbers.slice(0, 10) // First 10 for preview
                }
            });

        } catch (error) {
            console.error('Error in getPhoneNumbersSummary:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting phone numbers summary',
                error: error.message
            });
        }
    }

    /**
     * Batch process multiple zipcodes
     */
    static async batchProcessZipcodes(req, res) {
        try {
            const { zipcodes, filter_config = {}, save_to_db = true } = req.body;

            if (!zipcodes || !Array.isArray(zipcodes) || zipcodes.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Zipcodes array is required'
                });
            }

            console.log(`📦 Batch processing ${zipcodes.length} zipcodes`);

            const results = [];
            const maxConcurrent = 2; // Limit concurrent processing
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
                        const result = await outputProcessor.loadFilesAndGeneratePhoneNumbers(zipcode, filter_config);
                        
                        if (result.success && save_to_db && result.phoneNumbers.length > 0) {
                            const saveResult = await outputProcessor.savePhoneNumbersToDatabase(
                                result.phoneNumbers, 
                                zipcode, 
                                filter_config
                            );
                            return {
                                zipcode,
                                success: true,
                                outputRowCount: result.outputRowCount,
                                phoneNumberCount: result.phoneNumbers.length,
                                savedToDatabase: saveResult.success,
                                savedCount: saveResult.savedCount,
                                jobId: saveResult.jobId
                            };
                        } else {
                            return {
                                zipcode,
                                success: true,
                                outputRowCount: result.outputRowCount,
                                phoneNumberCount: result.phoneNumbers.length,
                                savedToDatabase: false,
                                savedCount: 0
                            };
                        }
                    } catch (error) {
                        return {
                            zipcode,
                            success: false,
                            error: error.message
                        };
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);

                // Small delay between chunks
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Calculate summary
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            const totalPhoneNumbers = results.reduce((sum, r) => sum + (r.phoneNumberCount || 0), 0);
            const totalSaved = results.reduce((sum, r) => sum + (r.savedCount || 0), 0);

            res.json({
                success: true,
                message: `Batch processing completed: ${successful} successful, ${failed} failed`,
                data: {
                    totalZipcodes: zipcodes.length,
                    successful,
                    failed,
                    totalPhoneNumbers,
                    totalSaved,
                    results
                }
            });

        } catch (error) {
            console.error('Error in batchProcessZipcodes:', error);
            res.status(500).json({
                success: false,
                message: 'Error in batch processing',
                error: error.message
            });
        }
    }
}

module.exports = OutputProcessorController;
