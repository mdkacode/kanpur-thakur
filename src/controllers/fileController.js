const FileUtils = require('../utils/fileUtils');

class FileController {
  async getFileStats(req, res) {
    try {
      const { date } = req.query;
      let targetDate = new Date();
      
      if (date) {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use YYYY-MM-DD'
          });
        }
      }

      const stats = FileUtils.getFileStats(targetDate);
      
      res.json({
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          ...stats
        }
      });

    } catch (error) {
      console.error('Error getting file stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting file statistics'
      });
    }
  }

  async getUploadDirStats(req, res) {
    try {
      const totalSize = FileUtils.getUploadDirSize();
      
      res.json({
        success: true,
        data: {
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2)
        }
      });

    } catch (error) {
      console.error('Error getting upload directory stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload directory statistics'
      });
    }
  }

  async cleanupOldFiles(req, res) {
    try {
      const { daysToKeep = 30 } = req.body;
      
      if (daysToKeep < 1) {
        return res.status(400).json({
          success: false,
          message: 'Days to keep must be at least 1'
        });
      }

      const result = FileUtils.cleanupOldFiles(daysToKeep);
      
      res.json({
        success: true,
        message: `Cleanup completed. Deleted ${result.deletedFiles} files (${(result.deletedSize / (1024 * 1024)).toFixed(2)} MB)`,
        data: {
          deletedFiles: result.deletedFiles,
          deletedSize: result.deletedSize,
          deletedSizeMB: (result.deletedSize / (1024 * 1024)).toFixed(2)
        }
      });

    } catch (error) {
      console.error('Error cleaning up old files:', error);
      res.status(500).json({
        success: false,
        message: 'Error cleaning up old files'
      });
    }
  }

  async getDateRangeStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required (YYYY-MM-DD format)'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date'
        });
      }

      const stats = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayStats = FileUtils.getFileStats(currentDate);
        stats.push({
          date: currentDate.toISOString().split('T')[0],
          ...dayStats
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalFiles = stats.reduce((sum, day) => sum + day.fileCount, 0);
      const totalSize = stats.reduce((sum, day) => sum + day.totalSize, 0);

      res.json({
        success: true,
        data: {
          startDate,
          endDate,
          totalFiles,
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          dailyStats: stats
        }
      });

    } catch (error) {
      console.error('Error getting date range stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting date range statistics'
      });
    }
  }
}

module.exports = new FileController();
