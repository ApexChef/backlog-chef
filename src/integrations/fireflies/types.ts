/**
 * Fireflies API Type Definitions
 *
 * TypeScript types for Fireflies.ai GraphQL API responses
 * Based on Fireflies API v2 schema
 */

/**
 * AI-generated filters applied to each sentence
 */
export interface FirefliesAIFilters {
  task?: boolean;
  pricing?: boolean;
  metric?: boolean;
  question?: boolean;
  date_and_time?: boolean;
  text_cleanup?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * Individual sentence in a transcript
 */
export interface FirefliesSentence {
  index: number;
  text: string;
  raw_text?: string;
  speaker_id: string;
  speaker_name: string;
  start_time: number; // Seconds from start
  end_time?: number; // Seconds from start
  ai_filters?: FirefliesAIFilters;
}

/**
 * Speaker information
 */
export interface FirefliesSpeaker {
  id: string;
  name: string;
}

/**
 * Speaker analytics
 */
export interface FirefliesSpeakerAnalytics {
  speaker_id: string;
  name: string;
  duration: number; // Seconds
  word_count: number;
  longest_monologue: number;
  monologues_count: number;
  filler_words: number;
  questions: number;
  duration_pct: number; // Percentage
  words_per_minute: number;
}

/**
 * Sentiment analytics
 */
export interface FirefliesSentimentAnalytics {
  negative_pct: number;
  neutral_pct: number;
  positive_pct: number;
}

/**
 * Category analytics
 */
export interface FirefliesCategoryAnalytics {
  questions: number;
  date_times: number;
  metrics: number;
  tasks: number;
}

/**
 * Complete analytics data
 */
export interface FirefliesAnalytics {
  sentiments?: FirefliesSentimentAnalytics;
  categories?: FirefliesCategoryAnalytics;
  speakers?: FirefliesSpeakerAnalytics[];
}

/**
 * Action item from AI-generated summary
 */
export interface FirefliesActionItem {
  text: string;
  assignee?: string;
}

/**
 * AI-generated summary
 */
export interface FirefliesSummary {
  keywords?: string[];
  action_items?: FirefliesActionItem[];
  outline?: string;
  shorthand_bullet?: string[];
  notes?: string;
  overview?: string;
  bullet_gist?: string[];
  gist?: string;
  short_summary?: string;
  short_overview?: string;
  meeting_type?: string;
  topics_discussed?: string[];
  transcript_chapters?: any[];
}

/**
 * Meeting info
 */
export interface FirefliesMeetingInfo {
  fred_joined?: boolean;
  silent_meeting?: boolean;
  summary_status?: string;
}

/**
 * User information
 */
export interface FirefliesUser {
  user_id: string;
  email: string;
  name: string;
  num_transcripts?: number;
  recent_meeting?: string;
  minutes_consumed?: number;
  is_admin?: boolean;
  integrations?: string[];
}

/**
 * Meeting attendee
 */
export interface FirefliesMeetingAttendee {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  location?: string;
}

/**
 * Meeting attendance record
 */
export interface FirefliesMeetingAttendance {
  name: string;
  join_time: string;
  leave_time?: string;
}

/**
 * App output (custom AI apps)
 */
export interface FirefliesAppOutput {
  transcript_id: string;
  user_id: string;
  app_id: string;
  created_at: string;
  title: string;
  prompt: string;
  response: string;
}

/**
 * Apps preview
 */
export interface FirefliesAppsPreview {
  outputs?: FirefliesAppOutput[];
}

/**
 * Channel information
 */
export interface FirefliesChannel {
  id: string;
}

/**
 * Complete Fireflies transcript response
 * Contains all available data from Fireflies GraphQL API
 */
export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string; // ISO 8601 date
  duration: number; // Seconds
  organizer_email?: string;
  host_email?: string;
  participants?: string[]; // Array of email addresses
  transcript_url: string;
  audio_url?: string;
  calendar_id?: string;
  cal_id?: string;
  calendar_type?: string;
  meeting_link?: string;

  // Core content
  sentences: FirefliesSentence[];
  speakers?: FirefliesSpeaker[];

  // Analytics and AI-generated content
  analytics?: FirefliesAnalytics;
  summary?: FirefliesSummary;

  // Meeting details
  meeting_info?: FirefliesMeetingInfo;
  meeting_attendees?: FirefliesMeetingAttendee[];
  meeting_attendance?: FirefliesMeetingAttendance[];

  // User and integration data
  user?: FirefliesUser;
  fireflies_users?: string[];
  apps_preview?: FirefliesAppsPreview;
  channels?: FirefliesChannel[];
}

/**
 * GraphQL response wrapper
 */
export interface FirefliesGraphQLResponse<T = any> {
  data?: {
    transcript?: T;
    transcripts?: T[];
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Fireflies service configuration
 */
export interface FirefliesConfig {
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  retryAttempts?: number;
  cacheTTL?: number; // Cache time-to-live in seconds
}

/**
 * Cache entry for transcripts
 */
export interface CachedTranscript {
  meetingId: string;
  transcript: FirefliesTranscript;
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}
