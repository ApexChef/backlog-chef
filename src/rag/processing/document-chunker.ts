/**
 * File: src/rag/processing/document-chunker.ts
 * Purpose: Document chunking with semantic splitting and overlap
 * Relationships: Implements ChunkingStrategy interface
 * Key Dependencies: None (pure TypeScript)
 */

import {
  ChunkingStrategy,
  ChunkingConfig,
  RawDocument,
  DocumentChunk,
  DocumentMetadata,
} from '../interfaces';
import { logDebug } from '../../utils/logger';
import { createHash } from 'crypto';

/**
 * Semantic document chunker
 *
 * Splits documents into chunks while:
 * - Preserving semantic boundaries (paragraphs, sections)
 * - Maintaining context with overlapping chunks
 * - Respecting size constraints
 * - Keeping related content together
 *
 * Design decisions:
 * - Split on paragraph boundaries first (preserves meaning)
 * - Fall back to sentence boundaries if paragraphs too large
 * - Add overlap between chunks for context continuity
 * - Preserve code blocks and lists intact when possible
 */
export class SemanticChunker implements ChunkingStrategy {
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig) {
    this.config = {
      splitOn: ['\n\n', '\n', '. ', ', '],
      preserveWhitespace: false,
      ...config,
    };
  }

  /**
   * Split a document into semantic chunks
   *
   * @param document Raw document to chunk
   * @returns Array of document chunks
   */
  async chunk(document: RawDocument): Promise<DocumentChunk[]> {
    logDebug(`Chunking document ${document.id} (${document.content.length} chars)`);

    // Handle empty documents
    if (!document.content || document.content.trim().length === 0) {
      return [];
    }

    // Split the document into chunks
    const textChunks = this.splitText(document.content);

    // Create DocumentChunk objects with metadata
    const chunks: DocumentChunk[] = textChunks.map((text, index) => {
      const chunkId = this.generateChunkId(document.id, index);

      return {
        id: chunkId,
        content: text,
        metadata: {
          ...document.metadata,
          source_id: document.id,
          chunk_index: index,
          chunk_total: textChunks.length,
          created_at: document.metadata.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as DocumentMetadata,
      };
    });

    logDebug(`Created ${chunks.length} chunks from document ${document.id}`);

    return chunks;
  }

  /**
   * Split text into chunks using semantic boundaries
   *
   * @param text Text to split
   * @returns Array of text chunks
   */
  private splitText(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // First, try to split on larger boundaries (paragraphs)
    const sections = this.splitOnBoundary(text, this.config.splitOn![0]);

    for (const section of sections) {
      // If section fits in a chunk, add it
      if (section.length <= this.config.maxSize) {
        // If adding this section would exceed max size, save current chunk
        if (currentChunk.length + section.length > this.config.maxSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // Add overlap from previous chunk
          currentChunk = this.createOverlap(currentChunk) + section;
        } else {
          currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + section;
        }
      } else {
        // Section too large, needs further splitting
        // Save current chunk first
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Recursively split the large section
        const subChunks = this.splitLargeSection(section);
        chunks.push(...subChunks);
      }
    }

    // Add the last chunk if not empty
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // Ensure minimum size for chunks (except the last one)
    return this.ensureMinimumSize(chunks);
  }

  /**
   * Split text on a specific boundary
   *
   * @param text Text to split
   * @param separator Separator to split on
   * @returns Array of text sections
   */
  private splitOnBoundary(text: string, separator: string): string[] {
    return text.split(separator).filter((s) => s.trim().length > 0);
  }

  /**
   * Split a large section into smaller chunks
   * Uses progressively smaller boundaries
   *
   * @param section Large section to split
   * @returns Array of smaller chunks
   */
  private splitLargeSection(section: string): string[] {
    const chunks: string[] = [];

    // Try each separator in order of preference
    for (const separator of this.config.splitOn!) {
      const parts = this.splitOnBoundary(section, separator);

      let currentChunk = '';

      for (const part of parts) {
        if (part.length <= this.config.maxSize) {
          if (currentChunk.length + part.length <= this.config.maxSize) {
            currentChunk += (currentChunk.length > 0 ? separator : '') + part;
          } else {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk);
              currentChunk = this.createOverlap(currentChunk) + part;
            } else {
              currentChunk = part;
            }
          }
        } else {
          // Part still too large, will be handled by character splitting
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
          }

          // Split by characters as last resort
          const charChunks = this.splitByCharacters(part);
          chunks.push(...charChunks);
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      // If we successfully created chunks, return them
      if (chunks.length > 0) {
        return chunks;
      }
    }

    // Fallback: split by characters
    return this.splitByCharacters(section);
  }

  /**
   * Split text by characters when all else fails
   * Ensures chunks don't exceed max size
   *
   * @param text Text to split
   * @returns Array of character-bounded chunks
   */
  private splitByCharacters(text: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.config.maxSize;
    const overlap = this.config.overlap;

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Create overlap text from the end of a chunk
   *
   * @param chunk Previous chunk
   * @returns Overlap text to prepend to next chunk
   */
  private createOverlap(chunk: string): string {
    if (chunk.length <= this.config.overlap) {
      return chunk + ' ';
    }

    // Take last N characters, but try to start at a word boundary
    const overlapText = chunk.slice(-this.config.overlap);
    const firstSpace = overlapText.indexOf(' ');

    if (firstSpace > 0) {
      return overlapText.slice(firstSpace + 1) + ' ';
    }

    return overlapText + ' ';
  }

  /**
   * Ensure chunks meet minimum size requirement
   * Combines small chunks with neighbors
   *
   * @param chunks Array of chunks
   * @returns Array of chunks meeting minimum size
   */
  private ensureMinimumSize(chunks: string[]): string[] {
    const result: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (chunk.length < this.config.minSize && i < chunks.length - 1) {
        // Combine with next chunk
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + chunk;
      } else {
        // Add accumulated chunk and current chunk
        const finalChunk = currentChunk.length > 0
          ? currentChunk + '\n\n' + chunk
          : chunk;

        result.push(finalChunk);
        currentChunk = '';
      }
    }

    // Add any remaining chunk
    if (currentChunk.length > 0) {
      result.push(currentChunk);
    }

    return result;
  }

  /**
   * Generate a unique chunk ID
   *
   * @param documentId Original document ID
   * @param chunkIndex Index of this chunk
   * @returns Unique chunk ID
   */
  private generateChunkId(documentId: string, chunkIndex: number): string {
    // Create a hash-based ID for uniqueness
    const input = `${documentId}-chunk-${chunkIndex}`;
    const hash = createHash('md5').update(input).digest('hex').substring(0, 8);
    return `${documentId}-${chunkIndex}-${hash}`;
  }
}

/**
 * Create a semantic chunker with default configuration
 *
 * Default settings:
 * - minSize: 100 characters
 * - maxSize: 500 characters
 * - overlap: 50 characters
 * - Split on paragraphs, newlines, sentences, commas
 */
export function createSemanticChunker(overrides?: Partial<ChunkingConfig>): SemanticChunker {
  const defaultConfig: ChunkingConfig = {
    strategy: 'semantic',
    minSize: 100,
    maxSize: 500,
    overlap: 50,
    splitOn: ['\n\n', '\n', '. ', ', '],
    preserveWhitespace: false,
  };

  return new SemanticChunker({
    ...defaultConfig,
    ...overrides,
  });
}
