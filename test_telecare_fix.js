const fs = require('fs');
const path = require('path');

console.log('🔍 Testing TelecareProcessor Fixes...\n');

// Check if the telecare processor file exists
const processorPath = path.join(process.cwd(), 'src', 'services', 'telecareProcessor.js');
if (!fs.existsSync(processorPath)) {
    console.log('❌ TelecareProcessor not found:', processorPath);
    process.exit(1);
}

console.log('✅ TelecareProcessor found:', processorPath);

// Read the processor to check the fixes
const processorContent = fs.readFileSync(processorPath, 'utf8');

// Check for the fixes
const hasRunIdParameter = processorContent.includes('async runPythonScript(inputCsvPath, zipcode, runId)');
const hasRunIdPassed = processorContent.includes('pythonResult = await this.runPythonScript(inputCsv, zipcode, run.id)');
const hasOutputFilePathReturn = processorContent.includes('return { ...result, outputFilePath }');
const hasOutputFilePathUsed = processorContent.includes('outputContent = await fs.readFile(pythonResult.outputFilePath');

console.log('\n📋 Fix Verification:');
console.log(`   ${hasRunIdParameter ? '✅' : '❌'} runPythonScript accepts runId parameter`);
console.log(`   ${hasRunIdPassed ? '✅' : '❌'} runId is passed to runPythonScript`);
console.log(`   ${hasOutputFilePathReturn ? '✅' : '❌'} outputFilePath is returned from runPythonScript`);
console.log(`   ${hasOutputFilePathUsed ? '✅' : '❌'} outputFilePath is used in processTelecareData`);

// Check for argument passing
const hasProperArgs = processorContent.includes('tempScriptPath, tempInputPath, outputFilePath, \'--zipcode\', zipcode, \'--run-id\', runId.toString()');
const hasNoScriptModification = !processorContent.includes('scriptContent.replace(');

console.log('\n📋 Argument Handling:');
console.log(`   ${hasProperArgs ? '✅' : '❌'} Proper arguments passed to Python script`);
console.log(`   ${hasNoScriptModification ? '✅' : '❌'} No script content modification (uses command-line args)`);

// Check for cleanup
const hasOutputFileCleanup = processorContent.includes('await this.cleanupTempFile(outputFilePath)');

console.log('\n📋 Cleanup:');
console.log(`   ${hasOutputFileCleanup ? '✅' : '❌'} Output file cleanup included`);

console.log('\n🎯 Summary:');
if (hasRunIdParameter && hasRunIdPassed && hasOutputFilePathReturn && hasOutputFilePathUsed && hasProperArgs) {
    console.log('   ✅ All fixes applied successfully');
    console.log('   ✅ TelecareProcessor should now work without errors');
} else {
    console.log('   ❌ Some fixes may be missing');
}

console.log('\n📋 Next Steps:');
console.log('   1. Update credentials in scrap_improved.py');
console.log('   2. Install ChromeDriver using the provided scripts');
console.log('   3. Test with a single zipcode');
console.log('   4. Monitor Processing Sessions tab for job status');
