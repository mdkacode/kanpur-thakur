import time
import os
import requests
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

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

options = Options()
options.add_argument("--headless")
prefs = {"download.default_directory": DOWNLOAD_DIR}
options.add_experimental_option("prefs", prefs)

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

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
    driver.quit()
    log("Script execution completed")