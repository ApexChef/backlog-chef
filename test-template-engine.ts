/**
 * Quick test script for the template engine
 */

import { TemplateEngine } from './src/templates/engine';
import fs from 'fs';

async function test() {
  console.log('🧪 Testing Template Engine\n');

  // Create engine
  const engine = new TemplateEngine();

  // List available formats
  console.log('📋 Available formats:', engine.listFormats());
  console.log('');

  // Check if obsidian format exists
  const hasObsidian = engine.hasFormat('obsidian');
  console.log('✅ Obsidian format available:', hasObsidian);
  console.log('');

  if (!hasObsidian) {
    console.error('❌ Obsidian format not found!');
    process.exit(1);
  }

  // Load a real PBI output for testing
  const testDataPath = './project-backlog-items/output/011-template-based-formatters/summary.json';

  if (!fs.existsSync(testDataPath)) {
    console.error(`❌ Test data not found: ${testDataPath}`);
    process.exit(1);
  }

  const summaryData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  const pbiData = summaryData.pbis[0]; // Get first PBI

  console.log('📄 Testing with PBI:', pbiData.pbi.id);
  console.log('');

  // Render template
  try {
    const result = await engine.render({
      format: 'obsidian',
      context: {
        pbi: pbiData,
        metadata: {
          run_id: summaryData.metadata.run_id,
          created: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Template rendered successfully!');
    console.log('📝 File extension:', result.fileExtension);
    console.log('📏 Content length:', result.content.length, 'characters');
    console.log('');
    console.log('--- First 500 characters ---');
    console.log(result.content.substring(0, 500));
    console.log('');

    // Write to file for inspection
    const outputPath = './test-output.md';
    fs.writeFileSync(outputPath, result.content, 'utf-8');
    console.log('💾 Full output written to:', outputPath);
    console.log('');
    console.log('🎉 Template engine test PASSED!');
  } catch (error) {
    console.error('❌ Template rendering failed:', error);
    process.exit(1);
  }
}

test().catch(console.error);
