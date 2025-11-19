import { ClaudeClient } from '../api/ClaudeClient';
import { PromptBuilder } from './PromptBuilder';
import { PBICandidate, ExtractionResult } from '../models/PBICandidate';
import { logger } from '../utils/Logger';

export class PBIExtractor {
  private claudeClient: ClaudeClient;
  private promptBuilder: PromptBuilder;

  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Extract PBI candidates from a transcript
   */
  async extract(transcript: string, summary?: string): Promise<ExtractionResult> {
    logger.info('Starting PBI extraction process');

    // Build the prompt
    const { systemPrompt, userPrompt } = this.promptBuilder.buildExtractionPrompt(
      transcript,
      summary
    );

    try {
      // Get completion from Claude
      logger.info('Sending transcript to Claude API for analysis...');
      const response = await this.claudeClient.generateCompletion(systemPrompt, userPrompt);

      // Parse the response
      logger.info('Parsing Claude response...');
      const candidates = this.parseResponse(response);

      // Validate candidates
      logger.info(`Validating ${candidates.length} extracted PBIs...`);
      const validatedCandidates = candidates.map(pbi => this.validatePBI(pbi));

      // Create result with metadata
      const result: ExtractionResult = {
        candidates: validatedCandidates,
        metadata: {
          extracted_at: new Date().toISOString(),
          total_candidates: validatedCandidates.length
        }
      };

      logger.success(`Successfully extracted ${validatedCandidates.length} PBI candidates`);
      return result;

    } catch (error) {
      logger.error('Failed to extract PBIs', error as Error);
      throw new Error(`PBI extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Parse Claude's response to extract PBI candidates
   */
  private parseResponse(response: string): PBICandidate[] {
    try {
      // Try to extract JSON from the response
      // Claude might wrap it in markdown code blocks
      let jsonStr = response;

      // Remove markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // Parse the JSON
      const parsed = JSON.parse(jsonStr);

      // Check if we have the expected structure
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        logger.debug(`Parsed ${parsed.candidates.length} candidates from response`);
        return parsed.candidates;
      } else if (Array.isArray(parsed)) {
        // Sometimes Claude might return just the array
        logger.debug(`Parsed ${parsed.length} candidates from array response`);
        return parsed;
      } else {
        throw new Error('Unexpected response structure: missing candidates array');
      }

    } catch (error) {
      logger.error('Failed to parse Claude response as JSON', error as Error);
      logger.debug('Raw response:', { response });

      // Try to extract any JSON-like structure
      try {
        const fallbackMatch = response.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
          const fallbackParsed = JSON.parse(fallbackMatch[0]);
          if (fallbackParsed.candidates) {
            logger.warn('Using fallback JSON extraction');
            return fallbackParsed.candidates;
          }
        }
      } catch {
        // Fallback failed
      }

      throw new Error(`Failed to parse extraction response: ${(error as Error).message}`);
    }
  }

  /**
   * Validate and clean a PBI candidate
   */
  private validatePBI(pbi: any): PBICandidate {
    // Ensure required fields exist
    const validated: PBICandidate = {
      id: pbi.id || this.generateId(),
      title: pbi.title || 'Untitled PBI',
      description: pbi.description || '',
      acceptance_criteria: this.ensureArray(pbi.acceptance_criteria),
      technical_notes: this.ensureArray(pbi.technical_notes),
      scope: {
        in_scope: this.ensureArray(pbi.scope?.in_scope),
        out_of_scope: this.ensureArray(pbi.scope?.out_of_scope)
      },
      dependencies: this.ensureArray(pbi.dependencies),
      mentioned_by: this.ensureArray(pbi.mentioned_by)
    };

    // Add optional fields if present
    if (pbi.phase) validated.phase = pbi.phase;
    if (pbi.status) validated.status = pbi.status;
    if (pbi.type) validated.type = pbi.type;
    if (pbi.current_statuses) {
      validated.current_statuses = this.ensureArray(pbi.current_statuses);
    }

    return validated;
  }

  /**
   * Ensure a value is an array
   */
  private ensureArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string');
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }

  /**
   * Generate a unique PBI ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `PBI-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Analyze extraction quality
   */
  analyzeExtractionQuality(result: ExtractionResult): {
    totalPBIs: number;
    withAcceptanceCriteria: number;
    withTechnicalNotes: number;
    withDependencies: number;
    withScope: number;
    byPhase: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const candidates = result.candidates;

    const analysis = {
      totalPBIs: candidates.length,
      withAcceptanceCriteria: 0,
      withTechnicalNotes: 0,
      withDependencies: 0,
      withScope: 0,
      byPhase: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    for (const pbi of candidates) {
      if (pbi.acceptance_criteria.length > 0) analysis.withAcceptanceCriteria++;
      if (pbi.technical_notes.length > 0) analysis.withTechnicalNotes++;
      if (pbi.dependencies.length > 0) analysis.withDependencies++;
      if (pbi.scope.in_scope.length > 0 || pbi.scope.out_of_scope.length > 0) {
        analysis.withScope++;
      }

      if (pbi.phase) {
        analysis.byPhase[pbi.phase] = (analysis.byPhase[pbi.phase] || 0) + 1;
      }

      if (pbi.status) {
        analysis.byStatus[pbi.status] = (analysis.byStatus[pbi.status] || 0) + 1;
      }
    }

    return analysis;
  }
}