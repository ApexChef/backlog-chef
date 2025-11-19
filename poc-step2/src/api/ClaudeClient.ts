import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/Logger';

export class ClaudeClient {
  private client: Anthropic;
  private maxRetries: number;
  private retryDelay: number;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey
    });

    this.maxRetries = parseInt(process.env.MAX_RETRIES || '3');
    this.retryDelay = parseInt(process.env.RETRY_DELAY_MS || '1000');
  }

  /**
   * Generate a completion from Claude
   */
  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    logger.debug('Sending request to Claude API');
    logger.debug(`System prompt length: ${systemPrompt.length}`);
    logger.debug(`User prompt length: ${userPrompt.length}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 4096,
          temperature: 0.2,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });

        // Extract text from response
        const content = response.content[0];
        if (content.type === 'text') {
          logger.debug('Received response from Claude API');
          return content.text;
        } else {
          throw new Error('Unexpected response format from Claude API');
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn(`API request failed (attempt ${attempt}/${this.maxRetries}): ${lastError.message}`);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.info(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to get response from Claude API after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ]
      });
      return true;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('401') || err.message.includes('authentication')) {
        logger.error('Invalid API key');
        return false;
      }
      // Other errors might be transient
      logger.warn(`API validation warning: ${err.message}`);
      return true;
    }
  }
}