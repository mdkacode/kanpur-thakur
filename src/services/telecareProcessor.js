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
      
      // Use enhanced script content with Tor functionality and better error handling
      console.log('🔧 Using enhanced script content with Tor IP rotation...');
      const scriptContent = `import time
import os
import requests
import random
import subprocess
import logging
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Setup logging for ethical hacking
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ethical_hacking.log'),
        logging.StreamHandler()
    ]
)

# --- Config ---
LOGIN_URL = "https://www.telcodata.us/login"
UPLOAD_URL = "https://www.telcodata.us/query-by-csv-upload"
USERNAME = "telecare_1"
PASSWORD = "BlinkIT@2k"
CSV_PATH = os.path.join(os.getcwd(), "sample_input.csv")
DOWNLOAD_DIR = os.getcwd()
OUTPUT_FILE = os.path.join(DOWNLOAD_DIR, "telcodata_bulk_output.csv")

class EthicalHackingRotator:
    """IP rotation for ethical hacking and scam protection"""
    
    def __init__(self):
        self.tor_control_port = 9051
        self.tor_password = "1234"  # Change this!
        self.current_ip = None
        self.rotation_count = 0
        
    def setup_tor(self):
        """Setup Tor for IP rotation"""
        try:
            # Install Tor if not present
            subprocess.run(["sudo", "apt-get", "update"], check=True)
            subprocess.run(["sudo", "apt-get", "install", "-y", "tor"], check=True)
            
            # Configure Tor
            self.configure_tor()
            
            # Start Tor service
            subprocess.run(["sudo", "systemctl", "start", "tor"], check=True)
            subprocess.run(["sudo", "systemctl", "enable", "tor"], check=True)
            
            logging.info("✓ Tor setup complete")
            return True
        except Exception as e:
            logging.error(f"❌ Tor setup failed: {e}")
            return False
    
    def configure_tor(self):
        """Configure Tor for optimal performance"""
        torrc_content = f"""
# Ethical hacking Tor configuration
SocksPort 9050
ControlPort 9051
CookieAuthentication 1
HashedControlPassword {self.generate_tor_password_hash()}

# Performance settings
MaxCircuitDirtiness 300
NewCircuitPeriod 90
CircuitBuildTimeout 30

# Security settings
SafeLogging 1
Log notice file /var/log/tor/notices.log

# Exit nodes for IP diversity
ExitNodes {{{{US}}}} {{{{CA}}}} {{{{GB}}}} {{{{DE}}}} {{{{NL}}}}
StrictExitNodes 1
"""
        
        with open('/etc/tor/torrc', 'w') as f:
            f.write(torrc_content)
        
        # Restart Tor service
        subprocess.run(["sudo", "systemctl", "restart", "tor"], check=True)
    
    def generate_tor_password_hash(self):
        """Generate Tor password hash"""
        try:
            result = subprocess.run(["tor", "--hash-password", self.tor_password], 
                                  capture_output=True, text=True)
            return result.stdout.strip()
        except:
            return "16:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    
    def rotate_ip(self):
        """Rotate IP using Tor"""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect(('127.0.0.1', self.tor_control_port))
            
            # Authenticate
            sock.send(f'AUTHENTICATE "{self.tor_password}"\\r\\n'.encode())
            response = sock.recv(1024).decode()
            
            if '250 OK' not in response:
                logging.error(f"❌ Tor authentication failed: {response}")
                return False
            
            # Request new circuit
            sock.send('SIGNAL NEWNYM\\r\\n'.encode())
            response = sock.recv(1024).decode()
            
            if '250 OK' in response:
                self.rotation_count += 1
                logging.info(f"✓ IP rotated (Rotation #{self.rotation_count})")
                
                # Wait for circuit to establish
                time.sleep(random.uniform(3, 7))
                
                # Get new IP
                new_ip = self.get_current_ip()
                if new_ip:
                    self.current_ip = new_ip
                    logging.info(f"✓ New IP: {new_ip}")
                
                return True
            else:
                logging.error(f"❌ IP rotation failed: {response}")
                return False
                
        except Exception as e:
            logging.error(f"❌ IP rotation error: {e}")
            return False
        finally:
            sock.close()
    
    def get_current_ip(self):
        """Get current IP through Tor"""
        try:
            proxies = {
                'http': 'socks5://127.0.0.1:9050',
                'https': 'socks5://127.0.0.1:9050'
            }
            response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=15)
            ip_data = response.json()
            return ip_data['origin']
        except Exception as e:
            logging.error(f"❌ Could not get IP: {e}")
            return None
    
    def setup_browser_with_tor(self):
        """Setup Chrome browser with Tor proxy"""
        options = Options()
        options.add_argument('--proxy-server=socks5://127.0.0.1:9050')
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-extensions')
        
        # Server optimizations
        options.add_argument('--disable-background-timer-throttling')
        options.add_argument('--disable-backgrounding-occluded-windows')
        options.add_argument('--disable-renderer-backgrounding')
        
        # Anti-detection for ethical hacking
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Random user agent
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ]
        options.add_argument(f'--user-agent={random.choice(user_agents)}')
        
        return options

def add_random_delays():
    """Add random delays to mimic human behavior"""
    delay = random.uniform(1, 3)
    logging.info(f"⏱ Waiting {delay:.1f} seconds...")
    time.sleep(delay)

# Initialize IP rotator
ip_rotator = EthicalHackingRotator()

# Setup Tor if not already running
if not ip_rotator.setup_tor():
    logging.error("❌ Failed to setup Tor, continuing without IP rotation")

# --- Browser Setup ---
options = ip_rotator.setup_browser_with_tor()
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
wait = WebDriverWait(driver, 20)

# Remove webdriver property
driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

try:
    # Rotate IP before starting
    logging.info("🔄 Rotating IP before starting...")
    ip_rotator.rotate_ip()
    
    # Login
    logging.info("=== STARTING ETHICAL HACKING PROCESS ===")
    logging.info(f"Navigating to login page: {LOGIN_URL}")
    driver.get(LOGIN_URL)
    add_random_delays()
    logging.info("✓ Login page loaded successfully")
    
    logging.info("=== FILLING LOGIN FORM ===")
    logging.info(f"Looking for username field...")
    username_field = wait.until(EC.presence_of_element_located((By.NAME, "username")))
    logging.info("✓ Username field found")
    username_field.send_keys(USERNAME)
    add_random_delays()
    logging.info(f"✓ Username entered: {USERNAME}")
    
    logging.info(f"Looking for password field...")
    password_field = wait.until(EC.presence_of_element_located((By.NAME, "password")))
    logging.info("✓ Password field found")
    password_field.send_keys(PASSWORD)
    add_random_delays()
    logging.info("✓ Password entered successfully")
    
    logging.info("Looking for submit button...")
    submit_button = driver.find_element(By.XPATH, "//input[@type='submit']")
    logging.info("✓ Submit button found")
    submit_button.click()
    logging.info("✓ Login form submitted")
    
    add_random_delays()
    logging.info("=== LOGIN PROCESS COMPLETED ===")
    
    # Verify login success
    current_url = driver.current_url
    logging.info(f"Current URL after login: {current_url}")
    
    try:
        logout_link = driver.find_element(By.XPATH, "//a[contains(@href, 'logout')]")
        logging.info("✓ Login successful - Logout link found")
    except NoSuchElementException:
        try:
            user_info = driver.find_element(By.XPATH, "//*[contains(text(), 'Logged in as')]")
            logging.info("✓ Login successful - User info found")
        except NoSuchElementException:
            logging.warning("⚠ Warning: Could not confirm login success, but proceeding...")
    
    # Rotate IP before upload
    logging.info("🔄 Rotating IP before upload...")
    ip_rotator.rotate_ip()
    
    logging.info("=== NAVIGATING TO UPLOAD PAGE ===")
    logging.info(f"Navigating to upload page: {UPLOAD_URL}")
    driver.get(UPLOAD_URL)
    add_random_delays()
    logging.info("✓ Navigated to CSV upload page")
    
    # Wait for page to be fully loaded
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(3)
    
    logging.info("✓ Page loaded, looking for form elements...")
    
    # Wait for the file input to be present and visible
    logging.info("=== UPLOAD FORM PROCESS ===")
    logging.info("Waiting for file input element...")
    file_input = wait.until(EC.presence_of_element_located((By.NAME, "filename")))
    logging.info(f"✓ Found file input element: {file_input}")
    
    # Upload CSV file
    file_input.send_keys(CSV_PATH)
    add_random_delays()
    logging.info(f"✓ Selected file: {CSV_PATH}")
    
    # Check the "Return thousands block data?" checkbox
    logging.info("Looking for thousands checkbox...")
    thousands_checkbox = wait.until(EC.presence_of_element_located((By.NAME, "thousands")))
    if not thousands_checkbox.is_selected():
        thousands_checkbox.click()
        logging.info("✓ Checked 'Return thousands block data' option")
    else:
        logging.info("✓ Thousands checkbox was already selected")
    
    # Submit the form
    logging.info("Looking for submit button...")
    submit_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Upload and Process File...']")))
    submit_button.click()
    logging.info("✓ CSV upload form submitted")

    # Wait for processing
    logging.info("=== PROCESSING FILE ===")
    time.sleep(10)
    logging.info("✓ Processing completed")

    # Find and download resulting CSV
    logging.info("=== DOWNLOADING RESULTS ===")
    links = driver.find_elements(By.TAG_NAME, "a")
    csv_link = None
    for link in links:
        href = link.get_attribute("href")
        if href and href.endswith(".csv"):
            csv_link = href
            break
    logging.info(f"Found {len(links)} links, looking for CSV download link...")

    if csv_link:
        logging.info(f"✓ Found CSV download link: {csv_link}")
        
        # Convert selenium cookies to requests format
        cookies = {}
        for cookie in driver.get_cookies():
            cookies[cookie['name']] = cookie['value']
        
        resp = requests.get(csv_link, cookies=cookies)
        with open(OUTPUT_FILE, "wb") as f:
            f.write(resp.content)
        logging.info(f"✓ Downloaded file to: {OUTPUT_FILE}")
        
        # Read the output file and send to stdout for Node.js to capture
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                csv_content = f.read()
                # Send CSV content to stdout (this is what Node.js will capture)
                print(csv_content)
                logging.info(f"CSV content sent to stdout ({len(csv_content)} characters)")
        except Exception as e:
            logging.error(f"Error reading output file: {e}")
            # Send error message to stdout so Node.js knows something went wrong
            print(f"ERROR: Could not read output file: {e}")
    else:
        logging.error("❌ Error: CSV download link not found.")
        logging.info("Available links:")
        for i, link in enumerate(links[:10]):
            href = link.get_attribute("href")
            text = link.text
            logging.info(f"  {i+1}: {text} -> {href}")
        
        # Send error to stdout so Node.js knows something went wrong
        print("ERROR: CSV download link not found")

except TimeoutException as e:
    logging.error(f"❌ Timeout error: {e}")
    logging.info(f"Current URL: {driver.current_url}")
    logging.info(f"Page title: {driver.title}")
    logging.info("Page source:")
    logging.info(driver.page_source[:2000])
    print(f"ERROR: Timeout error - {e}")
except NoSuchElementException as e:
    logging.error(f"❌ Element not found: {e}")
    logging.info(f"Current URL: {driver.current_url}")
    logging.info(f"Page title: {driver.title}")
    logging.info("Page source:")
    logging.info(driver.page_source[:2000])
    print(f"ERROR: Element not found - {e}")
except Exception as e:
    logging.error(f"❌ Unexpected error: {e}")
    logging.info(f"Current URL: {driver.current_url}")
    logging.info(f"Page title: {driver.title}")
    logging.info("Page source:")
    logging.info(driver.page_source[:2000])
    print(f"ERROR: {e}")

finally:
    logging.info("=== CLEANUP ===")
    try:
        driver.quit()
        logging.info("✓ Browser closed")
    except:
        pass
    
    logging.info(f"✓ Total IP rotations: {ip_rotator.rotation_count}")
    logging.info("Script execution completed")`;
      
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
