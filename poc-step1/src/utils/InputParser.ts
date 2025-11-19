/**
 * Utility for parsing transcript and summary files
 */

import * as fs from 'fs';
import { TranscriptInput, SummaryInput } from '../types';
import { Logger } from './Logger';

export class InputParser {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('InputParser');
  }

  /**
   * Parse transcript file into structured format
   */
  parseTranscript(filePath: string): TranscriptInput {
    this.logger.debug(`Parsing transcript from ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Transcript file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Extract metadata from transcript
    const metadata = this.extractTranscriptMetadata(content);

    return {
      content,
      metadata
    };
  }

  /**
   * Parse Fireflies summary into structured format
   */
  parseSummary(filePath: string): SummaryInput {
    this.logger.debug(`Parsing summary from ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Summary file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return this.extractSummaryData(content);
  }

  /**
   * Extract metadata from transcript content
   */
  private extractTranscriptMetadata(content: string): TranscriptInput['metadata'] {
    const lines = content.split('\n');
    const participants = new Set<string>();
    let duration = 0;

    // Extract participants and duration from transcript
    for (const line of lines) {
      // Match participant names (format: "Name (Role): [timestamp] text")
      const participantMatch = line.match(/^([^:]+)\s*\([^)]+\):/);
      if (participantMatch) {
        participants.add(participantMatch[1].trim());
      }

      // Check for meeting end marker
      if (line.includes('Meeting ends at')) {
        const timeMatch = line.match(/(\d+):(\d+)/);
        if (timeMatch) {
          duration = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
        }
      }
    }

    // Extract title from first line if it exists
    let meetingTitle = 'Unknown Meeting';
    if (lines.length > 0 && lines[0].toLowerCase().includes('transcript')) {
      meetingTitle = lines[0].replace('Transcript', '').trim();
    }

    return {
      meetingId: `meeting_${Date.now()}`,
      meetingTitle,
      duration,
      participants: Array.from(participants)
    };
  }

  /**
   * Extract structured data from Fireflies summary
   */
  private extractSummaryData(content: string): SummaryInput {
    const summary: SummaryInput = {
      actionItems: [],
      questions: [],
      decisions: [],
      keyTopics: []
    };

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Identify sections
      if (trimmed.includes('Action Items')) {
        currentSection = 'actionItems';
        continue;
      } else if (trimmed.includes('Questions')) {
        currentSection = 'questions';
        continue;
      } else if (trimmed.includes('Decisions')) {
        currentSection = 'decisions';
        continue;
      } else if (trimmed.includes('Key Topics') || trimmed.includes('Key Participants')) {
        currentSection = 'keyTopics';
        continue;
      }

      // Skip empty lines and headers
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('##')) {
        continue;
      }

      // Extract bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const item = trimmed.substring(1).trim();

        switch (currentSection) {
          case 'actionItems':
            summary.actionItems.push(item);
            break;
          case 'questions':
            summary.questions.push(item);
            break;
          case 'decisions':
            summary.decisions.push(item);
            break;
          case 'keyTopics':
            // Only add if it's not a participant line
            if (!item.includes(':') || !item.includes('(')) {
              summary.keyTopics.push(item);
            }
            break;
        }
      }
    }

    this.logger.debug(`Parsed summary: ${summary.actionItems.length} action items, ` +
                     `${summary.questions.length} questions, ${summary.decisions.length} decisions`);

    return summary;
  }
}