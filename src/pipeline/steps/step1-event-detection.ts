/**
 * Step 1: Event Detection
 *
 * Identifies the type of meeting from the transcript:
 * - Refinement (backlog grooming)
 * - Planning (sprint planning)
 * - Retrospective (sprint retro)
 * - Daily Standup
 * - Unknown
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import { PipelineContext, EventDetectionResult } from '../types/pipeline-types';

export class EventDetectionStep extends BaseStep {
  readonly name = 'detect_event_type';
  readonly description = 'Identify meeting type from transcript';

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const systemPrompt = `You are an expert at analyzing meeting transcripts and identifying the type of Scrum ceremony.

Your task is to analyze the meeting transcript and determine which type of event it is:
- **refinement**: Backlog grooming/refinement meeting where team discusses and clarifies PBIs
- **planning**: Sprint planning meeting where team commits to work for the sprint
- **retrospective**: Sprint retrospective where team reflects on past sprint
- **daily_standup**: Daily standup/scrum meeting with quick status updates
- **unknown**: Cannot confidently determine the meeting type

Respond ONLY with valid JSON in this exact format:
{
  "event_type": "refinement" | "planning" | "retrospective" | "daily_standup" | "unknown",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why you classified it this way"
}`;

    const userPrompt = `Analyze this meeting transcript and identify the event type:

${context.input.transcript}

Respond with JSON only.`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const result = this.parseJSONResponse<EventDetectionResult>(
      responseContent,
      'Event Detection'
    );

    // Validate result
    const validTypes = ['refinement', 'planning', 'retrospective', 'daily_standup', 'unknown'];
    if (!validTypes.includes(result.event_type)) {
      throw new Error(`Invalid event_type: ${result.event_type}`);
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error(`Invalid confidence: ${result.confidence}`);
    }

    // Update context
    context.eventDetection = result;

    console.log(`[${this.name}] Detected: ${result.event_type} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    console.log(`[${this.name}] Reasoning: ${result.reasoning}`);

    return context;
  }

  canExecute(context: PipelineContext): boolean {
    return !!context.input.transcript && context.input.transcript.length > 0;
  }
}
