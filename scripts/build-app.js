#!/usr/bin/env node
/**
 * PM Wisdom Engine - App Builder
 * 
 * Bundles all data into a single HTML file for easy distribution.
 * 
 * Usage: npm run build
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  dataDir: path.join(__dirname, '../data'),
  srcDir: path.join(__dirname, '../src'),
  outputDir: path.join(__dirname, '../dist'),
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

function build() {
  console.log('🔨 PM Wisdom Engine - Building App');
  console.log('===================================\n');
  
  // Load all data files
  const data = {};
  const dataFiles = ['episodes', 'segments', 'frameworks', 'contradictions', 'insights', 'stats'];
  
  for (const file of dataFiles) {
    const filePath = path.join(CONFIG.dataDir, `${file}.json`);
    if (fs.existsSync(filePath)) {
      data[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`✅ Loaded ${file}.json`);
    } else {
      data[file] = [];
      console.log(`⚠️  ${file}.json not found, using empty array`);
    }
  }
  
  // Load the HTML template
  const templatePath = path.join(CONFIG.srcDir, 'app.html');
  if (!fs.existsSync(templatePath)) {
    console.error('❌ src/app.html not found');
    process.exit(1);
  }
  
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Inject data into template
  const dataScript = `<script>
window.PM_WISDOM_DATA = ${JSON.stringify(data)};
</script>`;
  
  template = template.replace('<!-- DATA_INJECTION_POINT -->', dataScript);
  
  // Write output
  const outputPath = path.join(CONFIG.outputDir, 'pm-wisdom-engine.html');
  fs.writeFileSync(outputPath, template);
  
  console.log(`\n💾 Built ${outputPath}`);
  console.log(`   Size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
  
  // Also copy to data directory for easy access
  const dataOutputPath = path.join(CONFIG.dataDir, 'pm-wisdom-engine.html');
  fs.writeFileSync(dataOutputPath, template);
  
  console.log('\n✨ Build complete!');
  console.log('\nTo use:');
  console.log(`   1. Open ${outputPath} in a browser`);
  console.log('   2. Or host it on any static web server');
}

build();
