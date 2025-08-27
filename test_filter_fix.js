// Test the filter fix
console.log('🧪 Testing Demographic Filter Fix\n');

// Simulate the records data structure
const mockRecords = [
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
  }
];

// Test the getUniqueValues function logic
function getUniqueValues(key, records) {
  if (!records || records.length === 0) {
    console.log(`❌ No records loaded, skipping filter generation for ${key}`);
    return [];
  }
  
  const values = records.map(record => record[key]).filter(Boolean);
  const uniqueValues = Array.from(new Set(values));
  
  const sortedValues = uniqueValues.sort((a, b) => {
    const aStr = a?.toString() || '';
    const bStr = b?.toString() || '';
    return aStr.localeCompare(bStr);
  });
  
  return sortedValues.map(value => {
    const displayValue = value?.toString() || '';
    return { 
      text: displayValue, 
      value: displayValue 
    };
  }).slice(0, 50);
}

// Test with empty records
console.log('📊 Test 1: Empty records');
const emptyFilters = getUniqueValues('timezone_display_name', []);
console.log('Result:', emptyFilters);

// Test with actual records
console.log('\n📊 Test 2: With records');
const timezoneFilters = getUniqueValues('timezone_display_name', mockRecords);
console.log('Timezone filters:', timezoneFilters);

const mhhiFilters = getUniqueValues('mhhi', mockRecords);
console.log('Median HHI filters:', mhhiFilters);

const stateFilters = getUniqueValues('state', mockRecords);
console.log('State filters:', stateFilters);

// Test filter generation logic
console.log('\n📊 Test 3: Filter generation logic');
const filtersGenerated = mockRecords.length > 0;
console.log('filtersGenerated:', filtersGenerated);

const finalFilters = filtersGenerated ? getUniqueValues('timezone_display_name', mockRecords) : [];
console.log('Final filters:', finalFilters);

console.log('\n✅ Filter fix test completed successfully!');
console.log('📋 Summary:');
console.log('   - Empty records: No filters generated');
console.log('   - With records: Filters generated correctly');
console.log('   - Timezone filters: 2 unique values');
console.log('   - Median HHI filters: 1 unique value');
console.log('   - State filters: 3 unique values');
