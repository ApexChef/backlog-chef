/**
 * Step 2: Extract Candidate PBIs
 *
 * Parses the meeting transcript to extract potential PBIs with:
 * - Title
 * - Description
 * - Acceptance criteria (if mentioned)
 * - Notes and context
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import { PipelineContext, ExtractCandidatesResult, CandidatePBI } from '../types/pipeline-types';

export class ExtractCandidatesStep extends BaseStep {
  readonly name = 'extract_candidates';
  readonly description = 'Extract candidate PBIs from transcript';

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const systemPrompt = `You are an expert Scrum Product Owner assistant who extracts Product Backlog Items (PBIs) from meeting transcripts.

Your task is to identify and extract all potential PBIs discussed in the meeting. For each PBI:
1. Create a clear, concise title (user story format preferred: "As a [role], I want [feature] so that [benefit]")
2. Extract or infer a description of what needs to be built
3. Identify any acceptance criteria mentioned
4. Capture any relevant notes, concerns, or context
5. Note who mentioned or discussed this item

IMPORTANT:
- Extract ONLY items that represent work to be done (features, bugs, improvements)
- Do NOT extract general discussions, questions, or administrative items
- Each PBI should be atomic and independently deliverable
- Generate a unique ID for each PBI (format: PBI-001, PBI-002, etc.)

Respond ONLY with valid JSON in this exact format:
{
  "candidates": [
    {
      "id": "PBI-001",
      "title": "Clear, concise title",
      "description": "Detailed description of what needs to be built",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "notes": ["Note 1", "Note 2"],
      "mentioned_by": ["Person A", "Person B"]
    }
  ],
  "total_found": 3
}`;

    const userPrompt = `Extract all candidate PBIs from this ${context.eventDetection?.event_type || 'meeting'} transcript:

${context.input.transcript}

Respond with JSON only.`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const result = this.parseJSONResponse<ExtractCandidatesResult>(
      responseContent,
      'Extract Candidates'
    );

    // Validate result
    if (!Array.isArray(result.candidates)) {
      throw new Error('Invalid response: candidates must be an array');
    }

    // Validate each candidate
    for (const candidate of result.candidates) {
      if (!candidate.id || !candidate.title || !candidate.description) {
        throw new Error(
          `Invalid candidate PBI: missing required fields (id, title, or description)`
        );
      }
    }

    // Update context
    context.extractedCandidates = result;

    console.log(`[${this.name}] Extracted ${result.total_found} candidate PBIs:`);
    for (const candidate of result.candidates) {
      console.log(`  - ${candidate.id}: ${candidate.title}`);
    }

    return context;
  }

  canExecute(context: PipelineContext): boolean {
    return !!context.eventDetection;
  }
}
