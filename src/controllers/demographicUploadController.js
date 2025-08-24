const FileUpload = require('../models/FileUpload');
const demographicFileProcessor = require('../services/demographicFileProcessor');
const path = require('path');

class DemographicUploadController {
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate file type
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      if (fileExtension !== '.csv') {
        return res.status(400).json({
          success: false,
          message: 'Only CSV files are supported for demographic data uploads'
        });
      }

      // Create upload record
      const uploadData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path,
        fileType: 'demographic' // Add file type identifier
      };

      const upload = await FileUpload.create(uploadData);

      // Process file in background (non-blocking)
      const processFileAsync = async () => {
        try {
          await DemographicUploadController.processFileInBackground(req.file.path, upload.id);
        } catch (error) {
          console.error('Background processing error:', error);
        }
      };
      
      // Start processing in the next tick
      process.nextTick(processFileAsync);

      res.status(201).json({
        success: true,
        message: 'Demographic file uploaded successfully and processing started',
        data: {
          uploadId: upload.id,
          filename: upload.original_name,
          fileSize: upload.file_size,
          status: upload.status,
          fileType: 'demographic'
        }
      });

    } catch (error) {
      console.error('Demographic upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading demographic file',
        error: error.message
      });
    }
  }

  static async processFileInBackground(filePath, uploadId) {
    try {
      console.log(`Starting background processing for demographic upload ${uploadId}`);
      
      const result = await demographicFileProcessor.processFile(filePath, uploadId);
      
      if (result.success) {
        console.log(`Successfully processed demographic upload ${uploadId}: ${result.totalProcessed} records`);
      } else {
        console.error(`Failed to process demographic upload ${uploadId}: ${result.message}`);
      }

      // Clean up the uploaded file
      await demographicFileProcessor.cleanupFile(filePath);

    } catch (error) {
      console.error(`Error in background processing for demographic upload ${uploadId}:`, error);
      
      // Update upload status to failed
      try {
        await FileUpload.updateStatus(uploadId, 'failed', 0, error.message);
      } catch (updateError) {
        console.error('Error updating upload status:', updateError);
      }

      // Clean up the uploaded file
      await demographicFileProcessor.cleanupFile(filePath);
    }
  }

  static async getUploadStatus(req, res) {
    try {
      const { id } = req.params;
      const upload = await FileUpload.findById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Demographic upload not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: upload.id,
          filename: upload.original_name,
          fileSize: upload.file_size,
          status: upload.status,
          recordsCount: upload.records_count,
          errorMessage: upload.error_message,
          createdAt: upload.created_at,
          completedAt: upload.completed_at,
          fileType: 'demographic'
        }
      });

    } catch (error) {
      console.error('Error getting demographic upload status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload status'
      });
    }
  }

  static async getAllUploads(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      
      const options = {
        page: pageNum,
        limit: limitNum,
        filters: {}
      };

      if (status) {
        options.filters.status = status;
      }

      // Add file type filter for demographic files
      options.filters.fileType = 'demographic';

      const uploads = await FileUpload.findAll(options);
      
      res.json({
        success: true,
        data: uploads.records.map(upload => ({
          id: upload.id,
          filename: upload.original_name,
          fileSize: upload.file_size,
          status: upload.status,
          recordsCount: upload.records_count,
          errorMessage: upload.error_message,
          createdAt: upload.created_at,
          completedAt: upload.completed_at,
          fileType: 'demographic'
        })),
        pagination: uploads.pagination
      });

    } catch (error) {
      console.error('Error getting demographic uploads:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting uploads'
      });
    }
  }

  static async deleteUpload(req, res) {
    try {
      const { id } = req.params;
      const upload = await FileUpload.findById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Demographic upload not found'
        });
      }

      // Delete the upload record
      await FileUpload.delete(id);

      res.json({
        success: true,
        message: 'Demographic upload deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting demographic upload:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting upload'
      });
    }
  }

  static async getUploadStats(req, res) {
    try {
      const stats = await FileUpload.getStatsByType('demographic');
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting demographic upload stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload statistics'
      });
    }
  }
}

module.exports = DemographicUploadController;
