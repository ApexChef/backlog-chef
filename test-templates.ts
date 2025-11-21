/**
 * Test Script: Template-Based Formatter
 *
 * Demonstrates the template-based formatter with real PBI data
 * Run: npx ts-node test-templates.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateBasedFormatter } from './src/formatters/template-based-formatter';

// Find most recent PBI JSON file
const outputDir = path.join(__dirname, 'output');
const runs = fs.readdirSync(outputDir)
  .filter(f => f.startsWith('run-'))
  .sort()
  .reverse();

if (runs.length === 0) {
  console.error('❌ No output directories found');
  process.exit(1);
}

const latestRun = path.join(outputDir, runs[0]);
const pbiFiles = fs.readdirSync(latestRun)
  .filter(f => f.startsWith('pbi-') && f.endsWith('.json'));

if (pbiFiles.length === 0) {
  console.error('❌ No PBI files found');
  process.exit(1);
}

const pbiPath = path.join(latestRun, pbiFiles[0]);
console.log(`📂 Loading: ${pbiPath}\n`);

// Load PBI data (note: this is a single PBI object, not a full pipeline output)
const pbiData = JSON.parse(fs.readFileSync(pbiPath, 'utf-8'));

// Wrap it in the format expected by the formatter
const wrappedPbi = {
  pbi: pbiData.pbi,
  scores: pbiData.quality,  // The formatter expects 'scores', file has 'quality'
  readiness: pbiData.readiness,
  tasks: pbiData.tasks,
  risks: pbiData.risks,
  questions: pbiData.questions,
};

console.log('🧪 Testing Template-Based Formatter\n');
console.log('═'.repeat(80));

// Test all three formats
const formats: Array<'obsidian' | 'devops' | 'confluence'> = ['obsidian', 'devops', 'confluence'];

for (const format of formats) {
  console.log(`\n\n📄 Format: ${format.toUpperCase()}`);
  console.log('─'.repeat(80));

  try {
    // Create formatter instance
    const formatter = new TemplateBasedFormatter(format);

    // Get format info
    console.log(`Name: ${formatter.getName()}`);
    console.log(`Extension: ${formatter.getFileExtension()}`);
    console.log(`Format ID: ${formatter.getFormatId()}\n`);

    // Format the PBI
    const runId = pbiData.metadata?.run_id || 'test-run';
    const output = formatter.formatPBI(wrappedPbi as any, runId);

    // Show preview
    const previewLength = 800;
    console.log(`Preview (first ${previewLength} chars):`);
    console.log('─'.repeat(80));
    console.log(output.substring(0, previewLength));
    if (output.length > previewLength) {
      console.log(`\n... (${output.length - previewLength} more characters)`);
    }

    // Save to temp file for inspection
    const tempDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFile = path.join(tempDir, `test-${format}${formatter.getFileExtension()}`);
    fs.writeFileSync(tempFile, output);
    console.log(`\n💾 Full output saved to: ${tempFile}`);

    console.log('\n✅ Success!');
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

console.log('\n\n' + '═'.repeat(80));
console.log('🎉 Test Complete!\n');
console.log('💡 Key Features:');
console.log('   ✓ Templates are user-editable .hbs files');
console.log('   ✓ No TypeScript knowledge required for customization');
console.log('   ✓ Format-specific helpers handle complex logic\n');
console.log('📁 Template locations:');
console.log('   • Obsidian:   src/templates/built-in/obsidian/main.hbs');
console.log('   • DevOps:     src/templates/built-in/devops/main.hbs');
console.log('   • Confluence: src/templates/built-in/confluence/main.hbs\n');
console.log('📚 Available Handlebars helpers:');
console.log('   • String:         uppercase, lowercase, truncate, capitalize');
console.log('   • Date:           formatDate');
console.log('   • Numbers:        round, percentage');
console.log('   • Arrays:         join, length, first, last, filter, map');
console.log('   • Conditionals:   eq, ne, gt, gte, lt, lte, and, or, not');
console.log('   • PBI-specific:   riskIcon, readinessIcon, scoreColor');
console.log('   • DevOps:         devopsState, devopsPriority, devopsTags');
console.log('   • Confluence:     confluenceRiskColor, confluenceStatusPanel, confluenceStatusIcon');
console.log('   • Markdown:       markdown, link, code, inlineCode, bold, italic');
console.log('   • JSON:           json, jsonPretty\n');
console.log('🔧 Try customizing a template:');
console.log('   1. Edit src/templates/built-in/obsidian/main.hbs');
console.log('   2. Run: npx ts-node test-templates.ts');
console.log('   3. Check tmp/test-obsidian.md for the result\n');
