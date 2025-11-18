import { logger } from '../utils/Logger';

export class PromptBuilder {
  /**
   * Build the complete extraction prompt
   */
  buildExtractionPrompt(transcript: string, summary?: string): {
    systemPrompt: string;
    userPrompt: string;
  } {
    logger.debug('Building extraction prompt');

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt(transcript, summary);

    return {
      systemPrompt,
      userPrompt
    };
  }

  /**
   * Get the system prompt that defines Claude's role
   */
  private getSystemPrompt(): string {
    return `You are an expert Scrum facilitator and Product Owner assistant specializing in analyzing backlog refinement meeting transcripts. Your task is to extract structured Product Backlog Items (PBIs) from meeting discussions.

You have deep expertise in:
- Identifying user stories and requirements from conversations
- Recognizing acceptance criteria and definition of done
- Understanding technical constraints and dependencies
- Distinguishing between what's in scope and out of scope
- Identifying different phases and priorities

You will analyze meeting transcripts and extract all potential Product Backlog Items, ensuring each item has clear business value, testable acceptance criteria, and well-defined scope boundaries.

Always output valid JSON that matches the specified schema exactly. Be thorough in extracting all discussed items, even if they are marked for future phases or deferred.`;
  }

  /**
   * Build the user prompt with the transcript
   */
  private getUserPrompt(transcript: string, summary?: string): string {
    let prompt = `Analyze the following backlog refinement meeting transcript and extract all potential Product Backlog Items discussed.

For each PBI provide:
- id: Unique identifier (format: "PBI-001", "PBI-002", etc.)
- title: Concise, user-facing title
- description: What problem it solves, who it's for, and the value it provides
- acceptance_criteria: Array of specific, testable conditions that must be met
- technical_notes: Array of technical constraints, implementation notes, or architecture considerations mentioned
- scope: Object with in_scope (what's included) and out_of_scope (what's explicitly excluded) arrays
- dependencies: Array of external dependencies, prerequisites, or blockers mentioned
- mentioned_by: Array of people who discussed this item (include their role in parentheses if mentioned)
- phase: (optional) If explicitly mentioned for a future phase (e.g., "phase_2")
- status: (optional) If marked as "deferred", "blocked", etc.
- type: (optional) If it's an "enabling_story", "technical_debt", etc.
- current_statuses: (optional) For status-related PBIs, list the current status values

Output the results as a JSON object with a "candidates" array containing all extracted PBIs.

Important guidelines:
- Extract ALL items discussed, even if briefly mentioned
- Include items marked for future phases or deferred
- Capture the actual language used by participants when relevant
- Be comprehensive - it's better to include borderline items than miss them
- Ensure all arrays are properly formatted, even if empty
- Include technical discussions that could become separate technical stories`;

    if (summary) {
      prompt += `

Meeting Summary for Context:
${summary}`;
    }

    prompt += `

Meeting Transcript:
${transcript}

Please extract all PBIs and return them in the specified JSON format.`;

    return prompt;
  }

  /**
   * Build a validation prompt to check extracted PBIs
   */
  buildValidationPrompt(pbis: any[]): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = 'You are a JSON validator ensuring data quality and completeness.';

    const userPrompt = `Review the following extracted PBIs and ensure they have all required fields properly filled.
Fix any issues and return the corrected JSON:

${JSON.stringify(pbis, null, 2)}`;

    return {
      systemPrompt,
      userPrompt
    };
  }
}