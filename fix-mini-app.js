const fs = require('fs');
const path = require('path');

console.log('🔧 MINI APP TROUBLESHOOTING TOOL');
console.log('================================');
console.log();

// Check if frontend directory exists
const frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendPath)) {
    console.log('❌ Frontend directory not found!');
    console.log('   Make sure you have a "frontend" folder');
    process.exit(1);
}

// Check package.json in frontend
const frontendPackageJson = path.join(frontendPath, 'package.json');
if (fs.existsSync(frontendPackageJson)) {
    console.log('✅ Frontend package.json found');
    
    const packageData = JSON.parse(fs.readFileSync(frontendPackageJson, 'utf8'));
    console.log(`   Name: ${packageData.name || 'Unknown'}`);
    console.log(`   Scripts available: ${Object.keys(packageData.scripts || {}).join(', ')}`);
} else {
    console.log('❌ Frontend package.json not found!');
}

// Check if node_modules exists in frontend
const frontendNodeModules = path.join(frontendPath, 'node_modules');
if (fs.existsSync(frontendNodeModules)) {
    console.log('✅ Frontend dependencies installed');
} else {
    console.log('❌ Frontend dependencies not installed!');
    console.log('   Run: cd frontend && npm install');
}

// Check main frontend files
const mainFiles = ['src/main.jsx', 'src/App.jsx', 'index.html'];
mainFiles.forEach(file => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing!`);
    }
});

console.log();
console.log('🎯 SOLUTIONS:');
console.log();

// Provide solutions
console.log('1. DIRECT BROWSER TEST:');
console.log('   Run: test-frontend.bat');
console.log('   Then open: http://localhost:3000');
console.log();

console.log('2. INSTALL DEPENDENCIES:');
console.log('   cd frontend');
console.log('   npm install');
console.log('   npm run dev');
console.log();

console.log('3. ALTERNATIVE MINI APP ACCESS:');
console.log('   • Desktop browser: http://localhost:3000');
console.log('   • Mobile browser: Use ngrok tunnel');
console.log('   • Telegram Desktop: Works with localhost');
console.log();

console.log('4. BYPASS TELEGRAM WEB APP:');
console.log('   Add regular URL buttons instead of webApp buttons');
console.log();
