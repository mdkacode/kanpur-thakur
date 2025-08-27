const fs = require('fs').promises;
const path = require('path');

async function checkServerFiles() {
    console.log('🔍 Checking Server File Structure...\n');
    
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`__dirname: ${__dirname}`);
    console.log(`Process platform: ${process.platform}`);
    
    // Check for scrap.py in various locations
    const possiblePaths = [
        './scrap.py',
        path.join(process.cwd(), 'scrap.py'),
        path.join(__dirname, 'scrap.py'),
        path.join(__dirname, '..', 'scrap.py'),
        path.join(__dirname, '..', '..', 'scrap.py'),
        path.join(__dirname, '..', '..', '..', 'scrap.py'),
        '/root/kanpur-thakur/scrap.py',
        '/app/scrap.py',
        '/var/www/scrap.py'
    ];
    
    console.log('\n📋 Checking for scrap.py:');
    for (const scriptPath of possiblePaths) {
        try {
            await fs.access(scriptPath);
            const stats = await fs.stat(scriptPath);
            console.log(`✅ Found: ${scriptPath} (${stats.size} bytes)`);
            
            // Try to read first few lines
            try {
                const content = await fs.readFile(scriptPath, 'utf8');
                const lines = content.split('\n').slice(0, 5);
                console.log(`   First 5 lines: ${lines.join(' | ')}`);
                
                // Check for key content
                const hasCSVPath = content.includes('CSV_PATH = os.path.join(os.getcwd(), "sample_input.csv")');
                const hasOutputFile = content.includes('OUTPUT_FILE = os.path.join(DOWNLOAD_DIR, "telcodata_bulk_output.csv")');
                console.log(`   Has CSV_PATH: ${hasCSVPath}`);
                console.log(`   Has OUTPUT_FILE: ${hasOutputFile}`);
            } catch (readError) {
                console.log(`   ❌ Could not read file: ${readError.message}`);
            }
        } catch (error) {
            console.log(`❌ Not found: ${scriptPath}`);
        }
    }
    
    // List files in current directory
    console.log('\n📋 Files in current directory:');
    try {
        const files = await fs.readdir(process.cwd());
        const pythonFiles = files.filter(f => f.endsWith('.py'));
        const allFiles = files.slice(0, 20); // Show first 20 files
        
        console.log(`Python files: ${pythonFiles.join(', ')}`);
        console.log(`All files (first 20): ${allFiles.join(', ')}`);
        
        if (files.length > 20) {
            console.log(`... and ${files.length - 20} more files`);
        }
    } catch (error) {
        console.log(`❌ Could not read current directory: ${error.message}`);
    }
    
    // Check parent directories
    console.log('\n📋 Checking parent directories:');
    const parentPaths = [
        path.join(process.cwd(), '..'),
        path.join(__dirname, '..'),
        path.join(__dirname, '..', '..'),
        path.join(__dirname, '..', '..', '..')
    ];
    
    for (const parentPath of parentPaths) {
        try {
            const files = await fs.readdir(parentPath);
            const pythonFiles = files.filter(f => f.endsWith('.py'));
            if (pythonFiles.length > 0) {
                console.log(`✅ ${parentPath}: ${pythonFiles.join(', ')}`);
            }
        } catch (error) {
            // Ignore directory access errors
        }
    }
}

checkServerFiles().catch(console.error);
