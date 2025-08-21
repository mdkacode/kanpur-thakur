const fs = require('fs');
const path = require('path');

class FileUtils {
  /**
   * Get the date-based folder path for uploads
   * @param {Date} date - The date to create folder for (defaults to current date)
   * @returns {string} The folder path in format YYYY/MM/DD
   */
  static getDateFolder(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return path.join(year.toString(), month, day);
  }

  /**
   * Get the full upload path for a specific date
   * @param {Date} date - The date to get path for (defaults to current date)
   * @returns {string} The full path including upload directory
   */
  static getUploadPath(date = new Date()) {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const dateFolder = this.getDateFolder(date);
    return path.join(uploadDir, dateFolder);
  }

  /**
   * Ensure the upload directory exists
   * @param {string} uploadPath - The path to ensure exists
   */
  static ensureUploadDir(uploadPath) {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  }

  /**
   * Generate a unique filename with timestamp
   * @param {string} originalName - The original filename
   * @returns {string} A unique filename
   */
  static generateUniqueFilename(originalName) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    return `upload-${uniqueSuffix}${ext}`;
  }

  /**
   * Get file statistics for a specific date
   * @param {Date} date - The date to get stats for
   * @returns {Object} File statistics
   */
  static getFileStats(date = new Date()) {
    const uploadPath = this.getUploadPath(date);
    
    if (!fs.existsSync(uploadPath)) {
      return {
        fileCount: 0,
        totalSize: 0,
        files: []
      };
    }

    const files = fs.readdirSync(uploadPath);
    let totalSize = 0;
    const fileStats = [];

    files.forEach(file => {
      const filePath = path.join(uploadPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
        fileStats.push({
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    });

    return {
      fileCount: fileStats.length,
      totalSize,
      files: fileStats
    };
  }

  /**
   * Clean up old files based on retention policy
   * @param {number} daysToKeep - Number of days to keep files (default: 30)
   * @returns {Object} Cleanup statistics
   */
  static cleanupOldFiles(daysToKeep = 30) {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedFiles = 0;
    let deletedSize = 0;

    if (!fs.existsSync(uploadDir)) {
      return { deletedFiles, deletedSize };
    }

    const years = fs.readdirSync(uploadDir);
    
    years.forEach(year => {
      const yearPath = path.join(uploadDir, year);
      if (!fs.statSync(yearPath).isDirectory()) return;

      const months = fs.readdirSync(yearPath);
      
      months.forEach(month => {
        const monthPath = path.join(yearPath, month);
        if (!fs.statSync(monthPath).isDirectory()) return;

        const days = fs.readdirSync(monthPath);
        
        days.forEach(day => {
          const dayPath = path.join(monthPath, day);
          if (!fs.statSync(dayPath).isDirectory()) return;

          const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (folderDate < cutoffDate) {
            const files = fs.readdirSync(dayPath);
            
            files.forEach(file => {
              const filePath = path.join(dayPath, file);
              const stats = fs.statSync(filePath);
              
              if (stats.isFile()) {
                fs.unlinkSync(filePath);
                deletedFiles++;
                deletedSize += stats.size;
              }
            });

            // Remove empty directory
            fs.rmdirSync(dayPath);
          }
        });
      });
    });

    return { deletedFiles, deletedSize };
  }

  /**
   * Get upload directory size
   * @returns {number} Total size in bytes
   */
  static getUploadDirSize() {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    
    if (!fs.existsSync(uploadDir)) {
      return 0;
    }

    let totalSize = 0;

    const calculateSize = (dirPath) => {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          calculateSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      });
    };

    calculateSize(uploadDir);
    return totalSize;
  }
}

module.exports = FileUtils;
