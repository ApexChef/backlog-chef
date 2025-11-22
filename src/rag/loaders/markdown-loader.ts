/**
 * File: src/rag/loaders/markdown-loader.ts
 * Purpose: Load and parse Markdown documentation files
 * Relationships: Implements IDocumentLoader interface
 * Key Dependencies: fs, glob for file operations
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import { basename } from 'path';
import { IDocumentLoader, DataSource, RawDocument, DocumentMetadata } from '../interfaces';
import { logDebug, logWarn } from '../../utils/logger';
import { createHash } from 'crypto';

/**
 * Frontmatter extracted from markdown
 */
interface Frontmatter {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  date?: string;
  [key: string]: any;
}

/**
 * Loader for Markdown files
 *
 * Loads markdown documentation with optional frontmatter parsing.
 * Preserves structure and metadata for semantic search.
 *
 * Design decisions:
 * - Simple frontmatter extraction (YAML between --- markers)
 * - Preserves markdown headers for structure
 * - Supports glob patterns and exclusions
 * - Extracts metadata from frontmatter and file path
 */
export class MarkdownLoader implements IDocumentLoader {
  /**
   * Check if this loader can handle the given source
   */
  canLoad(source: DataSource): boolean {
    return source.type === 'markdown';
  }

  /**
   * Load markdown files from the source
   *
   * @param source Data source configuration
   * @returns Array of raw documents
   */
  async load(source: DataSource): Promise<RawDocument[]> {
    if (!source.paths || source.paths.length === 0) {
      logWarn('No paths specified for Markdown loader');
      return [];
    }

    const documents: RawDocument[] = [];
    const excludePatterns = (source.config?.exclude as string[]) || [];

    for (const pattern of source.paths) {
      logDebug(`Loading Markdown files from pattern: ${pattern}`);

      try {
        // Expand glob pattern to file paths
        const files = await glob(pattern, {
          absolute: true,
          nodir: true,
          ignore: excludePatterns,
        });

        logDebug(`Found ${files.length} files matching ${pattern}`);

        // Load each file
        for (const filePath of files) {
          try {
            const doc = await this.loadFile(filePath, source);
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

    logDebug(`Loaded ${documents.length} Markdown documents`);
    return documents;
  }

  /**
   * Load a single Markdown file
   *
   * @param filePath Path to markdown file
   * @param source Data source config
   * @returns Raw document or null if invalid
   */
  private async loadFile(filePath: string, source: DataSource): Promise<RawDocument | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');

      // Parse frontmatter if present
      const { frontmatter, content: markdownContent } = this.parseFrontmatter(content);

      const documentId = this.generateDocumentId(filePath);

      // Extract title from frontmatter or first heading
      const title =
        frontmatter.title ||
        this.extractFirstHeading(markdownContent) ||
        basename(filePath, '.md');

      return {
        id: documentId,
        content: markdownContent,
        metadata: {
          source_path: filePath,
          source_type: 'markdown',
          title,
          tags: frontmatter.tags,
          category: frontmatter.category,
          description: frontmatter.description,
          date: frontmatter.date,
          ...frontmatter, // Include any other frontmatter fields
        },
      };
    } catch (error) {
      logWarn(`Error loading file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Parse frontmatter from markdown content
   * Supports YAML frontmatter between --- markers
   *
   * @param content Markdown content
   * @returns Frontmatter object and remaining content
   */
  private parseFrontmatter(content: string): {
    frontmatter: Frontmatter;
    content: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {},
        content,
      };
    }

    const frontmatterText = match[1];
    const markdownContent = match[2];

    // Simple YAML parsing (only handles basic key: value pairs)
    const frontmatter: Frontmatter = {};

    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Handle arrays (simple implementation)
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        frontmatter[key] = arrayContent.split(',').map((v) => v.trim().replace(/['"]/g, ''));
      } else {
        // Remove quotes
        frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }

    return {
      frontmatter,
      content: markdownContent,
    };
  }

  /**
   * Extract the first heading from markdown content
   *
   * @param content Markdown content
   * @returns First heading text or null
   */
  private extractFirstHeading(content: string): string | null {
    const headingRegex = /^#+\s+(.+)$/m;
    const match = content.match(headingRegex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract metadata from a markdown document
   */
  extractMetadata(doc: RawDocument): DocumentMetadata {
    return {
      source_id: doc.id,
      source_type: 'markdown',
      source_path: doc.metadata.source_path || '',
      chunk_index: 0,
      chunk_total: 1,
      title: doc.metadata.title || 'Markdown Document',
      created_at: doc.metadata.date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: doc.metadata.tags,
      category: doc.metadata.category,
      description: doc.metadata.description,
    };
  }

  /**
   * Generate a unique document ID from file path
   */
  private generateDocumentId(filePath: string): string {
    return createHash('md5').update(filePath).digest('hex');
  }
}
