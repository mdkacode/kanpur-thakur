const ProcessingSession = require('../models/ProcessingSession');
const { format } = require('date-fns');

class ProcessingSessionController {
  // Get all processing sessions with pagination and filtering
  static async getAllSessions(req, res) {
    try {
      const { page = 1, limit = 20, status, sessionType, userId } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sessionType,
        userId: userId ? parseInt(userId) : null
      };

      const result = await ProcessingSession.findAll(options);
      
      res.json({
        success: true,
        sessions: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting processing sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get processing sessions',
        error: error.message
      });
    }
  }

  // Get a specific processing session with details
  static async getSessionById(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await ProcessingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Processing session not found'
        });
      }

      // Get generated files for this session
      const generatedFiles = await ProcessingSession.findGeneratedFiles(sessionId);
      
      res.json({
        success: true,
        session: {
          ...session,
          generated_files: generatedFiles
        }
      });
    } catch (error) {
      console.error('Error getting processing session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get processing session',
        error: error.message
      });
    }
  }

  // Get session statistics
  static async getSessionStats(req, res) {
    try {
      const stats = await ProcessingSession.getSessionStats();
      
      res.json({
        success: true,
        stats: {
          total_sessions: parseInt(stats.total_sessions) || 0,
          completed_sessions: parseInt(stats.completed_sessions) || 0,
          processing_sessions: parseInt(stats.processing_sessions) || 0,
          failed_sessions: parseInt(stats.failed_sessions) || 0,
          total_records_processed: parseInt(stats.total_records_processed) || 0,
          avg_records_per_session: parseFloat(stats.avg_records_per_session) || 0,
          unique_users: parseInt(stats.unique_users) || 0
        }
      });
    } catch (error) {
      console.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session statistics',
        error: error.message
      });
    }
  }

  // Create a new processing session
  static async createSession(req, res) {
    try {
      const {
        sessionId,
        userId,
        filterId,
        filterCriteria,
        sourceZipcodes,
        totalRecords,
        sessionType = 'npa_nxx_processing'
      } = req.body;

      const sessionData = {
        sessionId,
        userId: userId ? parseInt(userId) : null,
        filterId: filterId ? parseInt(filterId) : null,
        filterCriteria,
        sourceZipcodes: Array.isArray(sourceZipcodes) ? sourceZipcodes : [sourceZipcodes],
        totalRecords: parseInt(totalRecords) || 0,
        sessionType
      };

      const session = await ProcessingSession.create(sessionData);
      
      res.status(201).json({
        success: true,
        message: 'Processing session created successfully',
        session
      });
    } catch (error) {
      console.error('Error creating processing session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create processing session',
        error: error.message
      });
    }
  }

  // Add a generated file to a session
  static async addGeneratedFile(req, res) {
    try {
      const { sessionId } = req.params;
      const {
        fileName,
        filePath,
        fileType,
        fileSize,
        recordCount,
        description
      } = req.body;

      const fileData = {
        fileName,
        filePath,
        fileType,
        fileSize: parseInt(fileSize) || 0,
        recordCount: parseInt(recordCount) || 0,
        description
      };

      const file = await ProcessingSession.addGeneratedFile(sessionId, fileData);
      
      res.status(201).json({
        success: true,
        message: 'Generated file added successfully',
        file
      });
    } catch (error) {
      console.error('Error adding generated file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add generated file',
        error: error.message
      });
    }
  }

  // Update session status
  static async updateSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const { status, processedRecords, errorMessage } = req.body;

      const additionalData = {};
      if (processedRecords !== undefined) {
        additionalData.processedRecords = parseInt(processedRecords);
      }
      if (errorMessage !== undefined) {
        additionalData.errorMessage = errorMessage;
      }
      if (status === 'completed') {
        additionalData.completionTime = new Date();
      }

      const session = await ProcessingSession.updateStatus(sessionId, status, additionalData);
      
      res.json({
        success: true,
        message: 'Session status updated successfully',
        session
      });
    } catch (error) {
      console.error('Error updating session status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session status',
        error: error.message
      });
    }
  }

  // Get recent processing activity
  static async getRecentActivity(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const options = {
        page: 1,
        limit: parseInt(limit),
        status: 'completed'
      };

      const result = await ProcessingSession.findAll(options);
      
      // Format the activity data
      const activity = result.records.map(session => ({
        id: session.session_id,
        type: session.session_type,
        filter_name: session.filter_name || 'Custom Filter',
        total_records: session.total_records,
        processed_records: session.processed_records,
        generated_files_count: parseInt(session.generated_files_count) || 0,
        status: session.status,
        created_at: session.created_at,
        completed_at: session.completed_at,
        duration: session.completed_at ? 
          Math.round((new Date(session.completed_at) - new Date(session.created_at)) / 1000) : null
      }));

      res.json({
        success: true,
        activity
      });
    } catch (error) {
      console.error('Error getting recent activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent activity',
        error: error.message
      });
    }
  }
}

module.exports = ProcessingSessionController;
