/**
 * Claude API Client Service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ClaudeMessage, ClaudeResponse } from '../types';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';

export class ClaudeAPIClient {
  private client: AxiosInstance;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor() {
    this.maxRetries = appConfig.maxRetries;
    this.retryDelay = appConfig.retryDelay;

    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': appConfig.claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000 // 30 seconds timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        logger.debug(`Claude API response received`, {
          status: response.status,
          usage: response.data.usage
        });
        return response;
      },
      error => {
        logger.error('Claude API error', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<ClaudeResponse> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestBody: any = {
      model: appConfig.claudeModel,
      messages,
      max_tokens: 4096,
      temperature
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.post('/messages', requestBody);

      if (!response.data.content || response.data.content.length === 0) {
        throw new Error('Empty response from Claude API');
      }

      const content = response.data.content[0].text;

      return {
        content,
        usage: response.data.usage
      };
    });
  }

  /**
   * Send a JSON-formatted request expecting JSON response
   */
  async sendJSONRequest(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<any> {
    const jsonSystemPrompt = `${systemPrompt || ''}

IMPORTANT: You must respond with valid JSON only. No explanatory text before or after the JSON.`;

    const response = await this.sendMessage(prompt, jsonSystemPrompt, temperature);

    // Extract JSON from response
    let content = response.content.trim();

    // Try to extract JSON if it's wrapped in markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // Strategy 1: Try parsing as-is
    try {
      return JSON.parse(content);
    } catch (error) {
      logger.debug('Failed to parse JSON directly, attempting to extract and clean');
    }

    // Strategy 2: Extract JSON object/array bounds and try again
    const jsonStart = content.indexOf('{') !== -1 ? content.indexOf('{') : content.indexOf('[');
    const jsonEnd = content.lastIndexOf('}') !== -1 ? content.lastIndexOf('}') : content.lastIndexOf(']');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonContent = content.substring(jsonStart, jsonEnd + 1);

      try {
        return JSON.parse(jsonContent);
      } catch (secondError) {
        logger.debug('Failed to parse extracted JSON, attempting to clean control characters');
      }

      // Strategy 3: Clean potential control characters while preserving newlines in strings
      try {
        // This regex preserves newlines and tabs within strings but removes other control chars
        const cleaned = jsonContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return JSON.parse(cleaned);
      } catch (thirdError) {
        logger.warn('Failed to parse JSON after all cleanup attempts', {
          originalLength: content.length,
          extractedLength: jsonContent.length
        });
        throw new Error(`Invalid JSON response from Claude after multiple parse attempts`);
      }
    }

    logger.error('Could not find valid JSON structure in response');
    throw new Error(`Invalid JSON response from Claude: ${content.substring(0, 200)}...`);
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        logger.error(`Max retries (${this.maxRetries}) reached`);
        throw error;
      }

      const isRetryable = this.isRetryableError(error);

      if (!isRetryable) {
        throw error;
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Retrying request (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`);

      await this.sleep(delay);
      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;

      // Retry on rate limits, timeouts, and server errors
      if (status && (status === 429 || status === 503 || status >= 500)) {
        return true;
      }

      // Retry on network errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Claude API connection...');
      const response = await this.sendMessage(
        'Respond with "OK" if you receive this message.',
        'You are a test assistant. Respond only with "OK".',
        0.0
      );

      if (response.content.includes('OK')) {
        logger.success('Claude API connection successful');
        return true;
      }

      logger.error('Unexpected response from Claude API');
      return false;
    } catch (error) {
      logger.error('Failed to connect to Claude API', error);
      return false;
    }
  }
}