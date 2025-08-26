const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Get all records with pagination and search
router.get('/records', recordController.getAllRecords);

// Get record by ID
router.get('/records/:id', recordController.getRecordById);

// Search records
router.get('/search', recordController.searchRecords);

// Get records by NPA/NXX
router.get('/records/npa/:npa/nxx/:nxx', recordController.getRecordsByNpaNxx);

// Get records by ZIP code
router.get('/records/zip/:zip', recordController.getRecordsByZip);

// Get records by state
router.get('/records/state/:state', recordController.getRecordsByState);

// Get statistics
router.get('/stats', recordController.getStats);

// Get unique values for a field (for filter dropdowns)
router.get('/records/unique/:field', recordController.getUniqueValues);

// Delete record
router.delete('/records/:id', recordController.deleteRecord);

// Delete all records (use with caution)
router.delete('/records', recordController.deleteAllRecords);

module.exports = router;
