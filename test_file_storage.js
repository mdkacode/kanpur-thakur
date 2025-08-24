const fileStorageService = require('./src/services/fileStorageService');

async function testFileStorage() {
  console.log('🧪 Testing File Storage Service...\n');

  try {
    // Test 1: Ensure directories exist
    console.log('1️⃣ Testing directory creation...');
    await fileStorageService.ensureDirectories();
    console.log('✅ Directories created/verified\n');

    // Test 2: Store input file
    console.log('2️⃣ Testing input file storage...');
    const testZipcode = '20560';
    const testRunId = 'test-run-123';
    const testCsvContent = 'NPA,NXX\n201,201\n201,202\n201,203';
    
    const inputResult = await fileStorageService.storeInputFile(
      testZipcode, 
      testRunId, 
      testCsvContent, 
      'queried_20560_npa_nxx_2025-08-24_12-34-56.csv'
    );
    
    if (inputResult.success) {
      console.log('✅ Input file stored successfully');
      console.log('   Path:', inputResult.filePath);
      console.log('   Size:', inputResult.size, 'bytes\n');
    } else {
      console.log('❌ Input file storage failed:', inputResult.error);
    }

    // Test 3: Store output file
    console.log('3️⃣ Testing output file storage...');
    const outputCsvContent = 'NPA,NXX,THOUSANDS,COMPANY_TYPE\n201,201,,WIRELESS\n201,202,0,CLEC\n201,203,1,CLEC';
    
    const outputResult = await fileStorageService.storeOutputFile(
      testZipcode, 
      testRunId, 
      outputCsvContent, 
      'queried_20560_python_output_1735123456789.csv'
    );
    
    if (outputResult.success) {
      console.log('✅ Output file stored successfully');
      console.log('   Path:', outputResult.filePath);
      console.log('   Size:', outputResult.size, 'bytes\n');
    } else {
      console.log('❌ Output file storage failed:', outputResult.error);
    }

    // Test 4: Store script log
    console.log('4️⃣ Testing script log storage...');
    const logContent = 'Python script executed successfully\nOutput: 3 rows processed\nStatus: OK';
    
    const logResult = await fileStorageService.storeScriptLog(
      testZipcode, 
      testRunId, 
      logContent
    );
    
    if (logResult.success) {
      console.log('✅ Script log stored successfully');
      console.log('   Path:', logResult.filePath, '\n');
    } else {
      console.log('❌ Script log storage failed:', logResult.error);
    }

    // Test 5: Get run file info
    console.log('5️⃣ Testing file info retrieval...');
    const fileInfo = await fileStorageService.getRunFileInfo(testZipcode, testRunId);
    
    if (fileInfo) {
      console.log('✅ File info retrieved successfully');
      console.log('   Input path:', fileInfo.inputPath);
      console.log('   Output path:', fileInfo.outputPath);
      console.log('   Log path:', fileInfo.logPath);
      console.log('   Date path:', fileInfo.datePath, '\n');
    } else {
      console.log('❌ File info retrieval failed\n');
    }

    // Test 6: List files by today's date
    console.log('6️⃣ Testing file listing by date...');
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const files = await fileStorageService.listFilesByDate(dateString);
    console.log('✅ Files listed for date:', dateString);
    console.log('   Input files:', files.input.length);
    console.log('   Output files:', files.output.length);
    console.log('   Log files:', files.logs.length, '\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📁 Check the telecare_files directory for the organized file structure:');
    console.log('   ./telecare_files/');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testFileStorage();
