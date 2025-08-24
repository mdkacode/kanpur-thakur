const express = require('express');
const router = express.Router();
const FilterController = require('../controllers/filterController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth.verifyToken);

// Create a new filter
router.post('/', FilterController.createFilter);

// Get all filters for the current user
router.get('/', FilterController.getUserFilters);

// Get a specific filter by ID
router.get('/:id', FilterController.getFilterById);

// Update a filter
router.put('/:id', FilterController.updateFilter);

// Delete a filter (soft delete)
router.delete('/:id', FilterController.deleteFilter);

// Apply a saved filter to get filtered data
router.get('/:id/apply', FilterController.applyFilter);

module.exports = router;
