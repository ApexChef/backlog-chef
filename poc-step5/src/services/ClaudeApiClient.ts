import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { createModuleLogger } from '../utils/logger';
import { ClaudeAnalysisResponse, EnrichedPBI } from '../types';

const logger = createModuleLogger('ClaudeApiClient');

export class ClaudeApiClient {
  private client: Anthropic;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in ms

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async analyzeRisks(pbi: EnrichedPBI): Promise<ClaudeAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(pbi);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Analyzing PBI ${pbi.id} - Attempt ${attempt}`);

        const response = await this.client.messages.create({
          model: config.claudeModel,
          max_tokens: config.claudeMaxTokens,
          temperature: config.claudeTemperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const analysisResult = this.parseResponse(content.text);
          logger.debug(`Successfully analyzed PBI ${pbi.id}`);
          return analysisResult;
        }

        throw new Error('Unexpected response type from Claude API');
      } catch (error) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.warn(`Error analyzing PBI ${pbi.id} on attempt ${attempt}:`, error);

        if (attempt === this.maxRetries) {
          logger.error(`Failed to analyze PBI ${pbi.id} after ${this.maxRetries} attempts`);
          throw error;
        }

        await this.sleep(delay);
      }
    }

    throw new Error(`Failed to analyze PBI ${pbi.id}`);
  }

  private buildAnalysisPrompt(pbi: EnrichedPBI): string {
    return `You are an expert risk analyst for software development projects. Analyze the following enriched Product Backlog Item (PBI) for risks, conflicts, and complexity.

PBI Information:
${JSON.stringify(pbi, null, 2)}

Based on this information, provide a comprehensive risk analysis. Consider:

1. RISKS - Identify potential risks and categorize them by severity:
   - CRITICAL: Blocking dependencies, unresolved decisions, license/budget issues that would prevent work
   - HIGH: Technical complexity, performance risks, dependencies on in-flight work
   - MEDIUM: Estimation uncertainty, missing stakeholders
   - LOW: Minor concerns

   Risk Types to look for:
   - BLOCKING_DEPENDENCY: Missing prerequisites, insufficient licenses, required systems not available
   - UNRESOLVED_DECISION: Key business or technical decisions not made
   - SCOPE_CREEP_RISK: Features mentioned but not properly scoped, expanding requirements
   - TECHNICAL_COMPLEXITY: High technical difficulty, unknown technologies
   - DEPENDENCY_ON_INFLIGHT_WORK: Depends on other ongoing work
   - ESTIMATION_UNCERTAINTY: Historical overruns, unclear requirements
   - MISSING_STAKEHOLDER: Required person not involved
   - DATA_INCONSISTENCY: Conflicting information in the PBI

2. CONFLICTS - Detect conflicts with:
   - EXISTING_WORK: Overlaps with similar work mentioned in context
   - DATA_INCONSISTENCY: Contradictory information found
   - RESOURCE_CONFLICT: Team capacity or license constraints

3. COMPLEXITY - Calculate a complexity score (0-10) based on:
   - Technical complexity
   - Number of dependencies
   - Scope clarity
   - Integration points
   - Historical learnings from similar work

Respond ONLY with a valid JSON object in this exact format:
{
  "risks": [
    {
      "type": "BLOCKING_DEPENDENCY|UNRESOLVED_DECISION|SCOPE_CREEP_RISK|TECHNICAL_COMPLEXITY|DEPENDENCY_ON_INFLIGHT_WORK|ESTIMATION_UNCERTAINTY|MISSING_STAKEHOLDER|DATA_INCONSISTENCY",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "description": "Brief description of the risk",
      "detail": "Detailed explanation including specific evidence from the PBI",
      "action_required": "Specific action needed to mitigate this risk",
      "assigned_to": "Role or person who should handle this (e.g., 'Sarah (PO)', 'Tom (SM)', 'Lisa (Dev)', 'Team')",
      "confidence": 0.0-1.0,
      "evidence": ["specific quote or fact from PBI", "another piece of evidence"]
    }
  ],
  "conflicts": [
    {
      "type": "EXISTING_WORK|DATA_INCONSISTENCY|RESOURCE_CONFLICT",
      "description": "Brief description of the conflict",
      "detail": "Detailed explanation",
      "resolution": "Suggested resolution",
      "assigned_to": "Role or person",
      "related_items": ["PBI-XXX", "reference to related work"]
    }
  ],
  "complexity_analysis": {
    "score": 0.0-10.0,
    "factors": ["factor 1", "factor 2"],
    "recommended_split": true/false,
    "split_suggestion": "If recommended_split is true, provide specific suggestions for splitting"
  },
  "analysis_confidence": 0.0-1.0
}`;
  }

  private parseResponse(text: string): ClaudeAnalysisResponse {
    try {
      // Extract JSON from the response (handle potential markdown formatting)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!parsed.risks || !Array.isArray(parsed.risks)) {
        throw new Error('Invalid response structure: missing risks array');
      }
      if (!parsed.conflicts || !Array.isArray(parsed.conflicts)) {
        throw new Error('Invalid response structure: missing conflicts array');
      }
      if (!parsed.complexity_analysis) {
        throw new Error('Invalid response structure: missing complexity_analysis');
      }

      return parsed as ClaudeAnalysisResponse;
    } catch (error) {
      logger.error('Failed to parse Claude response:', error);
      logger.debug('Raw response:', text);
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}