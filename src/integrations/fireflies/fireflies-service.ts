/**
 * Fireflies API Service
 *
 * GraphQL client for fetching meeting transcripts from Fireflies.ai
 * Features: retry logic, caching, error handling, URL parsing
 */

import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  FirefliesTranscript,
  FirefliesConfig,
  FirefliesGraphQLResponse,
} from './types';
import { transcriptCache, TranscriptCache } from './cache';
import { withRetry } from './retry';
import {
  FirefliesAPIError,
  FirefliesAuthError,
  FirefliesMeetingNotFoundError,
  FirefliesRateLimitError,
  FirefliesGraphQLError,
} from './errors';

/**
 * GraphQL query for fetching complete transcript data
 * Includes analytics, summary, sentences, speakers, and meeting metadata
 */
const TRANSCRIPT_QUERY = `
query Transcript($transcriptId: String!) {
  transcript(id: $transcriptId) {
    id
    title
    date
    duration
    organizer_email
    host_email
    participants
    transcript_url
    audio_url
    calendar_id
    cal_id
    calendar_type
    meeting_link
    analytics {
      sentiments {
        negative_pct
        neutral_pct
        positive_pct
      }
      categories {
        questions
        date_times
        metrics
        tasks
      }
      speakers {
        speaker_id
        name
        duration
        word_count
        longest_monologue
        monologues_count
        filler_words
        questions
        duration_pct
        words_per_minute
      }
    }
    sentences {
      index
      text
      raw_text
      speaker_id
      speaker_name
      start_time
      end_time
      ai_filters {
        task
        pricing
        metric
        question
        date_and_time
        text_cleanup
        sentiment
      }
    }
    speakers {
      id
      name
    }
    meeting_info {
      fred_joined
      silent_meeting
      summary_status
    }
    user {
      user_id
      email
      name
      num_transcripts
      recent_meeting
      minutes_consumed
      is_admin
      integrations
    }
    fireflies_users
    meeting_attendees {
      displayName
      email
      phoneNumber
      name
      location
    }
    meeting_attendance {
      name
      join_time
      leave_time
    }
    summary {
      keywords
      action_items
      outline
      shorthand_bullet
      notes
      overview
      bullet_gist
      gist
      short_summary
      short_overview
      meeting_type
      topics_discussed
      transcript_chapters
    }
    apps_preview {
      outputs {
        transcript_id
        user_id
        app_id
        created_at
        title
        prompt
        response
      }
    }
    channels {
      id
    }
  }
}
`;

/**
 * Fireflies.ai API Service
 *
 * Provides methods for fetching meeting transcripts via GraphQL
 *
 * @example
 * ```typescript
 * const fireflies = new FirefliesService({
 *   apiKey: process.env.FIREFLIES_API_KEY!
 * });
 *
 * // Fetch by meeting ID
 * const transcript = await fireflies.getTranscript('meeting-id');
 *
 * // Fetch by URL
 * const meetingId = fireflies.extractMeetingId('https://app.fireflies.ai/view/...');
 * const transcript = await fireflies.getTranscript(meetingId);
 *
 * // Get formatted transcript text
 * const text = await fireflies.getTranscriptText('meeting-id');
 * ```
 */
export class FirefliesService {
  private client: AxiosInstance;
  private config: FirefliesConfig;
  private cache: TranscriptCache;

  constructor(config: FirefliesConfig, cache?: TranscriptCache) {
    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new FirefliesAuthError(
        'FIREFLIES_API_KEY is required. Get your API key from https://app.fireflies.ai/integrations/custom/fireflies'
      );
    }

    this.config = {
      apiEndpoint: config.apiEndpoint || 'https://api.fireflies.ai/graphql',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      cacheTTL: config.cacheTTL || 3600,
      ...config,
    };

    this.cache = cache || transcriptCache;

    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: this.config.apiEndpoint,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      timeout: this.config.timeout,
    });
  }

  /**
   * Get transcript by meeting ID
   *
   * Uses cache to reduce API calls. Falls back to API if not cached.
   *
   * @param meetingId Fireflies meeting/transcript ID
   * @returns Complete transcript data
   * @throws FirefliesAPIError if API call fails
   * @throws FirefliesMeetingNotFoundError if meeting doesn't exist
   */
  async getTranscript(meetingId: string): Promise<FirefliesTranscript> {
    // Check cache first
    const cached = this.cache.get(meetingId);
    if (cached) {
      return cached;
    }

    // Fetch from API with retry logic
    try {
      const transcript = await withRetry(
        () => this.fetchTranscriptFromAPI(meetingId),
        {
          maxAttempts: this.config.retryAttempts,
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
          onRetry: (attempt, error) => {
            console.warn(
              `⚠️  Fireflies API retry ${attempt}/${this.config.retryAttempts}: ${error.message}`
            );
          },
        }
      );

      // Cache the transcript
      this.cache.set(meetingId, transcript, this.config.cacheTTL);

      return transcript;
    } catch (error) {
      throw this.handleError(error, 'getTranscript', { meetingId });
    }
  }

  /**
   * Fetch transcript from Fireflies API (internal method)
   */
  private async fetchTranscriptFromAPI(
    meetingId: string
  ): Promise<FirefliesTranscript> {
    const response = await this.client.post<FirefliesGraphQLResponse<FirefliesTranscript>>('', {
      query: TRANSCRIPT_QUERY,
      variables: {
        transcriptId: meetingId,
      },
    });

    // Check for GraphQL errors
    if (response.data.errors) {
      throw new FirefliesGraphQLError(response.data.errors);
    }

    // Validate response
    const transcript = response.data.data?.transcript;
    if (!transcript) {
      throw new FirefliesMeetingNotFoundError(meetingId);
    }

    return transcript;
  }

  /**
   * Get transcript text as formatted string
   *
   * Returns transcript with speaker names in the format:
   * ```
   * Speaker Name: Text of what they said
   * Another Speaker: Their response
   * ```
   *
   * @param meetingId Meeting ID
   * @returns Formatted transcript text
   * @throws FirefliesAPIError if transcript has no sentences
   */
  async getTranscriptText(meetingId: string): Promise<string> {
    const transcript = await this.getTranscript(meetingId);

    if (!transcript.sentences || transcript.sentences.length === 0) {
      throw new FirefliesAPIError('Transcript has no sentences', undefined, {
        meetingId,
      });
    }

    // Sort by index and format with speaker names
    return transcript.sentences
      .sort((a, b) => a.index - b.index)
      .map((sentence) => `${sentence.speaker_name}: ${sentence.text}`)
      .join('\n');
  }

  /**
   * Extract meeting ID from Fireflies URL
   *
   * Supports multiple URL formats:
   * - https://app.fireflies.ai/view/{meeting-id}
   * - https://app.fireflies.ai/view/{title}::{meeting-id}
   *
   * @param url Fireflies meeting URL
   * @returns Meeting ID
   * @throws Error if URL format is invalid
   *
   * @example
   * ```typescript
   * extractMeetingId('https://app.fireflies.ai/view/meeting::abc123')
   * // Returns: 'abc123'
   *
   * extractMeetingId('https://app.fireflies.ai/view/abc123')
   * // Returns: 'abc123'
   * ```
   */
  extractMeetingId(url: string): string {
    // URL format: https://app.fireflies.ai/view/{title}::{meeting-id}
    // or: https://app.fireflies.ai/view/{meeting-id}
    const match = url.match(/\/view\/([^/?]+)/);

    if (!match) {
      throw new Error(
        `Invalid Fireflies URL format: ${url}\n` +
          'Expected: https://app.fireflies.ai/view/{meeting-id} or https://app.fireflies.ai/view/{title}::{meeting-id}'
      );
    }

    const pathSegment = match[1];

    // If the URL contains "::", extract only the ID after it
    if (pathSegment.includes('::')) {
      const parts = pathSegment.split('::');
      return parts[parts.length - 1]; // Get the last part (the actual ID)
    }

    return pathSegment;
  }

  /**
   * Get raw transcript data (for saving to file)
   *
   * Same as getTranscript but explicitly for saving raw JSON
   *
   * @param meetingId Meeting ID
   * @returns Complete transcript object
   */
  async getRawTranscript(meetingId: string): Promise<FirefliesTranscript> {
    return this.getTranscript(meetingId);
  }

  /**
   * Clear cache for specific meeting or all meetings
   *
   * @param meetingId Optional meeting ID (clears all if not provided)
   */
  clearCache(meetingId?: string): void {
    if (meetingId) {
      this.cache.delete(meetingId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ meetingId: string; cachedAt: number; expiresAt: number }>;
  } {
    return this.cache.getStats();
  }

  /**
   * Handle API errors and convert to appropriate error types
   */
  private handleError(
    error: any,
    operation: string,
    context?: Record<string, any>
  ): FirefliesAPIError {
    // Handle axios errors
    if (isAxiosError(error)) {
      const statusCode = error.response?.status;
      const message = error.response?.data?.message || error.message;

      // Authentication errors
      if (statusCode === 401 || statusCode === 403) {
        return new FirefliesAuthError(
          `Authentication failed: ${message}\n` +
            'Check your FIREFLIES_API_KEY environment variable'
        );
      }

      // Not found
      if (statusCode === 404) {
        return new FirefliesMeetingNotFoundError(context?.meetingId || 'unknown');
      }

      // Rate limit
      if (statusCode === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        return new FirefliesRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
      }

      // Generic API error
      return new FirefliesAPIError(
        `Fireflies API error in ${operation}: ${message}`,
        statusCode,
        {
          ...context,
          statusCode,
          responseData: error.response?.data,
        }
      );
    }

    // Handle our custom errors (pass through)
    if (error instanceof FirefliesAPIError) {
      return error;
    }

    // Generic error
    return new FirefliesAPIError(
      `Fireflies service error in ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      context
    );
  }
}
