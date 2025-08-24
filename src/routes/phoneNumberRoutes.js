const express = require('express');
const PhoneNumberController = require('../controllers/phoneNumberController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth.verifyToken);

// Phone number generation endpoints
router.post('/generate/telecare/:run_id', PhoneNumberController.generateFromTelecareOutput);
router.post('/generate/filter/:filter_id', PhoneNumberController.generateForFilter);
router.post('/generate/csv', PhoneNumberController.generateFromCSV);

// Status and monitoring endpoints
router.get('/status/:job_id', PhoneNumberController.getGenerationStatus);
router.get('/jobs/run/:run_id', PhoneNumberController.getJobsForRun);
router.get('/jobs/zip/:zip', PhoneNumberController.getJobsForZip);

// Data retrieval endpoints
router.get('/numbers/job/:job_id', PhoneNumberController.getPhoneNumbersForJob);
router.get('/numbers/run/:run_id', PhoneNumberController.getPhoneNumbersForRun);
router.get('/numbers/zip/:zip', PhoneNumberController.getPhoneNumbersForZip);

// Export and management endpoints
router.get('/export/csv/:job_id', PhoneNumberController.exportToCSV);
router.get('/stats', PhoneNumberController.getStats);

// Delete endpoints
router.delete('/numbers/job/:job_id', PhoneNumberController.deletePhoneNumbersForJob);
router.delete('/numbers/run/:run_id', PhoneNumberController.deletePhoneNumbersForRun);

module.exports = router;
