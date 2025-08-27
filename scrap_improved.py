#!/usr/bin/env python3
"""
Improved Telecare Data Processing Script
Enhanced with better error handling, element detection, and logging
"""

import os
import sys
import time
import requests
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import tempfile
import shutil

# Configuration
LOGIN_URL = "https://www.telcodata.us/login"
UPLOAD_URL = "https://www.telcodata.us/query-by-csv-upload"
USERNAME = "telecare_1"
PASSWORD = "BlinkIT@2k"

def log(message):
    """Log message to stderr so it doesn't interfere with stdout CSV output"""
    print(f"[{time.strftime('%H:%M:%S')}] {message}", file=sys.stderr)

def setup_chrome_driver():
    """Setup Chrome driver - simplified to match working script"""
    log("Setting up Chrome driver...")
    
    # Create temporary directory for Chrome
    temp_dir = tempfile.mkdtemp(prefix="chrome_")
    log(f"Using temporary Chrome directory: {temp_dir}")
    
    # Use the same options as the working script
    options = Options()
    options.add_argument("--headless")
    prefs = {"download.default_directory": temp_dir}
    options.add_experimental_option("prefs", prefs)
    
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        log("Chrome driver initialized successfully")
        return driver, temp_dir
    except Exception as e:
        log(f"ChromeDriver initialization failed: {e}")
        raise Exception(f"ChromeDriver initialization failed: {e}")



def find_file_input(driver):
    """Find file input element - using the working selector from the original script"""
    log("Looking for file input element...")
    
    try:
        file_input = driver.find_element(By.NAME, "filename")
        log("Found file input using name='filename'")
        return file_input
    except NoSuchElementException:
        log("File input not found with name='filename'")
        return None

def main():
    parser = argparse.ArgumentParser(description='Process telecare data')
    parser.add_argument('input_file', help='Input CSV file path')
    parser.add_argument('output_file', help='Output CSV file path')
    parser.add_argument('--zipcode', help='Zipcode being processed')
    parser.add_argument('--run-id', help='Run ID for tracking')
    
    args = parser.parse_args()
    
    CSV_PATH = args.input_file
    OUTPUT_FILE = args.output_file
    ZIPCODE = args.zipcode or "unknown"
    RUN_ID = args.run_id or "unknown"
    
    log(f"Starting telecare processing for zipcode: {ZIPCODE}, run ID: {RUN_ID}")
    log(f"Input file: {CSV_PATH}")
    log(f"Output file: {OUTPUT_FILE}")
    
    driver = None
    temp_dir = None
    
    try:
        # Setup Chrome driver
        driver, temp_dir = setup_chrome_driver()
        
        # Login
        log("Navigating to login page...")
        driver.get(LOGIN_URL)
        time.sleep(2)  # Wait for page to load
        
        log("Filling in login form...")
        driver.find_element(By.NAME, "username").send_keys(USERNAME)
        driver.find_element(By.NAME, "password").send_keys(PASSWORD)
        driver.find_element(By.XPATH, "//input[@type='submit']").click()
        log("Login form submitted")
        time.sleep(3)  # Wait for login to complete

        # Navigate to CSV Upload
        log("Navigating to upload page...")
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
                print(f"ERROR: Could not read output file: {e}")
        else:
            log("Error: CSV download link not found.")
            log("Available links:")
            for i, link in enumerate(links[:10]):  # Show first 10 links for debugging
                href = link.get_attribute("href")
                text = link.text
                log(f"  {i+1}: {text} -> {href}")
            
            # Send error to stdout so Node.js knows something went wrong
            print("ERROR: CSV download link not found")

    except Exception as e:
        log(f"Error in telecare processing: {e}")
        # Send error to stdout so Node.js can capture it
        print(f"ERROR: {e}")
        raise

    finally:
        try:
            if driver:
                driver.quit()
                log("Chrome driver closed")
        except Exception as e:
            log(f"Error closing driver: {e}")
        
        # Clean up temporary directory
        try:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                log(f"Cleaned up temporary directory: {temp_dir}")
        except Exception as e:
            log(f"Error cleaning up temp directory: {e}")
        
        log("Script execution completed")

if __name__ == "__main__":
    main()
