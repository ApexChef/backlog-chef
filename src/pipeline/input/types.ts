/**
 * Input Parser Types
 *
 * Defines types for handling various input formats (TXT, JSON, XML)
 * and transforming them into a unified format for the pipeline.
 */

/**
 * Supported input formats
 */
export type InputFormat = 'text' | 'json' | 'xml';

/**
 * Parsed meeting input with enriched metadata
 */
export interface ParsedInput {
  /** Original raw transcript text */
  transcript: string;

  /** Enriched transcript with summaries and structured content */
  enrichedTranscript?: string;

  /** Meeting metadata */
  metadata: {
    /** Source file path or URL */
    source: string;

    /** Input format detected */
    format: InputFormat;

    /** Meeting title */
    title?: string;

    /** Meeting date (ISO string) */
    date?: string;

    /** Duration in minutes */
    duration?: number;

    /** Meeting organizer */
    organizer?: string;

    /** List of participants */
    participants?: Participant[];

    /** Meeting analytics (if available from source) */
    analytics?: MeetingAnalytics;

    /** Pre-extracted summaries from source */
    summaries?: MeetingSummaries;

    /** Action items from source */
    actionItems?: ActionItem[];

    /** External URLs (Fireflies, recordings, etc.) */
    externalUrls?: {
      fireflies?: string;
      recording?: string;
      transcript?: string;
    };
  };
}

/**
 * Meeting participant information
 */
export interface Participant {
  name: string;
  email?: string;
  role?: string;
  speakerId?: number;
  duration?: number;
  wordCount?: number;
  questionsCount?: number;
}

/**
 * Meeting analytics data
 */
export interface MeetingAnalytics {
  /** Sentiment analysis */
  sentiments?: {
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
  };

  /** Content categorization */
  categories?: {
    questions: number;
    tasks: number;
    datesTimes?: number;
    metrics?: number;
  };

  /** Speaker statistics */
  speakers?: Participant[];
}

/**
 * Pre-extracted summaries from meeting source
 */
export interface MeetingSummaries {
  /** High-level meeting overview */
  overview?: string;

  /** Bullet-point summary */
  bullet?: string;

  /** Shorthand notes */
  shorthand?: string;

  /** Meeting gist (one-liner) */
  gist?: string;

  /** Short summary paragraph */
  shortSummary?: string;

  /** Key topics discussed */
  topics?: string[];

  /** Keywords extracted */
  keywords?: string[];

  /** Meeting outline/chapters */
  outline?: string;
}

/**
 * Action item from meeting
 */
export interface ActionItem {
  assignee: string;
  task: string;
  timestamp?: string;
  completed?: boolean;
}

/**
 * Fireflies.ai specific JSON structure
 */
export interface FirefliesJSON {
  meetingId: string;
  firefliesUrl: string;
  timestamp: string;
  rawResponse: {
    id: string;
    title: string;
    date: number;
    duration: number;
    organizer_email: string;
    host_email?: string;
    participants: Array<{
      name: string;
      email: string;
    }>;
    transcript_url: string;
    audio_url?: string;
    analytics?: {
      sentiments: {
        negative_pct: number;
        neutral_pct: number;
        positive_pct: number;
      };
      categories: {
        questions: number;
        date_times?: number;
        metrics?: number;
        tasks: number;
      };
      speakers: Array<{
        speaker_id: number;
        name: string;
        duration: number;
        word_count: number;
        longest_monologue: number;
        monologues_count: number;
        filler_words: number;
        questions: number;
        duration_pct: number;
        words_per_minute: number;
      }>;
    };
    sentences?: Array<{
      speaker_id: number;
      speaker_name: string;
      text: string;
      start_time: number;
      end_time: number;
    }>;
    summary?: {
      keywords?: string[];
      action_items?: string;
      outline?: string;
      shorthand_bullet?: string;
      overview?: string;
      bullet_gist?: string;
      gist?: string;
      short_summary?: string;
      short_overview?: string;
      meeting_type?: string;
      topics_discussed?: string[];
      transcript_chapters?: any[];
    };
  };
}
