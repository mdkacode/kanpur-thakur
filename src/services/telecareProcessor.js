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
      
      // Use hardcoded script content to avoid file reading issues
      console.log('🔧 Using hardcoded script content...');
      const scriptContent = `import time
import os
import requests
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# Try to import webdriver-manager, but fallback gracefully if not available
try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False

# --- Config ---
LOGIN_URL = "https://www.telcodata.us/login"
UPLOAD_URL = "https://www.telcodata.us/query-by-csv-upload"
USERNAME = "telecare_1"
PASSWORD = "BlinkIT@2k"
CSV_PATH = os.path.join(os.getcwd(), "sample_input.csv")
DOWNLOAD_DIR = os.getcwd()
OUTPUT_FILE = os.path.join(DOWNLOAD_DIR, "telcodata_bulk_output.csv")

# --- Browser Setup ---
def log(message):
    """Write log messages to stderr so they don't interfere with CSV output"""
    print(message, file=sys.stderr)

def setup_chrome_options():
    """Setup Chrome options optimized for server environment"""
    options = Options()
    
    # Basic headless mode
    options.add_argument("--headless")
    
    # Server-specific options to avoid conflicts
    options.add_argument("--no-sandbox")  # Required for root user
    options.add_argument("--disable-dev-shm-usage")  # Overcome limited resource problems
    options.add_argument("--disable-gpu")  # Disable GPU hardware acceleration
    options.add_argument("--disable-extensions")  # Disable extensions
    options.add_argument("--disable-plugins")  # Disable plugins
    options.add_argument("--disable-images")  # Disable images for faster loading
    
    # Unique user data directory to avoid conflicts
    import tempfile
    temp_dir = tempfile.mkdtemp(prefix="chrome_")
    options.add_argument(f"--user-data-dir={temp_dir}")
    options.add_argument(f"--data-path={temp_dir}")
    options.add_argument(f"--homedir={temp_dir}")
    
    # Memory and performance optimizations
    options.add_argument("--memory-pressure-off")
    options.add_argument("--max_old_space_size=4096")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-renderer-backgrounding")
    
    # Download preferences
    prefs = {"download.default_directory": DOWNLOAD_DIR}
    options.add_experimental_option("prefs", prefs)
    
    return options, temp_dir

# Setup Chrome options and driver
options, temp_dir = setup_chrome_options()
log(f"Using temporary Chrome directory: {temp_dir}")

try:
    if WEBDRIVER_MANAGER_AVAILABLE:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        log("Chrome driver initialized with webdriver-manager")
    else:
        driver = webdriver.Chrome(options=options)
        log("Chrome driver initialized with system ChromeDriver")
except Exception as e:
    log(f"Error initializing Chrome driver with primary method: {e}")
    # Try fallback to system ChromeDriver
    try:
        driver = webdriver.Chrome(options=options)
        log("Chrome driver initialized with system ChromeDriver fallback")
    except Exception as e2:
        log(f"Both ChromeDriver methods failed:")
        log(f"  Primary: {e}")
        log(f"  Fallback: {e2}")
        raise Exception("ChromeDriver initialization failed")

try:
    # Login
    driver.get(LOGIN_URL)
    time.sleep(2)  # Wait for page to load
    
    log("Filling in login form...")
    driver.find_element(By.NAME, "username").send_keys(USERNAME)
    driver.find_element(By.NAME, "password").send_keys(PASSWORD)
    driver.find_element(By.XPATH, "//input[@type='submit']").click()
    log("Login form submitted")
    time.sleep(3)  # Wait for login to complete

    # Navigate to CSV Upload
    driver.get(UPLOAD_URL)
    time.sleep(2)
    log("Navigated to CSV upload page")

    # Upload CSV file
    file_input = driver.find_element(By.NAME, "filename")
    file_input.send_keys(CSV_PATH)
    log(f"Selected file: {CSV_PATH}")
    
    # Check the "Return thousands block data?" checkbox
    thousands_checkbox = driver.find_element(By.NAME, "thousands")
    if not thousands_checkbox.is_selected():
        thousands_checkbox.click()
        log("Checked 'Return thousands block data' option")
    
    # Submit the form
    submit_button = driver.find_element(By.XPATH, "//input[@type='submit' and @value='Upload and Process File...']")
    submit_button.click()
    log("CSV upload form submitted")

    # Wait for processing
    time.sleep(10)

    # Find and download resulting CSV
    links = driver.find_elements(By.TAG_NAME, "a")
    csv_link = None
    for link in links:
        href = link.get_attribute("href")
        if href and href.endswith(".csv"):
            csv_link = href
            break
    log(f"Found {len(links)} links, looking for CSV download link...")

    if csv_link:
        log(f"Found CSV download link: {csv_link}")
        
        # Convert selenium cookies to requests format
        cookies = {}
        for cookie in driver.get_cookies():
            cookies[cookie['name']] = cookie['value']
        
        resp = requests.get(csv_link, cookies=cookies)
        with open(OUTPUT_FILE, "wb") as f:
            f.write(resp.content)
        log(f"Downloaded file to: {OUTPUT_FILE}")
        
        # Read the output file and send to stdout for Node.js to capture
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                csv_content = f.read()
                # Send CSV content to stdout (this is what Node.js will capture)
                print(csv_content)
                log(f"CSV content sent to stdout ({len(csv_content)} characters)")
        except Exception as e:
            log(f"Error reading output file: {e}")
            # Send error message to stdout so Node.js knows something went wrong
            print(f"ERROR: Could not read output file: {e}")
    else:
        log("Error: CSV download link not found.")
        log("Available links:")
        for i, link in enumerate(links[:10]):  # Show first 10 links for debugging
            href = link.get_attribute("href")
            text = link.text
            log(f"  {i+1}: {text} -> {href}")

finally:
    try:
        driver.quit()
        log("Chrome driver closed")
    except:
        pass
    
    # Clean up temporary directory
    try:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        log(f"Cleaned up temporary directory: {temp_dir}")
    except:
        pass
    
    log("Script execution completed")`;
      
      console.log(`✅ Script content loaded (${scriptContent.length} characters)`);
      
      // Modify the script to use our input file and output file
      if (!scriptContent) {
        throw new Error(`Failed to read script file - scriptContent is null`);
      }
      
      // Set output file path before using it
      outputFilePath = path.join(__dirname, '..', '..', `temp_output_${tempPrefix}.csv`);
      
      console.log(`🔧 Modifying script content...`);
      console.log(`   Input path: ${tempInputPath}`);
      console.log(`   Output path: ${outputFilePath}`);
      console.log(`   Script content type: ${typeof scriptContent}`);
      console.log(`   Script content length: ${scriptContent ? scriptContent.length : 'null'}`);
      
      // Final safety check
      if (!scriptContent || typeof scriptContent !== 'string') {
        console.error('❌ Script content is invalid:', scriptContent);
        throw new Error(`Script content is invalid. Type: ${typeof scriptContent}, Value: ${scriptContent}`);
      }
      
      const modifiedScript = scriptContent
        .replace('CSV_PATH = os.path.join(os.getcwd(), "sample_input.csv")', `CSV_PATH = "${tempInputPath.replace(/\\/g, '/')}"`)
        .replace('OUTPUT_FILE = os.path.join(DOWNLOAD_DIR, "telcodata_bulk_output.csv")', `OUTPUT_FILE = "${outputFilePath.replace(/\\/g, '/')}"`);
      
      console.log(`✅ Script modification completed`);
      
      await fs.writeFile(tempScriptPath, modifiedScript);

      // Run the Python script
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
