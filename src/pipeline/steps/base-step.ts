/**
 * Base step interface for pipeline steps
 *
 * All pipeline steps implement this interface
 */

import { ModelRouter } from '../../ai/router';
import { PipelineContext } from '../types/pipeline-types';

/**
 * Base interface for all pipeline steps
 */
export interface PipelineStep {
  /** Step name (used for routing and logging) */
  readonly name: string;

  /** Step description */
  readonly description: string;

  /**
   * Execute the step
   * @param context Pipeline context with all previous results
   * @param router AI model router for making AI requests
   * @returns Updated context with this step's results
   */
  execute(context: PipelineContext, router: ModelRouter): Promise<PipelineContext>;

  /**
   * Validate that prerequisites are met
   * @param context Pipeline context
   * @returns true if step can run, false otherwise
   */
  canExecute(context: PipelineContext): boolean;
}

/**
 * Abstract base class for pipeline steps
 * Provides common functionality
 */
export abstract class BaseStep implements PipelineStep {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Execute the step with timing and error handling
   */
  async execute(context: PipelineContext, router: ModelRouter): Promise<PipelineContext> {
    const stepStartTime = Date.now();

    try {
      console.log(`\n[${this.name}] Starting...`);

      // Validate prerequisites
      if (!this.canExecute(context)) {
        throw new Error(`${this.name}: Prerequisites not met`);
      }

      // Execute step-specific logic
      const updatedContext = await this.executeStep(context, router);

      // Record timing
      const duration = Date.now() - stepStartTime;
      updatedContext.stepTimings[this.name] = duration;

      console.log(`[${this.name}] ✓ Completed in ${(duration / 1000).toFixed(2)}s`);

      return updatedContext;
    } catch (error) {
      console.error(`[${this.name}] ✗ Failed:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Step-specific execution logic
   * Subclasses implement this
   */
  protected abstract executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext>;

  /**
   * Check if step can execute
   * Subclasses can override for specific checks
   */
  canExecute(_context: PipelineContext): boolean {
    return true;
  }

  /**
   * Helper to make AI requests with consistent error handling
   */
  protected async makeAIRequest(
    router: ModelRouter,
    stepName: string,
    systemPrompt: string,
    userPrompt: string,
    context: PipelineContext
  ): Promise<string> {
    const response = await router.route(stepName, {
      systemPrompt,
      userPrompt,
      temperature: context.options.ai?.temperature,
      maxTokens: context.options.ai?.maxTokens,
    });

    // Track cost and model usage
    context.totalCost += response.cost;
    context.modelsUsed.add(`${response.provider}/${response.model}`);

    return response.content;
  }

  /**
   * Helper to parse JSON response from AI
   */
  protected parseJSONResponse<T>(content: string, operation: string): T {
    try {
      // Try direct parse
      return JSON.parse(content);
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Continue to next fallback
        }
      }

      // Try to extract first { } or [ ] object
      const objectMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[1]);
        } catch {
          // Continue to error
        }
      }

      throw new Error(
        `${operation}: Failed to parse JSON response. Content: ${content.substring(0, 200)}...`
      );
    }
  }
}
