#!/usr/bin/env python3
"""
Modified telecare scraping script that uses system ChromeDriver
instead of webdriver-manager to avoid compatibility issues.
"""

import pandas as pd
import time
import sys
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def setup_driver():
    """Set up Chrome driver with proper options for server environment"""
    options = Options()
    
    # Server-specific options
    options.add_argument('--headless')  # Run in background
    options.add_argument('--no-sandbox')  # Required for root user
    options.add_argument('--disable-dev-shm-usage')  # Overcome limited resource problems
    options.add_argument('--disable-gpu')  # Disable GPU hardware acceleration
    options.add_argument('--remote-debugging-port=9222')  # Enable remote debugging
    options.add_argument('--disable-extensions')  # Disable extensions
    options.add_argument('--disable-plugins')  # Disable plugins
    options.add_argument('--disable-images')  # Disable images for faster loading
    options.add_argument('--disable-javascript')  # Disable JavaScript if not needed
    options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
    
    try:
        # Try to use system ChromeDriver first
        service = Service('/usr/local/bin/chromedriver')
        driver = webdriver.Chrome(service=service, options=options)
        print("✅ Using system ChromeDriver")
        return driver
    except Exception as e:
        print(f"⚠️ System ChromeDriver failed: {e}")
        try:
            # Fallback to webdriver-manager
            from webdriver_manager.chrome import ChromeDriverManager
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
            print("✅ Using webdriver-manager ChromeDriver")
            return driver
        except Exception as e2:
            print(f"❌ Both ChromeDriver methods failed:")
            print(f"   System: {e}")
            print(f"   Manager: {e2}")
            raise Exception("ChromeDriver setup failed")

def scrape_telecare_data(zipcode, input_file):
    """Scrape telecare data for given zipcode"""
    try:
        print(f"🔍 Starting telecare scraping for zipcode: {zipcode}")
        
        # Setup driver
        driver = setup_driver()
        
        # Read input data
        df = pd.read_csv(input_file)
        print(f"📊 Loaded {len(df)} records from input file")
        
        # Your scraping logic here
        # This is a placeholder - replace with actual scraping code
        results = []
        
        for index, row in df.iterrows():
            try:
                # Example scraping logic (replace with actual implementation)
                npa = row.get('NPA', '')
                nxx = row.get('NXX', '')
                
                # Simulate scraping result
                result = {
                    'NPA': npa,
                    'NXX': nxx,
                    'THOUSANDS': row.get('THOUSANDS', ''),
                    'STATE': row.get('STATE', ''),
                    'COMPANY_TYPE': row.get('COMPANY_TYPE', ''),
                    'COMPANY': row.get('COMPANY', ''),
                    'RATECENTER': row.get('RATECENTER', ''),
                    'ZIPCODE': zipcode
                }
                results.append(result)
                
                print(f"✅ Processed NPA: {npa}, NXX: {nxx}")
                
            except Exception as e:
                print(f"⚠️ Error processing row {index}: {e}")
                continue
        
        # Save results
        output_file = f"telecare_output_{zipcode}.csv"
        results_df = pd.DataFrame(results)
        results_df.to_csv(output_file, index=False)
        print(f"💾 Results saved to: {output_file}")
        print(f"📊 Total results: {len(results)}")
        
        return output_file
        
    except Exception as e:
        print(f"❌ Error in scraping: {e}")
        raise
    finally:
        if 'driver' in locals():
            driver.quit()
            print("🔒 Chrome driver closed")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 fix_python_script.py <zipcode> <input_file>")
        sys.exit(1)
    
    zipcode = sys.argv[1]
    input_file = sys.argv[2]
    
    try:
        output_file = scrape_telecare_data(zipcode, input_file)
        print(f"🎉 Telecare scraping completed successfully!")
        print(f"📁 Output file: {output_file}")
    except Exception as e:
        print(f"❌ Telecare scraping failed: {e}")
        sys.exit(1)
