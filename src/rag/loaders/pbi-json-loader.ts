/**
 * File: src/rag/loaders/pbi-json-loader.ts
 * Purpose: Load and parse PBI JSON files from pipeline outputs
 * Relationships: Implements IDocumentLoader interface
 * Key Dependencies: fs, glob for file operations
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import { IDocumentLoader, DataSource, RawDocument, DocumentMetadata } from '../interfaces';
import { logDebug, logWarn } from '../../utils/logger';
import { createHash } from 'crypto';

/**
 * PBI JSON structure from pipeline output
 */
interface PBIOutput {
  id: string;
  title: string;
  description: string;
  acceptance_criteria?: string[];
  technical_notes?: string;
  suggested_tasks?: Array<{ title: string; description: string }>;
  context?: {
    similar_work?: Array<{ title: string; learnings: string[] }>;
    past_decisions?: Array<{ title: string; decision: string; rationale: string }>;
  };
  metadata?: {
    created_at?: string;
    project?: string;
    [key: string]: any;
  };
}

/**
 * Loader for PBI JSON files
 *
 * Extracts PBI information from pipeline output JSON files
 * and converts them into searchable documents.
 *
 * Design decisions:
 * - Combines all PBI fields into a single text document for semantic search
 * - Preserves structure with section headers
 * - Extracts rich metadata for filtering
 * - Supports glob patterns for batch loading
 */
export class PBIJSONLoader implements IDocumentLoader {
  /**
   * Check if this loader can handle the given source
   */
  canLoad(source: DataSource): boolean {
    return source.type === 'pbi_json';
  }

  /**
   * Load PBI JSON files from the source
   *
   * @param source Data source configuration
   * @returns Array of raw documents
   */
  async load(source: DataSource): Promise<RawDocument[]> {
    if (!source.paths || source.paths.length === 0) {
      logWarn('No paths specified for PBI JSON loader');
      return [];
    }

    const documents: RawDocument[] = [];

    for (const pattern of source.paths) {
      logDebug(`Loading PBI JSONs from pattern: ${pattern}`);

      try {
        // Expand glob pattern to file paths
        const files = await glob(pattern, {
          absolute: true,
          nodir: true,
        });

        logDebug(`Found ${files.length} files matching ${pattern}`);

        // Load each file
        for (const filePath of files) {
          try {
            const doc = await this.loadFile(filePath);
            if (doc) {
              documents.push(doc);
            }
          } catch (error) {
            logWarn(`Failed to load ${filePath}: ${error}`);
          }
        }
      } catch (error) {
        logWarn(`Failed to expand glob pattern ${pattern}: ${error}`);
      }
    }

    logDebug(`Loaded ${documents.length} PBI documents`);
    return documents;
  }

  /**
   * Load a single PBI JSON file
   *
   * @param filePath Path to JSON file
   * @returns Raw document or null if invalid
   */
  private async loadFile(filePath: string): Promise<RawDocument | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);

      // Handle both single PBI and array of PBIs
      const pbis = this.extractPBIs(json);

      if (pbis.length === 0) {
        logWarn(`No PBIs found in ${filePath}`);
        return null;
      }

      // For now, combine all PBIs in the file into one document
      // In the future, we might want to create separate documents for each PBI
      const combinedContent = pbis.map((pbi) => this.pbiToText(pbi)).join('\n\n---\n\n');

      const documentId = this.generateDocumentId(filePath);

      return {
        id: documentId,
        content: combinedContent,
        metadata: {
          source_path: filePath,
          source_type: 'pbi',
          title: `PBI Collection: ${pbis.map((p) => p.id).join(', ')}`,
          pbi_count: pbis.length,
          pbi_ids: pbis.map((p) => p.id),
        },
      };
    } catch (error) {
      logWarn(`Error loading file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Extract PBIs from JSON structure
   * Handles different JSON formats
   */
  private extractPBIs(json: any): PBIOutput[] {
    // If it's an array, return it
    if (Array.isArray(json)) {
      return json;
    }

    // If it has a pbis array
    if (json.pbis && Array.isArray(json.pbis)) {
      return json.pbis;
    }

    // If it has enriched_pbis array
    if (json.enriched_pbis && Array.isArray(json.enriched_pbis)) {
      return json.enriched_pbis.map((item: any) => item.pbi || item);
    }

    // If it has scored_pbis array
    if (json.scored_pbis && Array.isArray(json.scored_pbis)) {
      return json.scored_pbis.map((item: any) => item.pbi || item);
    }

    // If it's a single PBI
    if (json.id && json.title) {
      return [json];
    }

    return [];
  }

  /**
   * Convert PBI to searchable text
   * Preserves structure with headers for better semantic search
   */
  private pbiToText(pbi: PBIOutput): string {
    const sections: string[] = [];

    // Title and ID
    sections.push(`# PBI ${pbi.id}: ${pbi.title}`);

    // Description
    if (pbi.description) {
      sections.push(`## Description\n${pbi.description}`);
    }

    // Acceptance Criteria
    if (pbi.acceptance_criteria && pbi.acceptance_criteria.length > 0) {
      sections.push(`## Acceptance Criteria\n${pbi.acceptance_criteria.map((ac) => `- ${ac}`).join('\n')}`);
    }

    // Technical Notes
    if (pbi.technical_notes) {
      sections.push(`## Technical Notes\n${pbi.technical_notes}`);
    }

    // Suggested Tasks
    if (pbi.suggested_tasks && pbi.suggested_tasks.length > 0) {
      const tasks = pbi.suggested_tasks
        .map((task) => `- ${task.title}: ${task.description}`)
        .join('\n');
      sections.push(`## Suggested Tasks\n${tasks}`);
    }

    // Context - Similar Work
    if (pbi.context?.similar_work && pbi.context.similar_work.length > 0) {
      const similarWork = pbi.context.similar_work
        .map(
          (work) =>
            `- ${work.title}\n  Learnings: ${work.learnings.join('; ')}`
        )
        .join('\n');
      sections.push(`## Similar Work\n${similarWork}`);
    }

    // Context - Past Decisions
    if (pbi.context?.past_decisions && pbi.context.past_decisions.length > 0) {
      const decisions = pbi.context.past_decisions
        .map(
          (decision) =>
            `- ${decision.title}\n  Decision: ${decision.decision}\n  Rationale: ${decision.rationale}`
        )
        .join('\n');
      sections.push(`## Past Decisions\n${decisions}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Extract metadata from a PBI document
   */
  extractMetadata(doc: RawDocument): DocumentMetadata {
    return {
      source_id: doc.id,
      source_type: 'pbi',
      source_path: doc.metadata.source_path || '',
      chunk_index: 0,
      chunk_total: 1,
      title: doc.metadata.title || 'PBI Document',
      created_at: doc.metadata.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pbi_count: doc.metadata.pbi_count,
      pbi_ids: doc.metadata.pbi_ids,
    };
  }

  /**
   * Generate a unique document ID from file path
   */
  private generateDocumentId(filePath: string): string {
    return createHash('md5').update(filePath).digest('hex');
  }
}
