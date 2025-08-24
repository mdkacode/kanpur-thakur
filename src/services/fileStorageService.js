const fs = require('fs').promises;
const path = require('path');

class FileStorageService {
  constructor() {
    this.baseDir = path.join(__dirname, '..', '..', 'telecare_files');
    this.ensureDirectories();
  }

  // Ensure all required directories exist
  async ensureDirectories() {
    try {
      const dirs = [
        this.baseDir,
        path.join(this.baseDir, 'input'),
        path.join(this.baseDir, 'output'),
        path.join(this.baseDir, 'logs')
      ];

      for (const dir of dirs) {
        try {
          await fs.access(dir);
        } catch {
          await fs.mkdir(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        }
      }
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  // Generate organized file path structure
  generateFilePath(type, zipcode, runId, filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const datePath = path.join(year.toString(), month, day);
    const fullPath = path.join(this.baseDir, type, datePath);
    
    // Enhanced filename with queried zipcode, run ID, and original filename
    const enhancedFilename = `${zipcode}_${runId}_${filename}`;
    
    return {
      fullPath,
      datePath,
      filename: enhancedFilename,
      relativePath: path.join(type, datePath, enhancedFilename)
    };
  }

  // Store input CSV file
  async storeInputFile(zipcode, runId, csvContent, originalFilename) {
    try {
      const fileInfo = this.generateFilePath('input', zipcode, runId, originalFilename);
      
      // Ensure the date directory exists
      await fs.mkdir(fileInfo.fullPath, { recursive: true });
      
      // Write the file
      const filePath = path.join(fileInfo.fullPath, fileInfo.filename);
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      console.log(`Input file stored: ${filePath}`);
      
      return {
        success: true,
        filePath,
        relativePath: fileInfo.relativePath,
        filename: fileInfo.filename,
        size: csvContent.length
      };
    } catch (error) {
      console.error('Error storing input file:', error);
      return { success: false, error: error.message };
    }
  }

  // Store output CSV file
  async storeOutputFile(zipcode, runId, csvContent, originalFilename) {
    try {
      const fileInfo = this.generateFilePath('output', zipcode, runId, originalFilename);
      
      // Ensure the date directory exists
      await fs.mkdir(fileInfo.fullPath, { recursive: true });
      
      // Write the file
      const filePath = path.join(fileInfo.fullPath, fileInfo.filename);
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      console.log(`Output file stored: ${filePath}`);
      
      return {
        success: true,
        filePath,
        relativePath: fileInfo.relativePath,
        filename: fileInfo.filename,
        size: csvContent.length
      };
    } catch (error) {
      console.error('Error storing output file:', error);
      return { success: false, error: error.message };
    }
  }

  // Store Python script log
  async storeScriptLog(zipcode, runId, logContent) {
    try {
      const fileInfo = this.generateFilePath('logs', zipcode, runId, `queried_${zipcode}_python_script.log`);
      
      // Ensure the date directory exists
      await fs.mkdir(fileInfo.fullPath, { recursive: true });
      
      // Write the log file
      const filePath = path.join(fileInfo.fullPath, fileInfo.filename);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Queried Zipcode: ${zipcode} - Run ID: ${runId}\n${logContent}\n\n`;
      
      await fs.appendFile(filePath, logEntry, 'utf8');
      
      console.log(`Script log stored: ${filePath}`);
      
      return {
        success: true,
        filePath,
        relativePath: fileInfo.relativePath,
        filename: fileInfo.filename
      };
    } catch (error) {
      console.error('Error storing script log:', error);
      return { success: false, error: error.message };
    }
  }

  // Get file info for a specific run
  async getRunFileInfo(zipcode, runId) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      const datePath = path.join(year.toString(), month, day);
      
      const inputPath = path.join(this.baseDir, 'input', datePath, `${zipcode}_${runId}_*`);
      const outputPath = path.join(this.baseDir, 'output', datePath, `${zipcode}_${runId}_*`);
      const logPath = path.join(this.baseDir, 'logs', datePath, `${zipcode}_${runId}_python_script.log`);
      
      return {
        inputPath,
        outputPath,
        logPath,
        datePath
      };
    } catch (error) {
      console.error('Error getting run file info:', error);
      return null;
    }
  }

  // List all files for a specific date
  async listFilesByDate(date) {
    try {
      const inputDir = path.join(this.baseDir, 'input', date);
      const outputDir = path.join(this.baseDir, 'output', date);
      const logsDir = path.join(this.baseDir, 'logs', date);
      
      const files = {
        input: [],
        output: [],
        logs: []
      };
      
      try {
        const inputFiles = await fs.readdir(inputDir);
        files.input = inputFiles.map(file => ({
          name: file,
          path: path.join(inputDir, file),
          size: fs.stat(path.join(inputDir, file)).then(stat => stat.size)
        }));
      } catch (error) {
        console.log(`No input files for date: ${date}`);
      }
      
      try {
        const outputFiles = await fs.readdir(outputDir);
        files.output = outputFiles.map(file => ({
          name: file,
          path: path.join(outputDir, file),
          size: fs.stat(path.join(outputDir, file)).then(stat => stat.size)
        }));
      } catch (error) {
        console.log(`No output files for date: ${date}`);
      }
      
      try {
        const logFiles = await fs.readdir(logsDir);
        files.logs = logFiles.map(file => ({
          name: file,
          path: path.join(logsDir, file),
          size: fs.stat(path.join(logsDir, file)).then(stat => stat.size)
        }));
      } catch (error) {
        console.log(`No log files for date: ${date}`);
      }
      
      return files;
    } catch (error) {
      console.error('Error listing files by date:', error);
      return { input: [], output: [], logs: [] };
    }
  }

  // Clean up old files (optional maintenance)
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const baseDirs = ['input', 'output', 'logs'];
      let totalDeleted = 0;
      
      for (const baseDir of baseDirs) {
        const fullBaseDir = path.join(this.baseDir, baseDir);
        
        try {
          const yearDirs = await fs.readdir(fullBaseDir);
          
          for (const yearDir of yearDirs) {
            const yearPath = path.join(fullBaseDir, yearDir);
            const monthDirs = await fs.readdir(yearPath);
            
            for (const monthDir of monthDirs) {
              const monthPath = path.join(yearPath, monthDir);
              const dayDirs = await fs.readdir(monthPath);
              
              for (const dayDir of dayDirs) {
                const dayPath = path.join(monthPath, dayDir);
                const dirDate = new Date(parseInt(yearDir), parseInt(monthDir) - 1, parseInt(dayDir));
                
                if (dirDate < cutoffDate) {
                  await fs.rm(dayPath, { recursive: true, force: true });
                  totalDeleted++;
                  console.log(`Cleaned up old directory: ${dayPath}`);
                }
              }
            }
          }
        } catch (error) {
          console.log(`No files to clean in ${baseDir}`);
        }
      }
      
      console.log(`Cleanup completed. Deleted ${totalDeleted} old directories.`);
      return totalDeleted;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }
}

module.exports = new FileStorageService();
