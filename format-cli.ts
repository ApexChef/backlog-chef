#!/usr/bin/env ts-node
/**
 * Simple CLI to test template-based formatters
 *
 * Usage:
 *   npx ts-node format-cli.ts <pbi-file.json> [format]
 *   npx ts-node format-cli.ts output/run-123/pbi-PBI-001.json obsidian
 *   npx ts-node format-cli.ts output/run-123/pbi-PBI-001.json devops
 *   npx ts-node format-cli.ts output/run-123/pbi-PBI-001.json confluence
 *   npx ts-node format-cli.ts output/run-123/pbi-PBI-001.json all
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateBasedFormatter } from './src/formatters/template-based-formatter';
import { OutputFormat } from './src/formatters/types';

// Get arguments
const pbiFile = process.argv[2];
const formatArg = process.argv[3] || 'all';

if (!pbiFile || pbiFile === '--help') {
  console.log(`
🧪 Template Formatter CLI Test

Usage:
  npx ts-node format-cli.ts <pbi-file.json> [format]

Arguments:
  pbi-file.json    Path to PBI JSON file
  format           obsidian, devops, confluence, or all (default: all)

Examples:
  npx ts-node format-cli.ts output/run-1763651353296/pbi-PBI-001.json
  npx ts-node format-cli.ts output/run-1763651353296/pbi-PBI-001.json obsidian
  npx ts-node format-cli.ts output/run-1763651353296/pbi-PBI-001.json devops
`);
  process.exit(0);
}

// Validate file exists
if (!fs.existsSync(pbiFile)) {
  console.error(`❌ File not found: ${pbiFile}`);
  process.exit(1);
}

// Load PBI data
console.log(`📂 Loading: ${pbiFile}\n`);
const pbiData = JSON.parse(fs.readFileSync(pbiFile, 'utf-8'));

// Wrap in expected format
const wrappedPbi = {
  pbi: pbiData.pbi,
  scores: pbiData.quality || pbiData.scores,
  readiness: pbiData.readiness,
  tasks: pbiData.tasks,
  risks: pbiData.risks,
  questions: pbiData.questions,
};

// Determine formats to generate
const formats: OutputFormat[] = formatArg === 'all'
  ? ['obsidian', 'devops', 'confluence']
  : [formatArg as OutputFormat];

// Create output directory
const outputDir = path.join(__dirname, 'formatted-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`🎨 Formatting PBI: ${wrappedPbi.pbi?.id || 'Unknown'}\n`);
console.log('═'.repeat(80));

// Generate each format
for (const format of formats) {
  console.log(`\n📄 Format: ${format.toUpperCase()}`);
  console.log('─'.repeat(80));

  try {
    const formatter = new TemplateBasedFormatter(format);
    const runId = pbiData.metadata?.run_id || new Date().toISOString();
    const output = formatter.formatPBI(wrappedPbi as any, runId);

    // Save to file
    const fileName = `${wrappedPbi.pbi?.id || 'pbi'}-${format}${formatter.getFileExtension()}`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, output);

    // Show preview
    console.log(`\nPreview (first 400 chars):`);
    console.log(output.substring(0, 400));
    if (output.length > 400) {
      console.log(`\n... (${output.length - 400} more characters)`);
    }

    console.log(`\n💾 Saved to: ${filePath}`);
    console.log(`✅ Success!`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`\n🎉 Done! All output saved to: ${outputDir}\n`);
