const FileUpload = require('./src/models/FileUpload');

async function testUploadFix() {
  try {
    console.log('🧪 Testing upload sequence fix...');
    console.log('=====================================');

    // Test 1: Create a normal upload
    console.log('📝 Test 1: Creating normal upload...');
    const uploadData1 = {
      filename: 'test-upload-1.txt',
      originalName: 'test-upload-1.txt',
      fileSize: 1024,
      filePath: '/uploads/test-upload-1.txt',
      fileType: 'test'
    };

    const upload1 = await FileUpload.create(uploadData1);
    console.log(`✅ Upload 1 created with ID: ${upload1.id}`);

    // Test 2: Create another upload
    console.log('📝 Test 2: Creating second upload...');
    const uploadData2 = {
      filename: 'test-upload-2.txt',
      originalName: 'test-upload-2.txt',
      fileSize: 2048,
      filePath: '/uploads/test-upload-2.txt',
      fileType: 'test'
    };

    const upload2 = await FileUpload.create(uploadData2);
    console.log(`✅ Upload 2 created with ID: ${upload2.id}`);

    // Test 3: Check sequence state
    console.log('📝 Test 3: Checking sequence state...');
    const { fixSequence } = require('./fix_database_sequences');
    await fixSequence();

    // Test 4: Create another upload after sequence fix
    console.log('📝 Test 4: Creating upload after sequence fix...');
    const uploadData3 = {
      filename: 'test-upload-3.txt',
      originalName: 'test-upload-3.txt',
      fileSize: 3072,
      filePath: '/uploads/test-upload-3.txt',
      fileType: 'test'
    };

    const upload3 = await FileUpload.create(uploadData3);
    console.log(`✅ Upload 3 created with ID: ${upload3.id}`);

    // Clean up test records
    console.log('🧹 Cleaning up test records...');
    await FileUpload.delete(upload1.id);
    await FileUpload.delete(upload2.id);
    await FileUpload.delete(upload3.id);
    console.log('✅ Test records cleaned up');

    console.log('\n🎉 All upload tests passed!');
    console.log('=====================================');
    console.log('📝 Summary:');
    console.log('   - Normal uploads: ✅ Working');
    console.log('   - Sequence fix: ✅ Working');
    console.log('   - Post-fix uploads: ✅ Working');
    console.log('   - Cleanup: ✅ Working');

  } catch (error) {
    console.error('💥 Test failed:', error);
    throw error;
  }
}

// Run the test
testUploadFix()
  .then(() => {
    console.log('\n🎉 Upload sequence fix test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Upload sequence fix test failed:', error);
    process.exit(1);
  });
