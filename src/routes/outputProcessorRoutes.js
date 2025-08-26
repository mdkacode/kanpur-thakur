const express = require('express');
const router = express.Router();
const OutputProcessorController = require('../controllers/outputProcessorController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth.verifyToken);

// Load files and generate phone numbers
router.post('/load-files', OutputProcessorController.loadFilesAndGeneratePhoneNumbers);

// Download phone numbers CSV
router.get('/download-csv', OutputProcessorController.downloadPhoneNumbersCSV);

// Generate downloadable CSV file
router.post('/generate-csv', OutputProcessorController.generateDownloadableCSV);

// Get phone numbers summary
router.get('/summary', OutputProcessorController.getPhoneNumbersSummary);

// Batch process multiple zipcodes
router.post('/batch-process', OutputProcessorController.batchProcessZipcodes);

module.exports = router;
