const express = require('express');
const multer = require('multer');
const path = require('path');
const OptimizedUploadController = require('../controllers/optimizedUploadController');

const router = express.Router();
const controller = new OptimizedUploadController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow only CSV files
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Upload demographic file with optimization
router.post('/demographic', upload.single('file'), async (req, res) => {
  try {
    await controller.uploadDemographicFile(req, res);
  } catch (error) {
    console.error('❌ Upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Get upload status
router.get('/status/:uploadId', async (req, res) => {
  try {
    await controller.getUploadStatus(req, res);
  } catch (error) {
    console.error('❌ Get status route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
});

// Get all uploads
router.get('/uploads', async (req, res) => {
  try {
    await controller.getAllUploads(req, res);
  } catch (error) {
    console.error('❌ Get uploads route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get uploads',
      error: error.message
    });
  }
});

// Cancel upload
router.post('/cancel/:uploadId', async (req, res) => {
  try {
    await controller.cancelUpload(req, res);
  } catch (error) {
    console.error('❌ Cancel upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel upload',
      error: error.message
    });
  }
});

// Retry failed upload
router.post('/retry/:uploadId', async (req, res) => {
  try {
    await controller.retryUpload(req, res);
  } catch (error) {
    console.error('❌ Retry upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry upload',
      error: error.message
    });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    await controller.getSystemHealth(req, res);
  } catch (error) {
    console.error('❌ Health check route error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Manual database optimization
router.post('/optimize-database', async (req, res) => {
  try {
    await controller.optimizeDatabase(req, res);
  } catch (error) {
    console.error('❌ Database optimization route error:', error);
    res.status(500).json({
      success: false,
      message: 'Database optimization failed',
      error: error.message
    });
  }
});

// Graceful shutdown
router.post('/shutdown', async (req, res) => {
  try {
    await controller.shutdown(req, res);
  } catch (error) {
    console.error('❌ Shutdown route error:', error);
    res.status(500).json({
      success: false,
      message: 'Shutdown failed',
      error: error.message
    });
  }
});

module.exports = router;
