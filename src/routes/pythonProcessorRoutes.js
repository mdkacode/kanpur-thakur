const express = require('express');
const router = express.Router();
const PythonProcessorController = require('../controllers/pythonProcessorController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth.verifyToken);

// Process missing Python script for a single zipcode
router.post('/process', PythonProcessorController.processMissing);

// Process multiple zipcodes in batch
router.post('/batch-process', PythonProcessorController.batchProcess);

// Get processing status for a specific run
router.get('/status/:runId', PythonProcessorController.getProcessingStatus);

// Check if output exists for a zipcode or run
router.get('/check-output', PythonProcessorController.checkOutputExists);

module.exports = router;
