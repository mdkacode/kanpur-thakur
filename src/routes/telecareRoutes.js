const express = require('express');
const router = express.Router();
const TelecareController = require('../controllers/telecareController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth.verifyToken);

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Telecare routes are working!' });
});

// Process telecare data for a zipcode
router.post('/process/:zipcode', TelecareController.processZipcode);

// Get processing status for a run
router.get('/status/:run_id', TelecareController.getProcessingStatus);

// Get telecare runs for a zipcode
router.get('/runs/:zipcode', TelecareController.getRunsByZip);

// Get output rows for a run
router.get('/output/:run_id', TelecareController.getOutputRows);

// Get telecare statistics
router.get('/stats', TelecareController.getStats);

// Download input CSV for a run
router.get('/download/input/:run_id', TelecareController.downloadInputCSV);

// Download output CSV for a run
router.get('/download/output/:run_id', TelecareController.downloadOutputCSV);

// Get latest run for a zipcode
router.get('/latest/:zipcode', TelecareController.getLatestRun);

// Get file structure for a specific run
router.get('/files/:run_id', TelecareController.getRunFileStructure);

// List files by date
router.get('/files/date/:date', TelecareController.listFilesByDate);

// Get file content for viewing
router.get('/files/:run_id/:file_type/content', TelecareController.getFileContent);

module.exports = router;
