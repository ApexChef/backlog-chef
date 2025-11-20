import fs from 'fs';
import path from 'path';
import { config, validateConfig } from './config/app.config';
import { MarkdownFormatter } from './formatters/markdown-formatter';
import { DevOpsFormatter } from './formatters/devops-formatter';
import { ConfluenceFormatter } from './formatters/confluence-formatter';
import { logInfo, logError } from './utils/logger';
import {
  ReadinessAssessmentInput,
  Formatter,
  OutputFormat,
  OutputResult,
  ProcessingResult
} from './types';

async function main() {
  const startTime = Date.now();

  try {
    logInfo('\n' + '='.repeat(80));
    logInfo('BACKLOG CHEF - STEP 8: FINAL OUTPUT');
    logInfo('='.repeat(80) + '\n');

    // Validate configuration
    logInfo('Validating configuration...');
    validateConfig();
    logInfo('✓ Configuration valid\n');

    // Load input from Step 7
    logInfo(`Loading readiness assessment from: ${config.paths.input}`);
    const input = loadInput(config.paths.input);
    logInfo(`✓ Loaded ${input.readiness_assessment.length} PBIs\n`);

    // Initialize formatters
    logInfo('Initializing formatters...');
    const formatters = initializeFormatters();
    logInfo(`✓ Initialized ${formatters.length} formatters: ${formatters.map(f => f.getName()).join(', ')}\n`);

    // Generate outputs
    logInfo(`\nGenerating outputs for ${config.outputFormats.length} format(s)...`);
    const results: OutputResult[] = [];

    for (const format of config.outputFormats) {
      const formatter = formatters.find(f => f.getFileExtension() === getExtensionForFormat(format));

      if (!formatter) {
        logError(`No formatter found for format: ${format}`);
        continue;
      }

      logInfo(`\nProcessing format: ${formatter.getName()}`);

      // Create output directory
      const outputDir = path.join(config.paths.outputDir, format);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate summary file
      const summaryResult = generateSummary(input, formatter, outputDir);
      results.push(summaryResult);

      // Generate individual PBI files
      for (const pbi of input.readiness_assessment) {
        const pbiResult = generatePBIOutput(pbi, formatter, outputDir);
        results.push(pbiResult);
      }

      logInfo(`✓ Generated ${input.readiness_assessment.length + 1} files for ${formatter.getName()}`);
    }

    // Display summary
    const processingResult = buildProcessingResult(results, input, startTime);
    displaySummary(processingResult);

    logInfo('\n' + '='.repeat(80));
    logInfo('✓ STEP 8 COMPLETED SUCCESSFULLY');
    logInfo('='.repeat(80) + '\n');
  } catch (error) {
    logError('Fatal error in Step 8', error as Error);
    process.exit(1);
  }
}

function loadInput(filePath: string): ReadinessAssessmentInput {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.readiness_assessment || !Array.isArray(data.readiness_assessment)) {
      throw new Error('Invalid input format: missing readiness_assessment array');
    }

    return data as ReadinessAssessmentInput;
  } catch (error) {
    logError('Failed to load input file', error as Error);
    throw error;
  }
}

function initializeFormatters(): Formatter[] {
  return [
    new MarkdownFormatter(),
    new DevOpsFormatter(),
    new ConfluenceFormatter()
  ];
}

function getExtensionForFormat(format: OutputFormat): string {
  switch (format) {
    case 'markdown':
      return '.md';
    case 'devops':
    case 'confluence':
      return '.txt';
  }
}

function generateSummary(
  input: ReadinessAssessmentInput,
  formatter: Formatter,
  outputDir: string
): OutputResult {
  try {
    const content = formatter.formatSummary(input);
    const filename = `summary${formatter.getFileExtension()}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, content, 'utf-8');

    return {
      format: getFormatFromExtension(formatter.getFileExtension()),
      success: true,
      filepath,
      size: content.length
    };
  } catch (error) {
    return {
      format: getFormatFromExtension(formatter.getFileExtension()),
      success: false,
      filepath: path.join(outputDir, 'summary' + formatter.getFileExtension()),
      size: 0,
      error: (error as Error).message
    };
  }
}

function generatePBIOutput(
  pbi: any,
  formatter: Formatter,
  outputDir: string
): OutputResult {
  try {
    const content = formatter.format(pbi);
    const filename = `${pbi.pbi_id}${formatter.getFileExtension()}`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, content, 'utf-8');

    return {
      format: getFormatFromExtension(formatter.getFileExtension()),
      success: true,
      filepath,
      size: content.length
    };
  } catch (error) {
    return {
      format: getFormatFromExtension(formatter.getFileExtension()),
      success: false,
      filepath: path.join(outputDir, pbi.pbi_id + formatter.getFileExtension()),
      size: 0,
      error: (error as Error).message
    };
  }
}

function getFormatFromExtension(ext: string): OutputFormat {
  if (ext === '.md') return 'markdown';
  // This is a simplification - in production, you'd need more context
  return 'devops';
}

function buildProcessingResult(
  results: OutputResult[],
  input: ReadinessAssessmentInput,
  startTime: number
): ProcessingResult {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    outputs: results,
    total_pbis: input.readiness_assessment.length,
    total_outputs: results.length,
    success_count: successCount,
    failure_count: failureCount,
    processing_duration_ms: Date.now() - startTime
  };
}

function displaySummary(result: ProcessingResult): void {
  logInfo('\n' + '='.repeat(80));
  logInfo('OUTPUT GENERATION SUMMARY');
  logInfo('='.repeat(80));
  logInfo(`Total PBIs Processed:      ${result.total_pbis}`);
  logInfo(`Total Files Generated:     ${result.total_outputs}`);
  logInfo(`Successful:                ${result.success_count}`);
  logInfo(`Failed:                    ${result.failure_count}`);
  logInfo(`Processing Duration:       ${(result.processing_duration_ms / 1000).toFixed(2)}s`);
  logInfo('='.repeat(80));

  // Group by format
  const byFormat = new Map<OutputFormat, OutputResult[]>();
  for (const output of result.outputs) {
    if (!byFormat.has(output.format)) {
      byFormat.set(output.format, []);
    }
    byFormat.get(output.format)!.push(output);
  }

  logInfo('\nOutput Files by Format:');
  for (const [format, outputs] of byFormat) {
    const successfulOutputs = outputs.filter(o => o.success);
    logInfo(`\n${format.toUpperCase()}:`);
    logInfo(`  Files: ${successfulOutputs.length}/${outputs.length}`);
    logInfo(`  Total Size: ${successfulOutputs.reduce((sum, o) => sum + o.size, 0).toLocaleString()} bytes`);

    if (successfulOutputs.length > 0) {
      logInfo(`  Location: ${path.dirname(successfulOutputs[0].filepath)}`);
    }
  }

  // Show failures if any
  const failures = result.outputs.filter(o => !o.success);
  if (failures.length > 0) {
    logInfo('\n⚠️  FAILURES:');
    for (const failure of failures) {
      logInfo(`  ${failure.filepath}: ${failure.error}`);
    }
  }

  logInfo('');
}

// Run the main function
main().catch(error => {
  logError('Unhandled error', error);
  process.exit(1);
});
