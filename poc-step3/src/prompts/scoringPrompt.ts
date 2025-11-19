/**
 * Prompt templates for Claude API scoring
 */

import { ExtractedPBI } from '../models/types';

export function buildScoringPrompt(pbi: ExtractedPBI): string {
  return `You are an expert Agile coach evaluating the quality and readiness of a Product Backlog Item (PBI).
Analyze the following PBI and provide detailed scores for each quality dimension.

PBI DETAILS:
============
ID: ${pbi.id}
Title: ${pbi.title}
Description: ${pbi.description}

Acceptance Criteria:
${pbi.acceptance_criteria.map((ac, i) => `  ${i + 1}. ${ac}`).join('\n')}

Technical Notes:
${pbi.technical_notes.length > 0 ? pbi.technical_notes.map((note, i) => `  ${i + 1}. ${note}`).join('\n') : '  None provided'}

In Scope:
${pbi.scope.in_scope.length > 0 ? pbi.scope.in_scope.map(item => `  - ${item}`).join('\n') : '  Not specified'}

Out of Scope:
${pbi.scope.out_of_scope.length > 0 ? pbi.scope.out_of_scope.map(item => `  - ${item}`).join('\n') : '  Not specified'}

Dependencies:
${pbi.dependencies.length > 0 ? pbi.dependencies.map(dep => `  - ${dep}`).join('\n') : '  None identified'}

Mentioned By: ${pbi.mentioned_by.join(', ')}
Type: ${pbi.type}
Phase: ${pbi.phase || 'Not specified'}

SCORING INSTRUCTIONS:
====================
Evaluate this PBI across 6 quality dimensions. For each dimension:
- Provide a score from 0-100
- Give a clear, concise reasoning (one sentence)
- List 2-4 specific pieces of evidence supporting your score

QUALITY DIMENSIONS TO SCORE:

1. isCompletePBI (0-100): Does this PBI have clear business value, specific user need, and actionable scope?
   - Look for: Clear "who", "what", and "why"; Defined value proposition; Actionable deliverable

2. hasAllRequirements (0-100): Are all critical questions answered?
   - Look for: Technical approach clarity; Integration points defined; Performance requirements; Security considerations

3. isRefinementComplete (0-100): Is this ready for sprint planning?
   - Look for: Team discussions addressed; Technical feasibility confirmed; Dependencies resolved

4. hasAcceptanceCriteria (0-100): Are testable conditions defined?
   - Look for: Clear success conditions; Edge cases covered; Measurable outcomes

5. hasClearScope (0-100): Are boundaries explicitly documented?
   - Look for: In-scope items defined; Out-of-scope items listed; Phase boundaries clear

6. isEstimable (0-100): Can the team size this work?
   - Look for: Technical approach known; Complexity understood; No major unknowns

IMPORTANT: Return your analysis as valid JSON matching this exact structure:
{
  "scores": {
    "isCompletePBI": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    },
    "hasAllRequirements": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    },
    "isRefinementComplete": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    },
    "hasAcceptanceCriteria": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    },
    "hasClearScope": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    },
    "isEstimable": {
      "score": <number>,
      "reasoning": "<one sentence explanation>",
      "evidence": ["<specific observation 1>", "<specific observation 2>", ...]
    }
  }
}`;
}