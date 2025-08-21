const FileUpload = require('../models/FileUpload');
const fileProcessor = require('../services/fileProcessor');
const path = require('path');

class UploadController {
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Create upload record
      const uploadData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path // Store the full path for reference
      };

      const upload = await FileUpload.create(uploadData);

      // Process file in background (non-blocking)
      // Using a separate function to avoid 'this' context issues
      const processFileAsync = async () => {
        try {
          await UploadController.processFileInBackground(req.file.path, upload.id);
        } catch (error) {
          console.error('Background processing error:', error);
        }
      };
      
      // Start processing in the next tick
      process.nextTick(processFileAsync);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully and processing started',
        data: {
          uploadId: upload.id,
          filename: upload.original_name,
          fileSize: upload.file_size,
          status: upload.status
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading file',
        error: error.message
      });
    }
  }

  static async processFileInBackground(filePath, uploadId) {
    try {
      console.log(`Starting background processing for upload ${uploadId}`);
      
      const result = await fileProcessor.processFile(filePath, uploadId);
      
      if (result.success) {
        console.log(`Successfully processed upload ${uploadId}: ${result.totalProcessed} records`);
      } else {
        console.error(`Failed to process upload ${uploadId}: ${result.message}`);
      }

      // Clean up the uploaded file
      await fileProcessor.cleanupFile(filePath);

    } catch (error) {
      console.error(`Error in background processing for upload ${uploadId}:`, error);
      
      // Update upload status to failed
      try {
        await FileUpload.updateStatus(uploadId, 'failed', 0, error.message);
      } catch (updateError) {
        console.error('Error updating upload status:', updateError);
      }

      // Clean up the uploaded file
      await fileProcessor.cleanupFile(filePath);
    }
  }

  async getUploadStatus(req, res) {
    try {
      const { id } = req.params;
      const upload = await FileUpload.findById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      res.json({
        success: true,
        data: upload
      });

    } catch (error) {
      console.error('Get upload status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload status',
        error: error.message
      });
    }
  }

  async getAllUploads(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit), status };
      
      const result = await FileUpload.findAll(options);

      res.json({
        success: true,
        data: result.uploads,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get all uploads error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting uploads',
        error: error.message
      });
    }
  }

  async getUploadStats(req, res) {
    try {
      const stats = await FileUpload.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get upload stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload stats',
        error: error.message
      });
    }
  }

  async deleteUpload(req, res) {
    try {
      const { id } = req.params;
      const upload = await FileUpload.deleteById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      res.json({
        success: true,
        message: 'Upload deleted successfully',
        data: upload
      });

    } catch (error) {
      console.error('Delete upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting upload',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();
