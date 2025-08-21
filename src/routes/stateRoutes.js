const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');

// Get all states with pagination and filtering
router.get('/states', stateController.getAllStates);

// Get state by ID
router.get('/states/:id', stateController.getStateById);

// Get state by code
router.get('/states/code/:code', stateController.getStateByCode);

// Get states by region
router.get('/states/region/:region', stateController.getStatesByRegion);

// Get all regions
router.get('/regions', stateController.getRegions);

// Search states
router.get('/states/search', stateController.searchStates);

// Get state statistics
router.get('/states/stats', stateController.getStats);

// Create new state
router.post('/states', stateController.createState);

// Update state
router.put('/states/:id', stateController.updateState);

// Delete state
router.delete('/states/:id', stateController.deleteState);

module.exports = router;
