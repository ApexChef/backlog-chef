import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/app.config';
import { logDebug, logError, logInfo, logWarn } from '../utils/logger';
import { costTracker } from '../utils/cost-tracker';
import { ClaudeAPIResponse } from '../types';

export class ClaudeAPIClient {
  private client: Anthropic;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.claude.apiKey
    });
    this.maxRetries = config.claude.maxRetries;
    this.retryDelay = config.claude.retryDelay;
  }

  async sendMessage(
    systemPrompt: string,
    userPrompt: string,
    operation: string = 'evaluation',
    retryCount: number = 0
  ): Promise<ClaudeAPIResponse> {
    const startTime = Date.now();

    try {
      logDebug(`Sending Claude API request for ${operation}...`);
      logDebug(`User prompt (first 200 chars): ${userPrompt.substring(0, 200)}...`);

      const response = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const duration = Date.now() - startTime;
      const content = response.content[0].type === 'text' ? response.content[0].text : '';

      // Track usage and cost
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      costTracker.trackUsage(operation, inputTokens, outputTokens);

      logInfo(`✓ Claude API call successful for ${operation} (${duration}ms)`);
      logDebug(`Response (first 500 chars): ${content.substring(0, 500)}...`);

      return {
        content,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens
        },
        stop_reason: response.stop_reason || undefined
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (this.isRetryableError(error) && retryCount < this.maxRetries) {
        const nextRetry = retryCount + 1;
        logWarn(`API call failed (attempt ${nextRetry}/${this.maxRetries}): ${error.message}. Retrying in ${this.retryDelay}ms...`);

        await this.sleep(this.retryDelay);
        return this.sendMessage(systemPrompt, userPrompt, operation, nextRetry);
      }

      logError(`✗ Claude API call failed for ${operation} after ${duration}ms`, error);
      throw new Error(`Claude API Error: ${error.message || 'Unknown error'}`);
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on rate limits, timeouts, and temporary server errors
    if (error.status) {
      return error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504;
    }

    // Retry on network errors
    return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper method to parse JSON from Claude's response with fallback strategies
   */
  parseJSONResponse<T>(content: string, operation: string): T {
    // Helper to fix common JSON issues in LLM responses
    const fixJSON = (jsonStr: string): string => {
      // Simple but effective: fix literal control characters in the JSON
      // We'll iterate character by character within string contexts
      let result = '';
      let inString = false;
      let escaped = false;

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];

        // Track string context
        if (char === '"' && !escaped) {
          inString = !inString;
          result += char;
          continue;
        }

        // Track escape sequences
        if (char === '\\' && !escaped) {
          escaped = true;
          result += char;
          continue;
        }

        // If we're in a string and encounter literal control characters, escape them
        if (inString && !escaped) {
          if (char === '\n') {
            result += '\\n';
          } else if (char === '\r') {
            result += '\\r';
          } else if (char === '\t') {
            result += '\\t';
          } else if (char === '\b') {
            result += '\\b';
          } else if (char === '\f') {
            result += '\\f';
          } else {
            result += char;
          }
        } else {
          result += char;
        }

        escaped = false;
      }

      return result;
    };

    try {
      // Try direct JSON parse
      return JSON.parse(content);
    } catch (firstError) {
      logWarn(`Failed to parse JSON directly for ${operation}, trying fallback strategies...`);

      try {
        // Strategy 2: Extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1]);
          } catch {
            return JSON.parse(fixJSON(jsonMatch[1]));
          }
        }

        // Strategy 3: Extract JSON between curly braces
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            return JSON.parse(jsonObjectMatch[0]);
          } catch {
            return JSON.parse(fixJSON(jsonObjectMatch[0]));
          }
        }

        // Strategy 4: Try fixing the entire content
        return JSON.parse(fixJSON(content));
      } catch (secondError) {
        logError(`All JSON parsing strategies failed for ${operation}`, secondError as Error);
        logDebug(`Response content (first 1000 chars): ${content.substring(0, 1000)}`);
        throw new Error(`Failed to parse JSON response for ${operation}: ${(secondError as Error).message}`);
      }
    }
  }
}
