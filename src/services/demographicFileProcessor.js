const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const DemographicRecord = require('../models/DemographicRecord');
const FileUpload = require('../models/FileUpload');
const SchemaManager = require('../utils/schemaManager');
const timezoneResolver = require('./timezoneResolver');

class DemographicFileProcessor {
  constructor() {
    this.batchSize = 100; // Reduced batch size for better debugging and stability
    this.maxMemoryUsage = 500 * 1024 * 1024; // 500MB memory limit
    this.progressInterval = 100; // Log progress every 100 records
  }

  async processFile(filePath, uploadId) {
    try {
      console.log(`Starting demographic file processing for upload ${uploadId}: ${filePath}`);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      let records = [];
      let csvHeaders = [];

      if (fileExtension === '.csv') {
        const parseResult = await this.parseCSV(filePath);
        records = parseResult.records;
        csvHeaders = parseResult.headers;
      } else {
        const errorMsg = 'Unsupported file format. Only .csv files are supported for demographic data.';
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      console.log(`Parsed ${records.length} records from demographic file with ${csvHeaders.length} columns`);

      // Automatically sync database schema with CSV headers
      console.log('Syncing database schema with CSV headers...');
      try {
        await SchemaManager.syncSchemaWithCSV('demographic_records', csvHeaders);
        console.log('Database schema synchronized successfully');
      } catch (schemaError) {
        console.error('Warning: Schema sync failed, proceeding with existing schema:', schemaError.message);
        // Continue processing with existing schema
      }

      // Validate records
      console.log(`🔍 About to validate ${records.length} records`);
      const validRecords = this.validateRecords(records);
      console.log(`🔍 Validation complete: ${validRecords.length} valid records out of ${records.length} total`);
      
      if (validRecords.length === 0) {
        const errorMsg = 'No valid records found in demographic file';
        console.error(`❌ ${errorMsg}`);
        await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
        return { success: false, message: errorMsg };
      }

      // Process records in batches
      console.log(`🔍 About to process ${validRecords.length} valid records in batches`);
      const totalProcessed = await this.processRecordsInBatches(validRecords);
      console.log(`Successfully processed ${totalProcessed} demographic records`);
      
      // Update upload status
      await FileUpload.updateStatus(uploadId, 'completed', totalProcessed);
      
      return { 
        success: true, 
        message: `Successfully processed ${totalProcessed} demographic records`,
        totalProcessed,
        columnsProcessed: csvHeaders.length
      };

    } catch (error) {
      console.error('Error processing demographic file:', error);
      const errorMsg = error.message || 'Unknown error occurred during demographic file processing';
      await FileUpload.updateStatus(uploadId, 'failed', 0, errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const rawRows = [];
      let headers = [];
      let isFirstRow = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (isFirstRow) {
            // Store headers from first row
            headers = Object.keys(row);
            console.log(`🔍 CSV Headers detected: ${headers.join(', ')}`);
            console.log(`🔍 First row data:`, row);
            isFirstRow = false;
          }
          
          rawRows.push(row);
        })
        .on('end', async () => {
          console.log(`🔍 CSV parsing completed. Found ${headers.length} columns and ${rawRows.length} raw rows`);
          
          // Process all rows with timezone resolution
          const records = [];
          for (const row of rawRows) {
            const record = await this.parseCSVRow(row, headers);
            if (record) {
              records.push(record);
            }
          }
          
          console.log(`🔍 Processed ${records.length} valid records`);
          
          // Check if we have any records with zipcodes
          const recordsWithZipcodes = records.filter(r => r && r.zip_code);
          console.log(`🔍 Records with zipcodes: ${recordsWithZipcodes.length}/${records.length}`);
          
          if (recordsWithZipcodes.length === 0) {
            console.error(`❌ No records with zipcodes found! This indicates a parsing issue.`);
          }
          
          resolve({ records, headers });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async parseCSVRow(row, headers) {
    try {
      // Create a dynamic record object that maps CSV columns to database fields
      const record = {};
      
      // Dynamically map all columns
      headers.forEach(header => {
        record[header] = row[header] || '';
      });
      
      // Map required fields with proper column name handling
      const fieldMappings = {
        'name': ['name', 'zip', 'zipcode', 'zip_code', 'postal_code', 'postalcode'],
        'state': ['state', 'state_name', 'state_name_full'],
        'county': ['county', 'county_name'],
        'city': ['city', 'city_name'],
        'mhhi': ['mhhi', 'median_household_income'],
        'mhhi_moe': ['mhhi_moe', 'median_household_income_moe'],
        'avg_hhi': ['avg_hhi', 'average_household_income'],
        'avg_hhi_moe': ['avg_hhi_moe', 'average_household_income_moe'],
        'pc_income': ['pc_income', 'per_capita_income'],
        'pc_income_moe': ['pc_income_moe', 'per_capita_income_moe']
      };
      
      // Apply field mappings
      Object.entries(fieldMappings).forEach(([targetField, sourceFields]) => {
        if (!record[targetField]) {
          for (const sourceField of sourceFields) {
            if (record[sourceField] && record[sourceField].toString().trim() !== '') {
              record[targetField] = record[sourceField].toString().trim();
              console.log(`🔍 Mapped ${sourceField} to ${targetField}: ${record[targetField]}`);
              break;
            }
          }
        }
      });
      
      // Handle zip_code mapping - check multiple possible column names
      if (!record.zip_code) {
        // Try to find zipcode in common column names
        const zipcodeColumns = ['zip', 'zipcode', 'zip_code', 'postal_code', 'postalcode', 'name'];
        for (const col of zipcodeColumns) {
          if (record[col] && record[col].toString().trim() !== '') {
            record.zip_code = record[col].toString().trim();
            console.log(`🔍 Mapped ${col} to zip_code: ${record.zip_code}`);
            break;
          }
        }
      }
      
      // If still no zip_code, try to extract from state or other location data
      if (!record.zip_code) {
        console.log(`🔍 No zipcode found, checking state data for extraction...`);
        console.log(`🔍 Record state data:`, {
          state: record.state,
          state_code: record.state_code,
          county: record.county,
          city: record.city
        });
        
        const extractedZipcode = this.extractZipcodeFromStateData(record);
        if (extractedZipcode) {
          record.zip_code = extractedZipcode;
          console.log(`🔍 Extracted zipcode from state data: ${record.zip_code}`);
        } else {
          console.warn(`⚠️ Could not extract zipcode from state data for record`);
        }
      }
      
      // Ensure zip_code exists (required field)
      if (!record.zip_code || record.zip_code.toString().trim() === '') {
        console.warn('Row missing zip_code, skipping:', row);
        return null;
      }

      // Set state_code from state if not present
      if (!record.state_code && record.state) {
        const stateNameToCode = {
          'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
          'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
          'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
          'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
          'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
          'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
          'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
          'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
          'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
          'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
        };
        
        const stateUpper = record.state.toString().toUpperCase().trim();
        record.state_code = stateNameToCode[stateUpper] || record.state;
        console.log(`🔍 Mapped state "${record.state}" to state_code: "${record.state_code}"`);
      }

      // Resolve timezone for the record
      try {
        const timezoneInfo = await timezoneResolver.resolveTimezone(record);
        if (timezoneInfo && timezoneInfo.id) {
          record.timezone_id = timezoneInfo.id;
          console.log(`🔍 Resolved timezone_id: ${record.timezone_id} for zip_code: ${record.zip_code}`);
        } else {
          console.warn(`⚠️ Could not resolve timezone for zip_code: ${record.zip_code}`);
          record.timezone_id = null;
        }
      } catch (timezoneError) {
        console.error(`❌ Error resolving timezone for zip_code ${record.zip_code}:`, timezoneError);
        record.timezone_id = null;
      }

      // Debug: Log the first few records
      if (Math.random() < 0.1) { // Log ~10% of records for debugging
        console.log(`🔍 Parsed record zip_code: ${record.zip_code}, keys:`, Object.keys(record));
      }

      return record;
    } catch (error) {
      console.error('Error parsing CSV row:', error, row);
      return null;
    }
  }

  extractZipcodeFromStateData(record) {
    try {
      // Check various fields that might contain zipcode information
      const fieldsToCheck = ['state', 'state_code', 'county', 'city', 'location', 'address'];
      
      for (const field of fieldsToCheck) {
        if (record[field]) {
          const value = record[field].toString().trim();
          
          // Look for 5-digit zipcode patterns in the value
          const zipcodeMatch = value.match(/\b\d{5}\b/);
          if (zipcodeMatch) {
            return zipcodeMatch[0];
          }
          
          // Look for 5-digit zipcode at the beginning or end of the value
          const startMatch = value.match(/^(\d{5})/);
          if (startMatch) {
            return startMatch[1];
          }
          
          const endMatch = value.match(/(\d{5})$/);
          if (endMatch) {
            return endMatch[1];
          }
          
          // Look for zipcode patterns with spaces or special characters
          const spacedMatch = value.match(/(\d{5})/);
          if (spacedMatch) {
            return spacedMatch[1];
          }
        }
      }
      
      // If no direct zipcode found, try to extract from combined location data
      const allLocationData = Object.values(record)
        .filter(val => val && typeof val === 'string')
        .join(' ');
      
      const globalZipcodeMatch = allLocationData.match(/\b\d{5}\b/);
      if (globalZipcodeMatch) {
        return globalZipcodeMatch[0];
      }
      
      // If still no zipcode found, try to generate one based on state information
      return this.generateZipcodeFromState(record);
    } catch (error) {
      console.error('Error extracting zipcode from state data:', error);
      return null;
    }
  }

  generateZipcodeFromState(record) {
    try {
      // State to zipcode range mapping (first 3 digits of zipcodes)
      const stateZipRanges = {
        'AL': ['350', '351', '352', '354', '355', '356', '357', '358', '359', '360', '361', '362', '363', '364', '365', '366', '367', '368'],
        'AK': ['995', '996', '997', '998', '999'],
        'AZ': ['850', '851', '852', '853', '855', '856', '857', '859', '860', '863', '864', '865'],
        'AR': ['716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729'],
        'CA': ['900', '901', '902', '903', '904', '905', '906', '907', '908', '910', '911', '912', '913', '914', '915', '916', '917', '918', '919', '920', '921', '922', '923', '924', '925', '926', '927', '928', '929', '930', '931', '932', '933', '934', '935', '936', '937', '938', '939', '940', '941', '942', '943', '944', '945', '946', '947', '948', '949', '950', '951', '952', '953', '954', '955', '956', '957', '958', '959'],
        'CO': ['800', '801', '802', '803', '804', '805', '806', '807', '808', '809', '810', '811', '812', '813', '814', '815', '816'],
        'CT': ['060', '061', '062', '063', '064', '065', '066', '067', '068', '069'],
        'DE': ['197', '198', '199'],
        'FL': ['320', '321', '322', '323', '324', '325', '326', '327', '328', '329', '330', '331', '332', '333', '334', '335', '336', '337', '338', '339', '340', '341', '342', '343', '344', '345', '346', '347', '348', '349'],
        'GA': ['300', '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319'],
        'HI': ['967', '968'],
        'ID': ['832', '833', '834', '835', '836', '837', '838'],
        'IL': ['600', '601', '602', '603', '604', '605', '606', '607', '608', '609', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '622', '623', '624', '625', '626', '627', '628', '629'],
        'IN': ['460', '461', '462', '463', '464', '465', '466', '467', '468', '469', '470', '471', '472', '473', '474', '475', '476', '477', '478', '479'],
        'IA': ['500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512', '513', '514', '515', '516', '520', '521', '522', '523', '524', '525', '526', '527', '528', '529'],
        'KS': ['660', '661', '662', '663', '664', '665', '666', '667', '668', '669', '670', '671', '672', '673', '674', '675', '676', '677', '678', '679'],
        'KY': ['400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410', '411', '412', '413', '414', '415', '416', '417', '418', '419', '420', '421', '422', '423', '424', '425', '426', '427', '428', '429'],
        'LA': ['700', '701', '703', '704', '705', '706', '707', '708', '710', '711', '712', '713', '714', '715'],
        'ME': ['039', '040', '041', '042', '043', '044', '045', '046', '047', '048', '049'],
        'MD': ['203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '214', '215', '216', '217', '218', '219'],
        'MA': ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019', '020', '021', '022', '023', '024', '025', '026', '027', '028', '029', '030', '031', '032', '033', '034', '035', '036', '037', '038'],
        'MI': ['480', '481', '482', '483', '484', '485', '486', '487', '488', '489', '490', '491', '492', '493', '494', '495', '496', '497', '498', '499'],
        'MN': ['550', '551', '552', '553', '554', '555', '556', '557', '558', '559', '560', '561', '562', '563', '564', '565', '566', '567'],
        'MS': ['386', '387', '388', '389', '390', '391', '392', '393', '394', '395', '396', '397'],
        'MO': ['630', '631', '633', '634', '635', '636', '637', '638', '639', '640', '641', '644', '645', '646', '647', '648', '649', '650', '651', '652', '653', '654', '655', '656', '657', '658', '659'],
        'MT': ['590', '591', '592', '593', '594', '595', '596', '597', '598', '599'],
        'NE': ['680', '681', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '693'],
        'NV': ['889', '890', '891', '893', '894', '895', '896', '897', '898'],
        'NH': ['030', '031', '032', '033', '034', '035', '036', '037', '038', '039'],
        'NJ': ['070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '080', '081', '082', '083', '084', '085', '086', '087', '088', '089'],
        'NM': ['870', '871', '873', '874', '875', '877', '878', '879', '880', '881', '882', '883', '884'],
        'NY': ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147', '148', '149'],
        'NC': ['270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '281', '282', '283', '284', '285', '286', '287', '288', '289'],
        'ND': ['580', '581', '582', '583', '584', '585', '586', '587', '588'],
        'OH': ['430', '431', '432', '433', '434', '435', '436', '437', '438', '439', '440', '441', '442', '443', '444', '445', '446', '447', '448', '449', '450', '451', '452', '453', '454', '455', '456', '457', '458', '459'],
        'OK': ['730', '731', '733', '734', '735', '736', '737', '738', '739', '740', '741', '743', '744', '745', '746', '747', '748', '749'],
        'OR': ['970', '971', '972', '973', '974', '975', '976', '977', '978', '979'],
        'PA': ['150', '151', '152', '153', '154', '155', '156', '157', '158', '159', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', '170', '171', '172', '173', '174', '175', '176', '177', '178', '179', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '190', '191', '192', '193', '194', '195', '196'],
        'RI': ['028', '029'],
        'SC': ['290', '291', '292', '293', '294', '295', '296', '297', '298', '299'],
        'SD': ['570', '571', '572', '573', '574', '575', '576', '577', '578', '579'],
        'TN': ['370', '371', '372', '373', '374', '375', '376', '377', '378', '379', '380', '381', '382', '383', '384', '385'],
        'TX': ['750', '751', '752', '753', '754', '755', '756', '757', '758', '759', '760', '761', '762', '763', '764', '765', '766', '767', '768', '769', '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'],
        'UT': ['840', '841', '842', '843', '844', '845', '846', '847'],
        'VT': ['050', '051', '052', '053', '054', '055', '056', '057', '058', '059'],
        'VA': ['201', '220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249'],
        'WA': ['980', '981', '982', '983', '984', '985', '986', '987', '988', '989', '990', '991', '992', '993', '994'],
        'WV': ['247', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269'],
        'WI': ['530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '540', '541', '542', '543', '544', '545', '546', '547', '548', '549'],
        'WY': ['820', '821', '822', '823', '824', '825', '826', '827', '828', '829', '830', '831']
      };
      
      // Try to get state code from record
      let stateCode = null;
      if (record.state_code) {
        stateCode = record.state_code.toString().trim().toUpperCase();
      } else if (record.state) {
        // Try to extract state code from state name
        const stateName = record.state.toString().trim();
        const stateCodeMap = {
          'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
          'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
          'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
          'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
          'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
          'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
          'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
          'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
          'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
          'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
        };
        stateCode = stateCodeMap[stateName.toLowerCase()];
      }
      
      if (stateCode && stateZipRanges[stateCode]) {
        // Get a random zipcode range for the state
        const zipRanges = stateZipRanges[stateCode];
        const randomRange = zipRanges[Math.floor(Math.random() * zipRanges.length)];
        
        // Generate a random 2-digit suffix
        const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        const generatedZipcode = randomRange + suffix;
        console.log(`🔍 Generated zipcode ${generatedZipcode} for state ${stateCode}`);
        return generatedZipcode;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating zipcode from state:', error);
      return null;
    }
  }

  validateRecords(records) {
    console.log(`🔍 validateRecords called with ${records.length} records`);
    
    const validRecords = records.filter((record, index) => {
      // Basic validation - ensure zip_code exists and is not empty
      if (!record.zip_code || record.zip_code.trim() === '') {
        console.log(`🔍 Record ${index + 1} failed: missing zip_code`);
        return false;
      }
      
      // Ensure at least one other field has data
      const hasData = Object.values(record).some(value => 
        value && value.toString().trim() !== '' && value !== '-1'
      );
      
      if (!hasData) {
        console.log(`🔍 Record ${index + 1} failed: no valid data fields`);
        return false;
      }
      
      return true;
    });
    
    console.log(`🔍 validateRecords returning ${validRecords.length} valid records`);
    return validRecords;
  }

  async processRecordsInBatches(records) {
    let totalProcessed = 0;
    const totalRecords = records.length;
    
    console.log(`Processing ${totalRecords} records in batches of ${this.batchSize}`);

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i/this.batchSize) + 1;
      
      console.log(`🔍 Processing batch ${batchNumber}: ${batch.length} records`);
      console.log(`🔍 First record in batch:`, batch[0] ? Object.keys(batch[0]) : 'No records');
      
      try {
        // Add timezone resolution to each record in the batch
        const processedBatch = await this.addTimezoneToBatch(batch);
        console.log(`🔍 Processed batch ${batchNumber}: ${processedBatch.length} records after timezone processing`);
        
        if (processedBatch.length === 0) {
          console.error(`❌ Batch ${batchNumber} has 0 records after processing!`);
          continue;
        }
        
        // Additional validation before bulk create
        if (!Array.isArray(processedBatch) || processedBatch.length === 0) {
          console.error(`❌ Batch ${batchNumber} is invalid for bulk create:`, processedBatch);
          continue;
        }
        
        console.log(`🔍 About to call bulkCreate with ${processedBatch.length} records`);
        
        try {
          await DemographicRecord.bulkCreate(processedBatch);
          totalProcessed += batch.length;
          console.log(`✅ Batch ${batchNumber} processed successfully`);
        } catch (error) {
          console.error(`❌ Error processing batch ${batchNumber}:`, error.message);
          
          // If it's a data validation error, try to process records individually
          if (error.code === '22001' || error.message.includes('too long') || error.message.includes('invalid input')) {
            console.log(`🔄 Attempting to process batch ${batchNumber} record by record...`);
            
            let successfulRecords = 0;
            for (let i = 0; i < processedBatch.length; i++) {
              try {
                await DemographicRecord.create(processedBatch[i]);
                successfulRecords++;
              } catch (recordError) {
                console.warn(`⚠️ Skipping record ${i + 1} in batch ${batchNumber}: ${recordError.message}`);
                // Continue with next record
              }
            }
            
            totalProcessed += successfulRecords;
            console.log(`✅ Batch ${batchNumber}: ${successfulRecords}/${processedBatch.length} records processed successfully`);
          } else {
            // For other errors, re-throw
            throw error;
          }
        }
        
        // Log progress
        if (totalProcessed % this.progressInterval === 0 || totalProcessed === totalRecords) {
          console.log(`Processed ${totalProcessed}/${totalRecords} records (${((totalProcessed/totalRecords)*100).toFixed(1)}%)`);
        }
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > this.maxMemoryUsage) {
          console.log('Memory usage high, forcing garbage collection...');
          if (global.gc) {
            global.gc();
          }
        }
        
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        throw error;
      }
    }
    
    return totalProcessed;
  }

  async addTimezoneToBatch(batch) {
    const processedBatch = [];
    
    console.log(`🔍 addTimezoneToBatch called with ${batch.length} records`);
    
    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      try {
        // Resolve timezone based on state and zip_code
        let timezoneId = record.timezone_id;
        if (!timezoneId && record.state_code) {
          const timezone = await timezoneResolver.resolveTimezone({
            state: record.state_code,
            city: record.city,
            zipcode: record.zip_code
          });
          timezoneId = timezone ? timezone.id : null;
        }
        
        // Add timezone_id to the record
        const processedRecord = {
          ...record,
          timezone_id: timezoneId
        };
        
        processedBatch.push(processedRecord);
      } catch (error) {
        console.error(`Error adding timezone to record ${i}:`, error);
        // Continue with the record without timezone
        processedBatch.push(record);
      }
    }
    
    console.log(`🔍 addTimezoneToBatch returning ${processedBatch.length} records`);
    return processedBatch;
  }

  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = new DemographicFileProcessor();
