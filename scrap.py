import time
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
    
    log("Script execution completed")