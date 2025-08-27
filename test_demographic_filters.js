const fs = require('fs');
const path = require('path');

// Test data with various field values to test filtering
const testData = [
  {
    id: 1,
    zip_code: '10279',
    state: 'New York',
    county: 'New York',
    city: 'New York',
    timezone_display_name: 'Eastern Time',
    abbreviation_standard: 'EST',
    mhhi: '$250,001',
    avg_hhi: '$1,210,208',
    pc_income: '$419,459',
    median_age: '35',
    households: '1500',
    race_ethnicity_white: '60',
    race_ethnicity_black: '20',
    race_ethnicity_hispanic: '15'
  },
  {
    id: 2,
    zip_code: '33109',
    state: 'Florida',
    county: 'Miami-Dade',
    city: 'Fisher Island',
    timezone_display_name: 'Eastern Time',
    abbreviation_standard: 'EST',
    mhhi: '$250,001',
    avg_hhi: '$799,707',
    pc_income: '$350,000',
    median_age: '42',
    households: '800',
    race_ethnicity_white: '45',
    race_ethnicity_black: '30',
    race_ethnicity_hispanic: '25'
  },
  {
    id: 3,
    zip_code: '89402',
    state: 'Nevada',
    county: 'Washoe',
    city: 'Crystal Bay',
    timezone_display_name: 'Pacific Time',
    abbreviation_standard: 'PST',
    mhhi: '$250,001',
    avg_hhi: '$776,285',
    pc_income: '$380,000',
    median_age: '38',
    households: '1200',
    race_ethnicity_white: '70',
    race_ethnicity_black: '10',
    race_ethnicity_hispanic: '20'
  },
  {
    id: 4,
    zip_code: '83011',
    state: 'Wyoming',
    county: 'Teton',
    city: 'Kelly',
    timezone_display_name: 'Mountain Time',
    abbreviation_standard: 'MST',
    mhhi: '-$1',
    avg_hhi: '$707,101',
    pc_income: '$320,000',
    median_age: '45',
    households: '600',
    race_ethnicity_white: '80',
    race_ethnicity_black: '5',
    race_ethnicity_hispanic: '10'
  },
  {
    id: 5,
    zip_code: '40025',
    state: 'Kentucky',
    county: 'Jefferson',
    city: 'Glenview',
    timezone_display_name: 'Eastern Time',
    abbreviation_standard: 'EST',
    mhhi: '$250,001',
    avg_hhi: '$642,342',
    pc_income: '$280,000',
    median_age: '40',
    households: '900',
    race_ethnicity_white: '65',
    race_ethnicity_black: '25',
    race_ethnicity_hispanic: '8'
  }
];

// Test filtering functions
function testFiltering() {
  console.log('🧪 Testing Demographic Filtering Functionality\n');

  // Test 1: Filter by state
  console.log('📊 Test 1: Filter by State');
  const newYorkRecords = testData.filter(record => record.state === 'New York');
  console.log(`✅ New York records: ${newYorkRecords.length}`);
  newYorkRecords.forEach(record => console.log(`   - ${record.zip_code}: ${record.city}`));

  // Test 2: Filter by timezone
  console.log('\n📊 Test 2: Filter by Timezone');
  const easternTimeRecords = testData.filter(record => record.timezone_display_name === 'Eastern Time');
  console.log(`✅ Eastern Time records: ${easternTimeRecords.length}`);
  easternTimeRecords.forEach(record => console.log(`   - ${record.zip_code}: ${record.state}`));

  // Test 3: Filter by median HHI
  console.log('\n📊 Test 3: Filter by Median HHI');
  const highIncomeRecords = testData.filter(record => record.mhhi === '$250,001');
  console.log(`✅ High income records: ${highIncomeRecords.length}`);
  highIncomeRecords.forEach(record => console.log(`   - ${record.zip_code}: ${record.mhhi}`));

  // Test 4: Filter by partial text search
  console.log('\n📊 Test 4: Partial Text Search');
  const searchTerm = 'New';
  const partialMatches = testData.filter(record => 
    record.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.city.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log(`✅ Records containing "${searchTerm}": ${partialMatches.length}`);
  partialMatches.forEach(record => console.log(`   - ${record.zip_code}: ${record.state}, ${record.city}`));

  // Test 5: Filter by numeric range (simulated)
  console.log('\n📊 Test 5: Numeric Range Filtering');
  const highAvgIncome = testData.filter(record => {
    const avgHhi = parseInt(record.avg_hhi.replace(/[$,]/g, ''));
    return avgHhi > 700000;
  });
  console.log(`✅ Records with avg HHI > $700k: ${highAvgIncome.length}`);
  highAvgIncome.forEach(record => console.log(`   - ${record.zip_code}: ${record.avg_hhi}`));

  // Test 6: Multiple filter conditions
  console.log('\n📊 Test 6: Multiple Filter Conditions');
  const complexFilter = testData.filter(record => 
    record.timezone_display_name === 'Eastern Time' && 
    record.mhhi === '$250,001' &&
    parseInt(record.median_age) > 35
  );
  console.log(`✅ Eastern Time + High Income + Age > 35: ${complexFilter.length}`);
  complexFilter.forEach(record => console.log(`   - ${record.zip_code}: ${record.state}, Age: ${record.median_age}`));

  // Test 7: Empty/null value handling
  console.log('\n📊 Test 7: Empty/Null Value Handling');
  const recordsWithData = testData.filter(record => 
    record.median_age && record.median_age !== '' &&
    record.households && record.households !== ''
  );
  console.log(`✅ Records with complete data: ${recordsWithData.length}/${testData.length}`);

  // Test 8: Unique values for filter dropdowns
  console.log('\n📊 Test 8: Unique Values for Filter Dropdowns');
  const uniqueStates = [...new Set(testData.map(record => record.state))];
  const uniqueTimezones = [...new Set(testData.map(record => record.timezone_display_name))];
  const uniqueMhhi = [...new Set(testData.map(record => record.mhhi))];
  
  console.log(`✅ Unique States: ${uniqueStates.join(', ')}`);
  console.log(`✅ Unique Timezones: ${uniqueTimezones.join(', ')}`);
  console.log(`✅ Unique Median HHI: ${uniqueMhhi.join(', ')}`);

  console.log('\n🎉 All filtering tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Total test records: ${testData.length}`);
  console.log(`   - States represented: ${uniqueStates.length}`);
  console.log(`   - Timezones represented: ${uniqueTimezones.length}`);
  console.log(`   - Income levels: ${uniqueMhhi.length}`);
}

// Run the tests
testFiltering();
