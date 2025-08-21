const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { upload, handleUploadError } = require('../middleware/upload');

// Upload file
router.post('/upload', upload, handleUploadError, uploadController.uploadFile);

// Get upload status
router.get('/status/:id', uploadController.getUploadStatus);

// Get all uploads
router.get('/uploads', uploadController.getAllUploads);

// Get upload stats
router.get('/upload-stats', uploadController.getUploadStats);

// Delete upload
router.delete('/uploads/:id', uploadController.deleteUpload);

module.exports = router;
