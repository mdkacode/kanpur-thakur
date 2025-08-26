const express = require('express');
const router = express.Router();
const TimezoneController = require('../controllers/timezoneController');

// GET /timezones - Get all timezones
router.get('/', TimezoneController.getAllTimezones);

// GET /timezones/options - Get timezone options for dropdowns
router.get('/options', TimezoneController.getTimezoneOptions);

// GET /timezones/:id - Get timezone by ID
router.get('/:id', TimezoneController.getTimezoneById);

// GET /timezones/state/:state - Get timezones by state
router.get('/state/:state', TimezoneController.getTimezonesByState);

// GET /timezones/:id/current-time - Get current time in timezone
router.get('/:id/current-time', TimezoneController.getCurrentTimeInTimezone);

// POST /timezones - Create new timezone
router.post('/', TimezoneController.createTimezone);

// PUT /timezones/:id - Update timezone
router.put('/:id', TimezoneController.updateTimezone);

// DELETE /timezones/:id - Delete timezone
router.delete('/:id', TimezoneController.deleteTimezone);

module.exports = router;
