const express = require('express');
const DemographicRecordController = require('../controllers/demographicRecordController');
const auth = require('../middleware/auth');

const router = express.Router();

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log('🔍 DemographicRecordRoutes - Request:', req.method, req.originalUrl, 'Path:', req.path);
  next();
});

// Apply authentication middleware to all routes
router.use(auth.verifyToken);

// Get all demographic records with pagination and filters
router.get('/', (req, res, next) => {
  console.log('✅ Root route / matched for:', req.originalUrl);
  DemographicRecordController.getAllRecords(req, res, next);
});

// Get overall statistics (must come before /:id)
router.get('/stats/overview', DemographicRecordController.getStats);

// Search demographic records (must come before /:id)
router.get('/search/query', DemographicRecordController.searchRecords);

// Get list of all states (must come before /:id and /states/:state)
router.get('/states/list', DemographicRecordController.getStates);

// Get counties by state (must come before /:id but after /states/list)
router.get('/states/:state/counties', DemographicRecordController.getCountiesByState);

// Get unique values for a specific field (for dropdowns)
router.get('/unique/:field', DemographicRecordController.getUniqueValues);

// Get all filter options (ranges, unique values, etc.)
router.get('/filter-options', DemographicRecordController.getFilterOptions);

// Get demographic record by zipcode (must come before /:id)
router.get('/zipcode/:zipcode', DemographicRecordController.getRecordByZipcode);

// Get demographic record by ID (must come after all specific paths)
router.get('/:id', (req, res, next) => {
  console.log('⚠️ Generic :id route matched for:', req.originalUrl, 'ID:', req.params.id);
  DemographicRecordController.getRecordById(req, res, next);
});

// Create new demographic record
router.post('/', DemographicRecordController.createRecord);

// Update demographic record
router.put('/:id', DemographicRecordController.updateRecord);

// Delete demographic record
router.delete('/:id', DemographicRecordController.deleteRecord);

module.exports = router;
