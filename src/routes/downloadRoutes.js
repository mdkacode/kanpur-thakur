const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const { verifyToken } = require('../middleware/auth');

// Export filtered data to CSV
router.post('/export-csv', verifyToken, downloadController.exportToCSV);

// Get download tracking statistics
router.get('/stats', verifyToken, downloadController.getDownloadStats);

// Get all download history
router.get('/history', verifyToken, downloadController.getAllDownloads);

// Get most downloaded filters
router.get('/popular', verifyToken, downloadController.getMostDownloadedFilters);

// Delete download tracking entry
router.delete('/history/:id', verifyToken, downloadController.deleteDownload);

module.exports = router;
