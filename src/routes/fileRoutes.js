const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Get file statistics for a specific date
router.get('/files/stats', fileController.getFileStats);

// Get upload directory statistics
router.get('/files/directory-stats', fileController.getUploadDirStats);

// Get file statistics for a date range
router.get('/files/range-stats', fileController.getDateRangeStats);

// Clean up old files
router.post('/files/cleanup', fileController.cleanupOldFiles);

module.exports = router;
