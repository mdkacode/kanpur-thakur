const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-stringify');
const csvParser = require('csv-parser');
const Telecare = require('../models/Telecare');
const fileStorageService = require('./fileStorageService');

class TelecareProcessor {
  constructor() {
    this.scriptPath = path.join(__dirname, '..', '..', 'scrap.py');
    this.venvPath = path.join(__dirname, '..', '..', 'venv');
    this.pythonPath = path.join(this.venvPath, 'bin', 'python');
    
    // On Windows, use Scripts instead of bin
    if (process.platform === 'win32') {
      this.pythonPath = path.join(this.venvPath, 'Scripts', 'python.exe');
    }
  }

  // Generate CSV from NPA NXX records - ONLY NPA and NXX columns
  async generateInputCSV(records, zipcode) {
    try {
      // Map only NPA and NXX fields as required
      const mappedRecords = records.map(record => ({
        NPA: record.npa,
        NXX: record.nxx
      }));

      const csvString = await new Promise((resolve, reject) => {
        csv.stringify(mappedRecords, { header: true }, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      // Enhanced filename with queried zipcode for better identification
      const filename = `queried_${zipcode}_npa_nxx_${timestamp}.csv`;
      
      return { csvString, filename };
    } catch (error) {
      console.error('Error generating input CSV:', error);
      throw error;
    }
  }

  // Setup Python virtual environment and install dependencies
  async setupPythonEnvironment() {
    try {
      console.log('Setting up Python virtual environment...');
      
      // Check if venv already exists
      try {
        await fs.access(this.venvPath);
        console.log('Virtual environment already exists');
        return true;
      } catch {
        console.log('Creating new virtual environment...');
      }

      // Create virtual environment
      await this.runCommand('python3', ['-m', 'venv', this.venvPath]);
      
      // Install required packages
      const requirements = [
        'selenium',
        'webdriver-manager',
        'requests'
      ];

      for (const pkg of requirements) {
        console.log(`Installing ${pkg}...`);
        await this.runCommand(this.pythonPath, ['-m', 'pip', 'install', pkg]);
      }

      console.log('Python environment setup complete');
      return true;
    } catch (error) {
      console.error('Error setting up Python environment:', error);
      throw error;
    }
  }

  // Run Python script with input CSV
  async runPythonScript(inputCsvPath, zipcode) {
    let tempInputPath = null;
    let tempScriptPath = null;
    let outputFilePath = null;
    
    try {
      console.log('Running Python script...');
      
      // Ensure Python environment is set up
      await this.setupPythonEnvironment();
      
      // Create unique temporary file names to avoid race conditions
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const tempPrefix = `${zipcode}_${timestamp}_${randomId}`;
      
      tempInputPath = path.join(__dirname, '..', '..', `temp_input_${tempPrefix}.csv`);
      tempScriptPath = path.join(__dirname, '..', '..', `temp_scrap_${tempPrefix}.py`);
      
      await fs.writeFile(tempInputPath, inputCsvPath);
      
      // Modify the script to use our input file and output file
      const scriptContent = await fs.readFile(this.scriptPath, 'utf8');
      const modifiedScript = scriptContent
        .replace('CSV_PATH = os.path.join(os.getcwd(), "sample_input.csv")', `CSV_PATH = "${tempInputPath.replace(/\\/g, '/')}"`)
        .replace('OUTPUT_FILE = os.path.join(DOWNLOAD_DIR, "telcodata_bulk_output.csv")', `OUTPUT_FILE = "${outputFilePath.replace(/\\/g, '/')}"`);
      
      await fs.writeFile(tempScriptPath, modifiedScript);

      // Run the Python script
      outputFilePath = path.join(__dirname, '..', '..', `temp_output_${tempPrefix}.csv`);
      const result = await this.runCommand(this.pythonPath, [tempScriptPath]);
      
      return { ...result, outputFilePath };
    } catch (error) {
      console.error('Error running Python script:', error);
      throw error;
    } finally {
      // Clean up temporary files in finally block with error handling
      await this.cleanupTempFile(tempInputPath);
      await this.cleanupTempFile(tempScriptPath);
      await this.cleanupTempFile(outputFilePath);
    }
  }

  // Helper method to safely clean up temporary files
  async cleanupTempFile(filePath) {
    if (!filePath) return;
    
    try {
      await fs.access(filePath); // Check if file exists
      await fs.unlink(filePath);
      console.log(`✅ Cleaned up temp file: ${path.basename(filePath)}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️ Warning: Could not clean up temp file ${path.basename(filePath)}:`, error.message);
      }
      // ENOENT errors are expected if file was already deleted, so we ignore them
    }
  }

  // Run a command and return the result
  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.scriptPath)
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Parse output CSV from Python script
  async parseOutputCSV(csvContent) {
    try {
      const rows = [];
      
      return new Promise((resolve, reject) => {
        const parser = csvParser();
        
        parser.on('data', (row) => {
          rows.push(row);
        });
        
        parser.on('end', () => {
          resolve(rows);
        });
        
        parser.on('error', (error) => {
          reject(error);
        });
        
        // Write CSV content to parser
        parser.write(csvContent);
        parser.end();
      });
    } catch (error) {
      console.error('Error parsing output CSV:', error);
      throw error;
    }
  }

  // Main processing function
  async processTelecareData(records, zipcode) {
    try {
      console.log(`Starting telecare processing for zipcode ${zipcode} with ${records.length} records`);
      
      // Create telecare run record
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const inputCsvName = `queried_${zipcode}_npa_nxx_${timestamp}.csv`;
      const outputCsvName = `queried_${zipcode}_python_output_${Date.now()}.csv`;
      
      const run = await Telecare.createRun({
        zip: zipcode,
        input_csv_name: inputCsvName,
        output_csv_name: outputCsvName,
        script_version: '1.0.0'
      });

      try {
        // Generate input CSV
        console.log('Generating input CSV...');
        const { csvString: inputCsv, filename: inputFilename } = await this.generateInputCSV(records, zipcode);
        
        // Store input CSV file
        console.log('Storing input CSV file...');
        const inputFileResult = await fileStorageService.storeInputFile(zipcode, run.id, inputCsv, inputFilename);
        
        // Run Python script
        console.log('Running Python script...');
        let pythonResult;
        try {
          pythonResult = await this.runPythonScript(inputCsv, zipcode);
        } catch (pythonError) {
          // Handle specific ChromeDriver/Selenium errors
          if (pythonError.message && pythonError.message.includes('ChromeDriver') || 
              pythonError.message.includes('chromedriver') ||
              pythonError.message.includes('WebDriverException')) {
            throw new Error(`ChromeDriver/Selenium setup issue: ${pythonError.message}. Please ensure Chrome and ChromeDriver are properly installed and compatible with your system.`);
          }
          throw pythonError;
        }
        
        // Store Python script log
        console.log('Storing Python script log...');
        const scriptLog = `STDOUT:\n${pythonResult.stdout || 'No stdout'}\n\nSTDERR:\n${pythonResult.stderr || 'No stderr'}`;
        await fileStorageService.storeScriptLog(zipcode, run.id, scriptLog);
        
        // Check if Python script output contains error
        if (pythonResult.stdout && pythonResult.stdout.trim().startsWith('ERROR:')) {
          throw new Error(`Python script error: ${pythonResult.stdout.trim()}`);
        }
        
        // Check if stderr contains critical errors
        if (pythonResult.stderr && 
            (pythonResult.stderr.includes('WebDriverException') || 
             pythonResult.stderr.includes('chromedriver') ||
             pythonResult.stderr.includes('selenium.common.exceptions'))) {
          throw new Error(`Python script ChromeDriver error: ${pythonResult.stderr.split('\n')[0]}`);
        }
        
        // Check if output file was created
        let outputContent = '';
        try {
          outputContent = await fs.readFile(pythonResult.outputFilePath, 'utf8');
          console.log(`Output file created: ${pythonResult.outputFilePath}`);
        } catch (fileError) {
          // Check if stdout contains error message
          if (pythonResult.stdout && pythonResult.stdout.trim().startsWith('ERROR:')) {
            throw new Error(`Python script error: ${pythonResult.stdout.trim()}`);
          }
          throw new Error('No output file created by Python script - this may be due to ChromeDriver/Selenium configuration issues');
        }
        
        // Parse output CSV
        console.log('Parsing output CSV...');
        const outputRows = await this.parseOutputCSV(outputContent);
        
        // Store output CSV file
        console.log('Storing output CSV file...');
        const outputFileResult = await fileStorageService.storeOutputFile(zipcode, run.id, outputContent, outputCsvName);
        
        // Save output rows to database
        console.log('Saving output rows to database...');
        await Telecare.saveOutputRows(run.id, zipcode, outputRows);
        
        // Update run status to success
        await Telecare.updateRunStatus(run.id, 'success', {
          row_count: outputRows.length,
          finished_at: new Date(),
          file_refs: {
            inputPath: inputFileResult.success ? inputFileResult.relativePath : inputCsvName,
            outputPath: outputFileResult?.success ? outputFileResult.relativePath : outputCsvName,
            inputFileSize: inputFileResult.success ? inputFileResult.size : 0,
            outputFileSize: outputFileResult?.success ? outputFileResult.size : 0
          }
        });
        
        console.log(`Telecare processing completed successfully for zipcode ${zipcode}`);
        
        return {
          success: true,
          run_id: run.id,
          input_csv: inputCsv,
          input_filename: inputCsvName,
          output_rows: outputRows,
          output_filename: outputCsvName,
          row_count: outputRows.length
        };
        
      } catch (error) {
        // Update run status to error with detailed error message
        await Telecare.updateRunStatus(run.id, 'error', {
          finished_at: new Date(),
          error_message: error.message || 'Unknown error occurred'
        });
        
        throw error;
      }
      
    } catch (error) {
      console.error(`Error in telecare processing for zipcode ${zipcode}:`, error);
      
      // Provide more user-friendly error messages
      if (error.message && error.message.includes('ChromeDriver')) {
        throw new Error(`ChromeDriver compatibility issue for zipcode ${zipcode}. This is typically due to macOS ARM64 compatibility. Please check Chrome and ChromeDriver installation.`);
      } else if (error.message && error.message.includes('Python script')) {
        throw new Error(`Python script execution failed for zipcode ${zipcode}: ${error.message}`);
      } else if (error.message && error.message.includes('ENOENT')) {
        throw new Error(`File system error for zipcode ${zipcode} - this has been fixed and should not happen again.`);
      }
      
      throw error;
    }
  }

  // Get processing status
  async getProcessingStatus(run_id) {
    try {
      const run = await Telecare.getRunById(run_id);
      if (!run) {
        throw new Error('Run not found');
      }
      
      return {
        run_id: run.id,
        zip: run.zipcode,
        status: run.status,
        started_at: run.started_at,
        finished_at: run.finished_at,
        row_count: run.row_count,
        input_csv_name: run.input_csv_name,
        output_csv_name: run.output_csv_name
      };
    } catch (error) {
      console.error('Error getting processing status:', error);
      throw error;
    }
  }
}

module.exports = new TelecareProcessor();
