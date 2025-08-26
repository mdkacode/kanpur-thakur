-- Initial data for SheetBC application
-- This script inserts basic timezone data and any other required initial data

-- Insert timezone data
INSERT INTO timezones (timezone_name, display_name, abbreviation_standard, abbreviation_daylight, utc_offset_standard, utc_offset_daylight, observes_dst, description, states) VALUES
('America/New_York', 'Eastern Time', 'EST', 'EDT', '-05:00', '-04:00', true, 'Eastern Standard/Daylight Time', 'NY,PA,NJ,DE,MD,DC,VA,NC,SC,GA,FL,OH,IN,KY,TN,AL,MS,WV'),
('America/Chicago', 'Central Time', 'CST', 'CDT', '-06:00', '-05:00', true, 'Central Standard/Daylight Time', 'IL,WI,MI,IN,KY,TN,AL,MS,AR,LA,OK,TX,KS,NE,IA,MO,MN,ND,SD'),
('America/Denver', 'Mountain Time', 'MST', 'MDT', '-07:00', '-06:00', true, 'Mountain Standard/Daylight Time', 'CO,WY,MT,ID,UT,AZ,NM,TX,KS,NE,SD,ND'),
('America/Los_Angeles', 'Pacific Time', 'PST', 'PDT', '-08:00', '-07:00', true, 'Pacific Standard/Daylight Time', 'CA,WA,OR,NV,ID'),
('America/Anchorage', 'Alaska Time', 'AKST', 'AKDT', '-09:00', '-08:00', true, 'Alaska Standard/Daylight Time', 'AK'),
('Pacific/Honolulu', 'Hawaii Time', 'HST', 'HDT', '-10:00', '-09:00', true, 'Hawaii Standard/Daylight Time', 'HI'),
('America/Phoenix', 'Arizona Time', 'MST', 'MST', '-07:00', '-07:00', false, 'Arizona Mountain Standard Time (No DST)', 'AZ')
ON CONFLICT (timezone_name) DO NOTHING;

-- Insert sample demographic data (optional - for testing)
INSERT INTO demographic_records (zipcode, state, county, city, mhhi, avg_hhi, median_age, households, race_ethnicity_white, race_ethnicity_black, race_ethnicity_hispanic) VALUES
('10001', 'NY', 'New York', 'New York', 75000.00, 85000.00, 35.5, 50000, 45.2, 15.8, 25.3),
('20001', 'DC', 'District of Columbia', 'Washington', 85000.00, 95000.00, 33.2, 30000, 40.1, 45.2, 10.5),
('90210', 'CA', 'Los Angeles', 'Beverly Hills', 120000.00, 140000.00, 42.1, 15000, 75.8, 2.1, 8.9)
ON CONFLICT DO NOTHING;

-- Insert sample records data (optional - for testing)
INSERT INTO records (npa, nxx, zip, state_code, city, rc, timezone_id) VALUES
('201', '202', '10001', 'NY', 'New York', 'NYC', 1),
('202', '555', '20001', 'DC', 'Washington', 'WDC', 1),
('310', '555', '90210', 'CA', 'Beverly Hills', 'BHLS', 4)
ON CONFLICT DO NOTHING;

-- Create a sample filter (optional - for testing)
INSERT INTO user_filters (name, filter_type, filter_config) VALUES
('Sample Filter', 'demographic', '{"state": ["NY", "CA"], "mhhi_min": "50000"}')
ON CONFLICT DO NOTHING;

COMMIT;
