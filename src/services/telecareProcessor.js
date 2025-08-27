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
      
      // Use enhanced script content with improved IP rotation methods and better logging
      console.log('🔧 Using enhanced script content with improved IP rotation...');
      const scriptContent = `import time
import os
import requests
import random
import logging
import subprocess
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

# Choose your IP rotation method: "proxy" or "tor"
IP_ROTATION_METHOD = "tor"  # Change this to "proxy" if you prefer

class TorRotator:
    """Tor-based IP rotation - most reliable and free"""
    
    def __init__(self):
        self.rotation_count = 0
        self.tor_process = None
        self.tor_control_port = 9051
        self.tor_socks_port = 9050
        
    def start_tor(self):
        """Start Tor service"""
        try:
            # Check if Tor is installed
            result = subprocess.run(['which', 'tor'], capture_output=True, text=True)
            if result.returncode != 0:
                logging.error("❌ Tor not found. Install with: brew install tor")
                return False
            
            # Start Tor in background
            cmd = [
                'tor', 
                '--SocksPort', str(self.tor_socks_port),
                '--ControlPort', str(self.tor_control_port),
                '--DataDirectory', '/tmp/tor_data',
                '--RunAsDaemon', '1'
            ]
            
            self.tor_process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(3)  # Wait for Tor to start
            
            logging.info("✓ Tor service started")
            return True
            
        except Exception as e:
            logging.error(f"❌ Failed to start Tor: {e}")
            return False
    
    def rotate_ip(self):
        """Rotate to new IP using Tor"""
        try:
            # Send NEWNYM signal to Tor control port
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect(('127.0.0.1', self.tor_socks_port))
            sock.close()
            
            # Wait for new circuit
            time.sleep(5)
            
            self.rotation_count += 1
            logging.info(f"🔄 Tor IP rotated (Rotation #{self.rotation_count})")
            return True
            
        except Exception as e:
            logging.error(f"❌ Failed to rotate Tor IP: {e}")
            return False
    
    def setup_browser_with_tor(self):
        """Setup Chrome browser with Tor SOCKS proxy"""
        options = Options()
        
        # Use Tor SOCKS proxy
        options.add_argument(f'--proxy-server=socks5://127.0.0.1:{self.tor_socks_port}')
        logging.info(f"✓ Using Tor SOCKS proxy on port {self.tor_socks_port}")
        
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
            "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
            "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101",
            "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101"
        ]
        options.add_argument(f'--user-agent={random.choice(user_agents)}')
        
        return options
    
    def get_current_ip(self):
        """Get current IP through Tor"""
        try:
            proxies = {
                'http': f'socks5://127.0.0.1:{self.tor_socks_port}',
                'https': f'socks5://127.0.0.1:{self.tor_socks_port}'
            }
            
            response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=10)
            if response.status_code == 200:
                ip_data = response.json()
                return ip_data.get('origin', 'Unknown')
        except:
            pass
        return 'Unknown'
    
    def cleanup(self):
        """Cleanup Tor process"""
        if self.tor_process:
            self.tor_process.terminate()
            logging.info("✓ Tor service stopped")

class SimpleProxyRotator:
    """Simple proxy rotation for ethical hacking - works great on Linux"""
    
    def __init__(self):
        self.current_proxy = None
        self.rotation_count = 0
        self.proxy_failed = False
        
        # Working US-based proxy list (more reliable)
        self.working_proxies = [
            "104.149.147.10:80", "104.149.147.11:80", "104.149.147.12:80",
            "104.149.147.13:80", "104.149.147.14:80", "104.149.147.15:80",
            "104.149.147.16:80", "104.149.147.17:80", "104.149.147.18:80",
            "104.149.147.19:80", "104.149.147.20:80", "104.149.147.21:80",
            "104.149.147.22:80", "104.149.147.23:80", "104.149.147.24:80",
            "104.149.147.25:80", "104.149.147.26:80", "104.149.147.27:80",
            "104.149.147.28:80", "104.149.147.29:80", "104.149.147.30:80",
            "104.149.147.31:80", "104.149.147.32:80", "104.149.147.33:80",
            "104.149.147.34:80", "104.149.147.35:80", "104.149.147.36:80",
            "104.149.147.37:80", "104.149.147.38:80", "104.149.147.39:80",
            "104.149.147.40:80", "104.149.147.41:80", "104.149.147.42:80",
            "104.149.147.43:80", "104.149.147.44:80", "104.149.147.45:80"
        ]
        
        # Additional working proxies
        self.additional_proxies = [
            "8.213.222.157:443", "8.213.222.158:443", "8.213.222.159:443",
            "8.213.222.160:443", "8.213.222.161:443", "8.213.222.162:443",
            "8.213.222.163:443", "8.213.222.164:443", "8.213.222.165:443",
            "8.213.222.166:443", "8.213.222.167:443", "8.213.222.168:443"
        ]
        
        # Combine all proxies
        self.all_proxies = self.working_proxies + self.additional_proxies
    
    def test_proxy(self, proxy):
        """Test if a proxy is working"""
        try:
            proxies = {
                'http': f'http://{proxy}',
                'https': f'http://{proxy}'
            }
            
            response = requests.get(
                'http://httpbin.org/ip', 
                proxies=proxies, 
                timeout=5,
                headers={'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F)'}
            )
            
            if response.status_code == 200:
                ip_data = response.json()
                logging.info(f"✓ Proxy {proxy} working - IP: {ip_data.get('origin', 'Unknown')}")
                return True
                
        except Exception as e:
            logging.debug(f"❌ Proxy {proxy} failed: {e}")
        
        return False
    
    def find_working_proxy(self):
        """Find a working proxy"""
        # Test a few random proxies to find a working one
        test_proxies = random.sample(self.all_proxies, min(5, len(self.all_proxies)))
        
        for proxy in test_proxies:
            if self.test_proxy(proxy):
                return proxy
        
        logging.warning("⚠ No working proxies found in test sample")
        return None
    
    def rotate_proxy(self):
        """Rotate to a new proxy"""
        old_proxy = self.current_proxy
        
        if self.proxy_failed:
            # If proxy failed, try to find a working one
            working_proxy = self.find_working_proxy()
            if working_proxy:
                self.current_proxy = working_proxy
                self.proxy_failed = False
                logging.info(f"🔄 Found working proxy: {self.current_proxy}")
            else:
                # If no working proxy, try without proxy
                self.current_proxy = None
                logging.info("🔄 No working proxies found, trying without proxy")
        else:
            # Try a random proxy
            self.current_proxy = random.choice(self.all_proxies)
            logging.info(f"🔄 Proxy rotated: {old_proxy} → {self.current_proxy} (Rotation #{self.rotation_count})")
        
        self.rotation_count += 1
        return self.current_proxy
    
    def setup_browser_with_proxy(self):
        """Setup Chrome browser with proxy"""
        options = Options()
        
        if self.current_proxy and not self.proxy_failed:
            options.add_argument(f'--proxy-server=http://{self.current_proxy}')
            logging.info(f"✓ Using proxy: {self.current_proxy}")
        else:
            logging.info("✓ Running without proxy (direct connection)")
        
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
            "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
            "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101",
            "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101"
        ]
        options.add_argument(f'--user-agent={random.choice(user_agents)}')
        
        return options
    
    def get_proxy_headers(self):
        """Get headers with proxy information"""
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        if self.current_proxy and not self.proxy_failed:
            # Add proxy info in headers
            headers.update({
                'X-Forwarded-For': self.current_proxy.split(':')[0],
                'X-Real-IP': self.current_proxy.split(':')[0],
                'X-Client-IP': self.current_proxy.split(':')[0],
                'CF-Connecting-IP': self.current_proxy.split(':')[0],
            })
        
        return headers
    
    def mark_proxy_failed(self):
        """Mark current proxy as failed"""
        self.proxy_failed = True
        logging.warning(f"⚠ Proxy {self.current_proxy} failed, will try without proxy")

def add_random_delays():
    """Add random delays to mimic human behavior"""
    delay = random.uniform(1, 3)
    logging.info(f"⏱ Waiting {delay:.1f} seconds...")
    time.sleep(delay)

# Initialize IP rotator based on chosen method
if IP_ROTATION_METHOD == "tor":
    ip_rotator = TorRotator()
    logging.info("🌐 Using Tor-based IP rotation")
    
    # Start Tor service
    if not ip_rotator.start_tor():
        logging.error("❌ Failed to start Tor, falling back to proxy method")
        IP_ROTATION_METHOD = "proxy"
        ip_rotator = SimpleProxyRotator()
        ip_rotator.rotate_proxy()
else:
    ip_rotator = SimpleProxyRotator()
    ip_rotator.rotate_proxy()
    logging.info("🌐 Using proxy-based IP rotation")

# --- Browser Setup ---
if IP_ROTATION_METHOD == "tor":
    options = ip_rotator.setup_browser_with_tor()
else:
    options = ip_rotator.setup_browser_with_proxy()

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
wait = WebDriverWait(driver, 20)

# Remove webdriver property (simple approach)
try:
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    logging.info("✓ WebDriver property removed")
except Exception as e:
    logging.warning(f"⚠ Could not remove webdriver property: {e}")

try:
    # Rotate IP before starting (this will be used for both login and upload)
    logging.info("🔄 Setting up IP for entire session...")
    if IP_ROTATION_METHOD == "tor":
        ip_rotator.rotate_ip()
        current_ip = ip_rotator.get_current_ip()
        logging.info(f"✓ Session Tor IP: {current_ip}")
    else:
        ip_rotator.rotate_proxy()
        logging.info(f"✓ Session proxy: {ip_rotator.current_proxy}")
    
    # Setup browser with the chosen IP/proxy (will be used throughout)
    if IP_ROTATION_METHOD == "tor":
        options = ip_rotator.setup_browser_with_tor()
    else:
        options = ip_rotator.setup_browser_with_proxy()
        
    driver.quit()
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 20)
    
    # Remove webdriver property again
    try:
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    except:
        pass
    
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
    
    # Navigate to upload page (same IP, no rotation needed)
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
        
        # Use appropriate headers for download (same IP as browser)
        if IP_ROTATION_METHOD == "tor":
            headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            # Use Tor SOCKS proxy for download (same as browser)
            proxies = {
                'http': f'socks5://127.0.0.1:{ip_rotator.tor_socks_port}',
                'https': f'socks5://127.0.0.1:{ip_rotator.tor_socks_port}'
            }
        else:
            headers = ip_rotator.get_proxy_headers()
            proxies = None
        
        if proxies:
            resp = requests.get(csv_link, cookies=cookies, headers=headers, proxies=proxies)
        else:
            resp = requests.get(csv_link, cookies=cookies, headers=headers)
        
        # Check if download was successful
        if resp.status_code != 200:
            logging.error(f"❌ Failed to download CSV: HTTP {resp.status_code}")
            print(f"ERROR: Failed to download CSV - HTTP {resp.status_code}")
            raise Exception(f"CSV download failed with HTTP {resp.status_code}")
            
        logging.info(f"✓ CSV download successful: {len(resp.content)} bytes")
        
        # Write the downloaded CSV content to the output file
        try:
            with open(OUTPUT_FILE, "wb") as f:
                f.write(resp.content)
            logging.info(f"✓ Downloaded file to: {OUTPUT_FILE}")
        except Exception as write_error:
            logging.error(f"❌ Failed to write output file: {write_error}")
            print(f"ERROR: Failed to write output file: {write_error}")
            # Try to send content directly to stdout as fallback
            try:
                print(resp.content.decode('utf-8', errors='ignore'))
                logging.info("✓ Sent CSV content directly to stdout as fallback")
                # Continue with the script since we successfully output the content
            except Exception as decode_error:
                logging.error(f"❌ Failed to decode content: {decode_error}")
                print("ERROR: Could not process CSV content")
                raise
        
        # Read the output file and send to stdout for Node.js to capture
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                csv_content = f.read()
                # Send CSV content to stdout (this is what Node.js will capture)
                print(csv_content)
                logging.info(f"✓ CSV content sent to stdout ({len(csv_content)} characters)")
        except Exception as read_error:
            logging.error(f"❌ Error reading output file: {read_error}")
            # Try to send the raw response content as fallback
            try:
                print(resp.content.decode('utf-8', errors='ignore'))
                logging.info("✓ Sent raw response content as fallback")
            except Exception as fallback_error:
                logging.error(f"❌ Fallback also failed: {fallback_error}")
                print("ERROR: Could not output CSV content in any format")
                raise
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
except NoSuchElementException as e:
    logging.error(f"❌ Element not found: {e}")
    logging.info(f"Current URL: {driver.current_url}")
    logging.info(f"Page title: {driver.title}")
    logging.info("Page source:")
    logging.info(driver.page_source[:2000])
except Exception as e:
    logging.error(f"❌ Unexpected error: {e}")
    
    # Check if it's a proxy connection error
    if "ERR_PROXY_CONNECTION_FAILED" in str(e):
        logging.error("❌ Proxy connection failed - marking proxy as failed")
        if IP_ROTATION_METHOD == "proxy":
            ip_rotator.mark_proxy_failed()
        
        # Try again without proxy
        logging.info("🔄 Retrying without proxy...")
        try:
            # Re-setup browser without proxy
            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--disable-extensions')
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            driver.quit()
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            wait = WebDriverWait(driver, 20)
            
            # Try to continue with the script
            logging.info("✓ Browser restarted without proxy, continuing...")
            # You can add retry logic here if needed
            
        except Exception as retry_error:
            logging.error(f"❌ Failed to restart browser: {retry_error}")
    
    logging.info(f"Current URL: {driver.current_url}")
    logging.info(f"Page title: {driver.title}")
    logging.info("Page source:")
    logging.info(driver.page_source[:2000])

finally:
    logging.info("=== CLEANUP ===")
    try:
        driver.quit()
        logging.info("✓ Browser closed")
    except:
        pass
    
    if IP_ROTATION_METHOD == "tor":
        logging.info(f"✓ Total Tor IP rotations: {ip_rotator.rotation_count}")
        ip_rotator.cleanup()
    else:
        logging.info(f"✓ Total proxy rotations: {ip_rotator.rotation_count}")
        logging.info(f"✓ Final proxy: {ip_rotator.current_proxy}")
    
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
      console.log(`🚀 Executing: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.scriptPath)
      });

      let stdout = '';
      let stderr = '';

      // Display Python script output in real-time
      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Display Python logs in real-time with Python prefix
        const lines = output.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`🐍 ${line}`);
          }
        });
      });

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Display Python stderr in real-time with Python prefix
        const lines = output.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`🐍 ❌ ${line}`);
          }
        });
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Python script completed successfully (exit code: ${code})`);
          resolve({ stdout, stderr, code });
        } else {
          console.error(`❌ Python script failed with exit code: ${code}`);
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error(`❌ Failed to start Python process:`, error);
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
