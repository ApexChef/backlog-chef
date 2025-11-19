import * as fs from 'fs';
import * as path from 'path';
import {
  ScoredPBI,
  EnrichedPBI,
  ContextEnrichment,
  Config
} from '../types';
import { ClaudeClient } from '../ai/claude-client';
import { ContextSearchEngine } from '../search/engine';

export class EnrichmentOrchestrator {
  private claudeClient: ClaudeClient;
  private searchEngine: ContextSearchEngine;

  constructor(private config: Config) {
    this.claudeClient = new ClaudeClient(config);
    this.searchEngine = new ContextSearchEngine(this.claudeClient);
  }

  async enrichPBIs(inputPath: string): Promise<EnrichedPBI[]> {
    console.log('📚 Starting context enrichment process...\n');

    // Load scored PBIs from Step 3
    const scoredData = this.loadScoredPBIs(inputPath);
    const enrichedPBIs: EnrichedPBI[] = [];

    // Process each PBI
    for (const pbi of scoredData.scored_candidates) {
      console.log(`\n🔍 Enriching PBI: ${pbi.title}`);
      console.log(`   ID: ${pbi.id}`);
      console.log(`   Readiness: ${pbi.overall_readiness}`);

      try {
        const enrichedPBI = await this.enrichSinglePBI(pbi);
        enrichedPBIs.push(enrichedPBI);

        // Log enrichment summary
        this.logEnrichmentSummary(enrichedPBI);
      } catch (error) {
        console.error(`   ❌ Error enriching PBI ${pbi.id}:`, error);
        // Add PBI with empty enrichment on error
        enrichedPBIs.push({
          ...pbi,
          context_enrichment: {
            similar_work: [],
            past_decisions: [],
            technical_docs: [],
            risk_flags: [],
            suggestions: []
          }
        });
      }
    }

    console.log('\n✅ Context enrichment complete!\n');
    return enrichedPBIs;
  }

  private async enrichSinglePBI(pbi: ScoredPBI): Promise<EnrichedPBI> {
    // Generate search queries using Claude
    console.log('   Generating search queries...');
    const searchQuery = await this.claudeClient.generateSearchQueries(pbi);

    console.log(`   Keywords: ${searchQuery.keywords.slice(0, 5).join(', ')}`);
    console.log(`   Concepts: ${searchQuery.concepts.join(', ')}`);
    console.log(`   Technologies: ${searchQuery.technologies.join(', ')}`);

    // Search for context
    console.log('   Searching for context...');
    const searchResults = await this.searchEngine.searchForContext(pbi, searchQuery);

    // Analyze risks based on context
    console.log('   Analyzing risks...');
    const riskFlags = await this.claudeClient.analyzeRisks(
      pbi.title,
      searchResults.similar_work
    );

    // Generate suggestions based on context
    console.log('   Generating suggestions...');
    const suggestions = await this.claudeClient.generateSuggestions(
      pbi.title,
      searchResults
    );

    // Build enrichment object
    const contextEnrichment: ContextEnrichment = {
      similar_work: searchResults.similar_work,
      past_decisions: searchResults.past_decisions,
      technical_docs: searchResults.technical_docs,
      risk_flags: riskFlags,
      suggestions: suggestions
    };

    return {
      ...pbi,
      context_enrichment: contextEnrichment
    };
  }

  private loadScoredPBIs(inputPath: string): any {
    try {
      const fullPath = path.resolve(inputPath);
      console.log(`Loading scored PBIs from: ${fullPath}`);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Input file not found: ${fullPath}`);
      }

      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(fileContent);

      if (!data.scored_candidates || !Array.isArray(data.scored_candidates)) {
        throw new Error('Invalid input format: missing scored_candidates array');
      }

      console.log(`Found ${data.scored_candidates.length} PBI candidates to enrich`);
      return data;
    } catch (error) {
      console.error('Error loading scored PBIs:', error);
      throw error;
    }
  }

  saveEnrichedPBIs(enrichedPBIs: EnrichedPBI[], outputPath: string): void {
    try {
      const fullPath = path.resolve(outputPath);
      const outputDir = path.dirname(fullPath);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const output = {
        enriched_candidates: enrichedPBIs,
        metadata: {
          enriched_at: new Date().toISOString(),
          total_enriched: enrichedPBIs.length,
          model_used: this.config.claudeModel,
          enrichment_sources: ['mock_devops', 'mock_confluence', 'mock_meetings']
        }
      };

      fs.writeFileSync(fullPath, JSON.stringify(output, null, 2));
      console.log(`\n💾 Enriched PBIs saved to: ${fullPath}`);
    } catch (error) {
      console.error('Error saving enriched PBIs:', error);
      throw error;
    }
  }

  private logEnrichmentSummary(pbi: EnrichedPBI): void {
    const ctx = pbi.context_enrichment;
    console.log('   ✨ Enrichment Summary:');
    console.log(`      - Similar Work: ${ctx.similar_work.length} items found`);

    if (ctx.similar_work.length > 0) {
      const topMatch = ctx.similar_work[0];
      console.log(`        Top match: "${topMatch.title}" (${topMatch.similarity}% similarity)`);
    }

    console.log(`      - Past Decisions: ${ctx.past_decisions.length} relevant decisions`);
    if (ctx.past_decisions.length > 0) {
      console.log(`        Latest: "${ctx.past_decisions[0].decision.substring(0, 50)}..."`);
    }

    console.log(`      - Technical Docs: ${ctx.technical_docs.length} documents`);
    console.log(`      - Risk Flags: ${ctx.risk_flags.length} risks identified`);

    const highRisks = ctx.risk_flags.filter(r => r.severity === 'HIGH');
    if (highRisks.length > 0) {
      console.log(`        ⚠️  ${highRisks.length} HIGH severity risks`);
    }

    console.log(`      - Suggestions: ${ctx.suggestions.length} recommendations`);
  }
}