const express = require('express');
const multer = require('multer');
const path = require('path');
const DemographicUploadController = require('../controllers/demographicUploadController');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'demographic-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for demographic data uploads'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(auth.verifyToken);

// Upload demographic file
router.post('/upload', upload.single('file'), DemographicUploadController.uploadFile);

// Get upload status
router.get('/status/:id', DemographicUploadController.getUploadStatus);

// Get all demographic uploads
router.get('/uploads', DemographicUploadController.getAllUploads);

// Delete upload
router.delete('/uploads/:id', DemographicUploadController.deleteUpload);

// Get upload statistics
router.get('/stats', DemographicUploadController.getUploadStats);

module.exports = router;
