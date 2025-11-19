#!/usr/bin/env node

import { getConfig } from './config';
import { EnrichmentOrchestrator } from './enrichment/orchestrator';

async function main() {
  console.log('🚀 Backlog Chef POC - Step 4: Enrich with Context');
  console.log('==================================================\n');

  try {
    // Load configuration
    const config = getConfig();
    console.log(`📋 Configuration loaded`);
    console.log(`   Model: ${config.claudeModel}`);
    console.log(`   Input: ${config.inputPath}`);
    console.log(`   Output: ${config.outputPath}\n`);

    // Initialize orchestrator
    const orchestrator = new EnrichmentOrchestrator(config);

    // Process PBIs
    const enrichedPBIs = await orchestrator.enrichPBIs(config.inputPath);

    // Save results
    orchestrator.saveEnrichedPBIs(enrichedPBIs, config.outputPath);

    // Display summary statistics
    displaySummaryStats(enrichedPBIs);

    console.log('\n🎉 Step 4 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('\nPlease ensure:');
    console.error('1. You have set ANTHROPIC_API_KEY in your .env file');
    console.error('2. The input file exists at the specified path');
    console.error('3. You have run Step 3 to generate scored PBIs');
    process.exit(1);
  }
}

function displaySummaryStats(enrichedPBIs: any[]): void {
  console.log('\n📊 Enrichment Statistics:');
  console.log('========================');

  let totalSimilarWork = 0;
  let totalDecisions = 0;
  let totalDocs = 0;
  let totalRisks = 0;
  let highRiskCount = 0;

  for (const pbi of enrichedPBIs) {
    const ctx = pbi.context_enrichment;
    totalSimilarWork += ctx.similar_work.length;
    totalDecisions += ctx.past_decisions.length;
    totalDocs += ctx.technical_docs.length;
    totalRisks += ctx.risk_flags.length;
    highRiskCount += ctx.risk_flags.filter((r: any) => r.severity === 'HIGH').length;
  }

  console.log(`\n📝 PBIs Enriched: ${enrichedPBIs.length}`);
  console.log(`\n📚 Context Added:`);
  console.log(`   - Similar Work Items: ${totalSimilarWork}`);
  console.log(`   - Past Decisions: ${totalDecisions}`);
  console.log(`   - Technical Documents: ${totalDocs}`);
  console.log(`\n⚠️  Risks Identified:`);
  console.log(`   - Total Risk Flags: ${totalRisks}`);
  console.log(`   - High Severity Risks: ${highRiskCount}`);

  // Display per-PBI readiness with risks
  console.log('\n📋 PBI Summary:');
  for (const pbi of enrichedPBIs) {
    const highRisks = pbi.context_enrichment.risk_flags.filter((r: any) => r.severity === 'HIGH').length;
    const riskIndicator = highRisks > 0 ? `⚠️  ${highRisks} high risks` : '✅';
    console.log(`   ${pbi.id}: ${pbi.overall_readiness} - ${riskIndicator}`);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Backlog Chef POC - Step 4: Enrich with Context
==============================================

This tool enriches PBI candidates with relevant context from historical data,
documentation, and past decisions.

Usage:
  npm run enrich              Run the enrichment process
  npm run dev                 Run in development mode
  npm test                    Run tests

Configuration:
  Set these in your .env file:
  - ANTHROPIC_API_KEY         Your Anthropic API key (required)
  - CLAUDE_MODEL              Model to use (optional)
  - INPUT_PATH                Path to scored PBIs (optional)
  - OUTPUT_PATH               Path for enriched output (optional)

Input:
  Reads from: poc-step3/output/scored-pbis.json

Output:
  Writes to: poc-step4/output/enriched-pbis.json
`);
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});