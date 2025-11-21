/**
 * Input Parser
 *
 * Unified parser for handling multiple input formats (TXT, JSON, XML)
 * Detects format and delegates to appropriate transformer
 */

import fs from 'fs';
import path from 'path';
import { ParsedInput, InputFormat, FirefliesJSON } from './types';
import { FirefliesTransformer } from './fireflies-transformer';

export class InputParser {
  private firefliesTransformer = new FirefliesTransformer();

  /**
   * Parse input file and return unified ParsedInput
   */
  parse(filePath: string): ParsedInput {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const format = this.detectFormat(filePath, content);

    console.log(`[InputParser] Detected format: ${format.toUpperCase()}`);

    switch (format) {
      case 'json':
        return this.parseJSON(content, filePath);
      case 'xml':
        return this.parseXML(content, filePath);
      case 'text':
      default:
        return this.parseText(content, filePath);
    }
  }

  /**
   * Detect input format from file extension and content
   */
  private detectFormat(filePath: string, content: string): InputFormat {
    const ext = path.extname(filePath).toLowerCase();

    // Check file extension first
    if (ext === '.json') return 'json';
    if (ext === '.xml') return 'xml';
    if (ext === '.txt') return 'text';

    // Try to detect from content
    const trimmed = content.trim();

    // Check if it's JSON
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // Check if it's XML
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return 'xml';
    }

    // Default to text
    return 'text';
  }

  /**
   * Parse plain text transcript
   */
  private parseText(content: string, filePath: string): ParsedInput {
    return {
      transcript: content,
      metadata: {
        source: filePath,
        format: 'text',
      },
    };
  }

  /**
   * Parse JSON input (auto-detect source type)
   */
  private parseJSON(content: string, filePath: string): ParsedInput {
    try {
      const json = JSON.parse(content);

      // Detect if it's Fireflies format
      if (this.isFirefliesJSON(json)) {
        console.log('[InputParser] Detected Fireflies.ai JSON format');
        return this.firefliesTransformer.transform(json, filePath);
      }

      // Check for other JSON formats here
      // if (this.isOtherFormat(json)) { ... }

      // Generic JSON with transcript field
      if (json.transcript) {
        return {
          transcript: json.transcript,
          metadata: {
            source: filePath,
            format: 'json',
            title: json.title,
            date: json.date,
            ...json.metadata,
          },
        };
      }

      throw new Error(
        'Unsupported JSON format. Expected Fireflies.ai format or generic JSON with "transcript" field'
      );
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
    }
  }

  /**
   * Parse XML input (placeholder for future implementation)
   */
  private parseXML(content: string, filePath: string): ParsedInput {
    // TODO: Implement XML parsing
    // Could support formats like:
    // - Microsoft Teams meeting exports
    // - Zoom transcripts
    // - Custom XML formats

    throw new Error('XML parsing not yet implemented');
  }

  /**
   * Check if JSON matches Fireflies.ai structure
   */
  private isFirefliesJSON(json: any): json is FirefliesJSON {
    // Check for new direct API format (from --fireflies flag)
    if (
      json &&
      typeof json === 'object' &&
      'id' in json &&
      'sentences' in json &&
      Array.isArray(json.sentences) &&
      'transcript_url' in json
    ) {
      return true;
    }

    // Check for old wrapped format (legacy support)
    return (
      json &&
      typeof json === 'object' &&
      'meetingId' in json &&
      'firefliesUrl' in json &&
      'rawResponse' in json &&
      json.rawResponse &&
      'title' in json.rawResponse &&
      'date' in json.rawResponse
    );
  }

  /**
   * Get enriched transcript if available, otherwise return basic transcript
   */
  static getTranscriptForProcessing(parsed: ParsedInput): string {
    return parsed.enrichedTranscript || parsed.transcript;
  }

  /**
   * Build context summary from parsed metadata (for logging/debugging)
   */
  static buildContextSummary(parsed: ParsedInput): string {
    const lines: string[] = [];

    if (parsed.metadata.title) {
      lines.push(`Meeting: ${parsed.metadata.title}`);
    }

    if (parsed.metadata.date) {
      const date = new Date(parsed.metadata.date);
      lines.push(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }

    if (parsed.metadata.duration) {
      lines.push(`Duration: ${parsed.metadata.duration} minutes`);
    }

    if (parsed.metadata.participants && parsed.metadata.participants.length > 0) {
      lines.push(
        `Participants: ${parsed.metadata.participants.map((p) => p.name).join(', ')}`
      );
    }

    if (parsed.metadata.summaries?.keywords && parsed.metadata.summaries.keywords.length > 0) {
      lines.push(`Keywords: ${parsed.metadata.summaries.keywords.join(', ')}`);
    }

    if (parsed.metadata.actionItems && parsed.metadata.actionItems.length > 0) {
      lines.push(`Action Items: ${parsed.metadata.actionItems.length}`);
    }

    return lines.join('\n');
  }
}
