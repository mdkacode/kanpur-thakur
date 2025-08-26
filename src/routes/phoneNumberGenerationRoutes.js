const express = require('express');
const router = express.Router();
const PhoneNumberGenerationController = require('../controllers/phoneNumberGenerationController');

// POST /phone-generations - Generate phone numbers and create CSV
router.post('/', PhoneNumberGenerationController.generatePhoneNumbers);

// GET /phone-generations - Get all phone number generations with filtering
router.get('/', PhoneNumberGenerationController.getAllGenerations);

// GET /phone-generations/stats - Get statistics
router.get('/stats', PhoneNumberGenerationController.getStats);

// GET /phone-generations/unique/:field - Get unique values for a field
router.get('/unique/:field', PhoneNumberGenerationController.getUniqueValues);

// GET /phone-generations/:id - Get generation by ID
router.get('/:id', PhoneNumberGenerationController.getGenerationById);

// GET /phone-generations/:id/download - Download CSV file
router.get('/:id/download', PhoneNumberGenerationController.downloadCSV);

// GET /phone-generations/:id/downloads - Get download history
router.get('/:id/downloads', PhoneNumberGenerationController.getDownloadHistory);

// DELETE /phone-generations/:id - Delete generation
router.delete('/:id', PhoneNumberGenerationController.deleteGeneration);

module.exports = router;
