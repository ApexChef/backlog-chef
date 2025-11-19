import fs from 'fs';
import yaml from 'js-yaml';
import { config, validateConfig } from './config/app.config';
import { ClaudeAPIClient } from './services/claude-api-client';
import { ReadinessChecker } from './services/readiness-checker';
import { logInfo, logError } from './utils/logger';
import { costTracker } from './utils/cost-tracker';
import {
  Step6Input,
  DefinitionOfReadyConfig,
  ReadinessAssessmentOutput,
  PBIReadinessAssessment
} from './types';

async function main() {
  const startTime = Date.now();

  try {
    logInfo('\n' + '='.repeat(80));
    logInfo('BACKLOG CHEF - STEP 7: RUN READINESS CHECKER');
    logInfo('='.repeat(80) + '\n');

    // Validate configuration
    logInfo('Validating configuration...');
    validateConfig();
    logInfo('✓ Configuration valid\n');

    // Load input from Step 6
    logInfo(`Loading input from: ${config.paths.input}`);
    const inputData = loadInput(config.paths.input);
    logInfo(`✓ Loaded ${inputData.questions_and_proposals.length} PBIs with questions\n`);

    // Load Definition of Ready config
    logInfo(`Loading Definition of Ready from: ${config.paths.definitionOfReady}`);
    const dorConfig = loadDefinitionOfReady(config.paths.definitionOfReady);
    logInfo(`✓ Loaded ${dorConfig.criteria.blocking.length} blocking, ${dorConfig.criteria.warning.length} warning, ${dorConfig.criteria.suggestion.length} suggestion criteria\n`);

    // Initialize services
    logInfo('Initializing Claude API client...');
    const apiClient = new ClaudeAPIClient();
    logInfo('✓ Claude API client initialized\n');

    logInfo('Initializing Readiness Checker...');
    const checker = new ReadinessChecker(apiClient, dorConfig);
    logInfo('✓ Readiness Checker initialized\n');

    // Process each PBI
    logInfo(`\nProcessing ${inputData.questions_and_proposals.length} PBIs...`);
    const assessments: PBIReadinessAssessment[] = [];

    for (const pbi of inputData.questions_and_proposals) {
      const assessment = await checker.evaluatePBI(pbi);
      assessments.push(assessment);
    }

    // Generate output
    const output = buildOutput(assessments, inputData, startTime);

    // Save results
    saveOutput(config.paths.output, output);

    // Save cost tracking
    await costTracker.saveToFile(config.paths.output.replace(/\/[^/]+$/, ''));

    // Display summary
    displaySummary(output);

    // Display cost summary
    costTracker.logSummary();

    logInfo('\n' + '='.repeat(80));
    logInfo('✓ STEP 7 COMPLETED SUCCESSFULLY');
    logInfo('='.repeat(80) + '\n');
  } catch (error) {
    logError('Fatal error in Step 7', error as Error);
    process.exit(1);
  }
}

function loadInput(filePath: string): Step6Input {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.questions_and_proposals || !Array.isArray(data.questions_and_proposals)) {
      throw new Error('Invalid input format: missing questions_and_proposals array');
    }

    return data as Step6Input;
  } catch (error) {
    logError('Failed to load input file', error as Error);
    throw error;
  }
}

function loadDefinitionOfReady(filePath: string): DefinitionOfReadyConfig {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Definition of Ready config not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as DefinitionOfReadyConfig;

    if (!data.criteria || !data.thresholds) {
      throw new Error('Invalid Definition of Ready config: missing required fields');
    }

    return data;
  } catch (error) {
    logError('Failed to load Definition of Ready config', error as Error);
    throw error;
  }
}

function buildOutput(
  assessments: PBIReadinessAssessment[],
  _inputData: Step6Input,
  startTime: number
): ReadinessAssessmentOutput {
  const readyCount = assessments.filter(a => a.readiness_status.includes('READY')).length;
  const notReadyCount = assessments.filter(a => a.readiness_status.includes('NOT READY')).length;
  const needsRefinementCount = assessments.filter(a => a.readiness_status.includes('NEEDS REFINEMENT')).length;

  const scores = assessments.map(a => parseInt(a.readiness_score.split('/')[0]));
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return {
    readiness_assessment: assessments,
    metadata: {
      generated_at: new Date().toISOString(),
      total_pbis: assessments.length,
      ready_count: readyCount,
      not_ready_count: notReadyCount,
      needs_refinement_count: needsRefinementCount,
      average_readiness_score: Math.round(averageScore),
      model_used: config.claude.model,
      processing_duration_ms: Date.now() - startTime,
      total_api_cost: costTracker.getTotalCost()
    }
  };
}

function saveOutput(filePath: string, output: ReadinessAssessmentOutput): void {
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    logInfo(`\n✓ Readiness assessment saved to: ${filePath}`);
  } catch (error) {
    logError('Failed to save output', error as Error);
    throw error;
  }
}

function displaySummary(output: ReadinessAssessmentOutput): void {
  logInfo('\n' + '='.repeat(80));
  logInfo('READINESS ASSESSMENT SUMMARY');
  logInfo('='.repeat(80));
  logInfo(`Total PBIs Assessed:       ${output.metadata.total_pbis}`);
  logInfo(`Ready for Sprint:          ${output.metadata.ready_count} (${Math.round((output.metadata.ready_count / output.metadata.total_pbis) * 100)}%)`);
  logInfo(`Needs Refinement:          ${output.metadata.needs_refinement_count}`);
  logInfo(`Not Ready:                 ${output.metadata.not_ready_count}`);
  logInfo(`Average Readiness Score:   ${output.metadata.average_readiness_score}/100`);
  logInfo(`Processing Duration:       ${(output.metadata.processing_duration_ms / 1000).toFixed(2)}s`);
  logInfo(`Model Used:                ${output.metadata.model_used}`);
  logInfo('='.repeat(80));

  // Show individual PBI statuses
  logInfo('\nPBI Readiness Status:');
  for (const assessment of output.readiness_assessment) {
    logInfo(`  ${assessment.readiness_status} - ${assessment.pbi_id}: ${assessment.title}`);
    logInfo(`    Score: ${assessment.readiness_score} | ETA: ${assessment.sprint_readiness_eta}`);
  }
  logInfo('');
}

// Run the main function
main().catch(error => {
  logError('Unhandled error', error);
  process.exit(1);
});
