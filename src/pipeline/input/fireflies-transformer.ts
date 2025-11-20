/**
 * Fireflies Transformer
 *
 * Transforms Fireflies.ai JSON export into ParsedInput format
 * Extracts summaries, action items, and analytics to enrich the pipeline input
 */

import { FirefliesJSON, ParsedInput, Participant, ActionItem } from './types';

export class FirefliesTransformer {
  /**
   * Transform Fireflies JSON into ParsedInput
   */
  transform(fireflies: FirefliesJSON, sourcePath: string): ParsedInput {
    const raw = fireflies.rawResponse;

    // Build transcript from sentences
    const transcript = this.buildTranscript(raw.sentences || []);

    // Build enriched transcript with summaries
    const enrichedTranscript = this.buildEnrichedTranscript(transcript, raw.summary);

    // Extract participants
    const participants = this.extractParticipants(raw);

    // Parse action items
    const actionItems = this.parseActionItems(raw.summary?.action_items);

    return {
      transcript,
      enrichedTranscript,
      metadata: {
        source: sourcePath,
        format: 'json',
        title: raw.title,
        date: new Date(raw.date).toISOString(),
        duration: Math.round(raw.duration),
        organizer: raw.organizer_email,
        participants,
        analytics: {
          sentiments: raw.analytics?.sentiments,
          categories: raw.analytics?.categories,
          speakers: this.extractSpeakerStats(raw.analytics?.speakers || []),
        },
        summaries: {
          overview: raw.summary?.overview,
          bullet: raw.summary?.bullet_gist,
          shorthand: raw.summary?.shorthand_bullet,
          gist: raw.summary?.gist,
          shortSummary: raw.summary?.short_summary,
          topics: raw.summary?.topics_discussed,
          keywords: raw.summary?.keywords,
          outline: raw.summary?.outline,
        },
        actionItems,
        externalUrls: {
          fireflies: fireflies.firefliesUrl,
          recording: raw.audio_url,
          transcript: raw.transcript_url,
        },
      },
    };
  }

  /**
   * Build transcript from Fireflies sentences
   */
  private buildTranscript(
    sentences: Array<{
      speaker_id: number;
      speaker_name: string;
      text: string;
      start_time: number;
      end_time: number;
    }>
  ): string {
    if (!sentences || sentences.length === 0) {
      return '';
    }

    // Group consecutive sentences by speaker
    const groups: Array<{ speaker: string; text: string[] }> = [];
    let currentSpeaker = '';
    let currentTexts: string[] = [];

    for (const sentence of sentences) {
      if (sentence.speaker_name !== currentSpeaker) {
        if (currentTexts.length > 0) {
          groups.push({ speaker: currentSpeaker, text: currentTexts });
        }
        currentSpeaker = sentence.speaker_name;
        currentTexts = [sentence.text];
      } else {
        currentTexts.push(sentence.text);
      }
    }

    // Add last group
    if (currentTexts.length > 0) {
      groups.push({ speaker: currentSpeaker, text: currentTexts });
    }

    // Format as dialogue
    return groups
      .map((group) => `${group.speaker}: ${group.text.join(' ')}`)
      .join('\n\n');
  }

  /**
   * Build enriched transcript with summaries prepended
   */
  private buildEnrichedTranscript(
    transcript: string,
    summary?: FirefliesJSON['rawResponse']['summary']
  ): string {
    if (!summary) return transcript;

    const sections: string[] = [];

    // Add meeting overview
    if (summary.overview) {
      sections.push('=== MEETING OVERVIEW ===');
      sections.push(summary.overview);
      sections.push('');
    }

    // Add key topics
    if (summary.keywords && summary.keywords.length > 0) {
      sections.push('=== KEY TOPICS ===');
      sections.push(summary.keywords.join(', '));
      sections.push('');
    }

    // Add bullet summary
    if (summary.bullet_gist) {
      sections.push('=== SUMMARY ===');
      sections.push(summary.bullet_gist);
      sections.push('');
    }

    // Add action items
    if (summary.action_items) {
      sections.push('=== ACTION ITEMS ===');
      sections.push(summary.action_items);
      sections.push('');
    }

    // Add shorthand notes
    if (summary.shorthand_bullet) {
      sections.push('=== DETAILED NOTES ===');
      sections.push(summary.shorthand_bullet);
      sections.push('');
    }

    // Add transcript
    sections.push('=== FULL TRANSCRIPT ===');
    sections.push(transcript);

    return sections.join('\n');
  }

  /**
   * Extract participants with metadata
   */
  private extractParticipants(raw: FirefliesJSON['rawResponse']): Participant[] {
    const participants: Participant[] = [];

    // Add basic participants
    if (raw.participants) {
      for (const p of raw.participants) {
        participants.push({
          name: p.name,
          email: p.email,
        });
      }
    }

    // Enrich with speaker stats if available
    if (raw.analytics?.speakers) {
      for (const speaker of raw.analytics.speakers) {
        const existing = participants.find((p) => p.name === speaker.name);
        if (existing) {
          existing.speakerId = speaker.speaker_id;
          existing.duration = speaker.duration;
          existing.wordCount = speaker.word_count;
          existing.questionsCount = speaker.questions;
        } else {
          participants.push({
            name: speaker.name,
            speakerId: speaker.speaker_id,
            duration: speaker.duration,
            wordCount: speaker.word_count,
            questionsCount: speaker.questions,
          });
        }
      }
    }

    return participants;
  }

  /**
   * Extract speaker statistics
   */
  private extractSpeakerStats(
    speakers?: Array<{
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
    }>
  ): Participant[] {
    if (!speakers) return [];

    return speakers.map((s) => ({
      name: s.name,
      speakerId: s.speaker_id,
      duration: s.duration,
      wordCount: s.word_count,
      questionsCount: s.questions,
    }));
  }

  /**
   * Parse action items from Fireflies text format
   */
  private parseActionItems(actionItemsText?: string): ActionItem[] {
    if (!actionItemsText) return [];

    const items: ActionItem[] = [];
    const lines = actionItemsText.split('\n').filter((line) => line.trim());

    let currentAssignee = '';

    for (const line of lines) {
      // Check if line starts with **Name** (assignee)
      const assigneeMatch = line.match(/^\*\*([^*]+)\*\*/);
      if (assigneeMatch) {
        currentAssignee = assigneeMatch[1].trim();
        continue;
      }

      // Parse task with timestamp
      const taskMatch = line.match(/^(.+?)\s*\((\d{2}:\d{2})\)$/);
      if (taskMatch && currentAssignee) {
        items.push({
          assignee: currentAssignee,
          task: taskMatch[1].trim(),
          timestamp: taskMatch[2],
          completed: false,
        });
      }
    }

    return items;
  }
}
