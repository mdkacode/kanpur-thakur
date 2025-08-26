const express = require('express');
const PhoneNumberController = require('../controllers/phoneNumberController');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth.verifyToken);

// Phone number generation endpoints
router.post('/generate/telecare/:run_id', PhoneNumberController.generateFromTelecareOutput);
router.post('/generate/filter/:filter_id', PhoneNumberController.generateForFilter);
router.post('/generate/filter-batch/:filter_id', PhoneNumberController.generateForFilterBatch);
router.post('/generate/npa-nxx', PhoneNumberController.generateFromNpaNxxRecords);
router.post('/generate/csv', PhoneNumberController.generateFromCSV);

// Status and monitoring endpoints
router.get('/status/:job_id', PhoneNumberController.getGenerationStatus);
router.get('/jobs/run/:run_id', PhoneNumberController.getJobsForRun);
router.get('/jobs/zip/:zip', PhoneNumberController.getJobsForZip);

// Data retrieval endpoints
router.get('/numbers/job/:job_id', PhoneNumberController.getPhoneNumbersForJob);
router.get('/numbers/run/:run_id', PhoneNumberController.getPhoneNumbersForRun);
router.get('/numbers/zip/:zip', PhoneNumberController.getPhoneNumbersForZip);
router.get('/numbers/filter/:filter_id', PhoneNumberController.getPhoneNumbersForFilter);

// Export and management endpoints
router.get('/export/csv/:job_id', PhoneNumberController.exportToCSV);
router.get('/export/filter/:filter_id', PhoneNumberController.exportFilterToCSV);
router.get('/stats', PhoneNumberController.getStats);

// Dashboard endpoints
router.get('/dashboard/filters', PhoneNumberController.getFilterDashboard);

// Delete endpoints
router.delete('/numbers/job/:job_id', PhoneNumberController.deletePhoneNumbersForJob);
router.delete('/numbers/run/:run_id', PhoneNumberController.deletePhoneNumbersForRun);

module.exports = router;
