/**
 * File: src/rag/embeddings/transformers-embedding.ts
 * Purpose: Embedding service using @xenova/transformers for local inference
 * Relationships: Implements IEmbeddingService interface
 * Key Dependencies: @xenova/transformers (browser-compatible transformers.js)
 */

import { pipeline } from '@xenova/transformers';
import type { Pipeline as PipelineType } from '@xenova/transformers';
import { IEmbeddingService, Vector } from '../interfaces';
import { logInfo, logDebug, logError } from '../../utils/logger';

/**
 * Embedding service configuration
 */
export interface TransformersEmbeddingConfig {
  /** Model name from HuggingFace */
  model: string;

  /** Expected embedding dimensions */
  dimensions: number;

  /** Batch size for encoding */
  batchSize?: number;

  /** Device to run on (cpu only for now) */
  device?: 'cpu';
}

/**
 * Embedding service using transformers.js
 *
 * Uses the all-MiniLM-L6-v2 model by default for fast, local embeddings.
 * This model produces 384-dimensional vectors with good quality for semantic search.
 *
 * Design decisions:
 * - Uses @xenova/transformers for browser-compatible, local inference
 * - No API calls needed - fully offline capable
 * - Cached model downloads for faster subsequent runs
 * - Batch processing for efficiency
 */
export class TransformersEmbedding implements IEmbeddingService {
  private config: TransformersEmbeddingConfig;
  private pipeline?: any; // Using any because Pipeline type is complex
  private initialized = false;

  constructor(config: TransformersEmbeddingConfig) {
    this.config = {
      batchSize: 32,
      device: 'cpu',
      ...config,
    };
  }

  /**
   * Initialize the embedding pipeline
   * Downloads the model on first run (cached thereafter)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logInfo(`Initializing embedding service with model: ${this.config.model}`);

      // Create feature extraction pipeline
      // This will download the model on first run (cached in ~/.cache/transformers)
      this.pipeline = await pipeline(
        'feature-extraction',
        this.config.model
      );

      this.initialized = true;
      logInfo(`Embedding service initialized successfully`);
    } catch (error) {
      logError(`Failed to initialize embedding service: ${error}`);
      throw new Error(`Embedding initialization failed: ${error}`);
    }
  }

  /**
   * Encode multiple documents into vectors
   * Uses batching for efficiency
   *
   * @param texts Array of text to encode
   * @returns Array of embedding vectors
   */
  async encodeDocuments(texts: string[]): Promise<Vector[]> {
    if (!this.initialized || !this.pipeline) {
      throw new Error('Embedding service not initialized. Call initialize() first.');
    }

    if (texts.length === 0) {
      return [];
    }

    logDebug(`Encoding ${texts.length} documents`);

    try {
      const embeddings: Vector[] = [];
      const batchSize = this.config.batchSize || 32;

      // Process in batches for memory efficiency
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await this.encodeBatch(batch);
        embeddings.push(...batchEmbeddings);

        logDebug(`Encoded batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`);
      }

      return embeddings;
    } catch (error) {
      logError(`Failed to encode documents: ${error}`);
      throw new Error(`Document encoding failed: ${error}`);
    }
  }

  /**
   * Encode a single query into a vector
   *
   * @param text Query text to encode
   * @returns Embedding vector
   */
  async encodeQuery(text: string): Promise<Vector> {
    if (!this.initialized || !this.pipeline) {
      throw new Error('Embedding service not initialized. Call initialize() first.');
    }

    logDebug(`Encoding query: ${text.substring(0, 50)}...`);

    try {
      // Use the pipeline to generate embedding
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding array from the output
      const embedding = this.extractEmbedding(output);

      // Validate dimensions
      if (embedding.length !== this.config.dimensions) {
        throw new Error(
          `Embedding dimension mismatch. Expected ${this.config.dimensions}, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      logError(`Failed to encode query: ${error}`);
      throw new Error(`Query encoding failed: ${error}`);
    }
  }

  /**
   * Get the dimensions of the embedding vectors
   */
  getDimensions(): number {
    return this.config.dimensions;
  }

  /**
   * Get the model name being used
   */
  getModelName(): string {
    return this.config.model;
  }

  /**
   * Encode a batch of texts
   * Internal helper for batch processing
   */
  private async encodeBatch(texts: string[]): Promise<Vector[]> {
    if (!this.pipeline) {
      throw new Error('Pipeline not initialized');
    }

    const embeddings: Vector[] = [];

    // Process each text in the batch
    for (const text of texts) {
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = this.extractEmbedding(output);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Extract embedding array from pipeline output
   * Handles different output formats from transformers.js
   */
  private extractEmbedding(output: any): Float32Array {
    // The output can be in different formats depending on the model
    // Try to extract the data array
    if (output.data) {
      return new Float32Array(output.data);
    }

    if (output.tolist) {
      const list = output.tolist();
      // Handle 2D array (batch size 1)
      if (Array.isArray(list) && Array.isArray(list[0])) {
        return new Float32Array(list[0]);
      }
      return new Float32Array(list);
    }

    if (Array.isArray(output)) {
      return new Float32Array(output);
    }

    throw new Error('Unable to extract embedding from pipeline output');
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Transformers.js will automatically clean up
      this.pipeline = undefined;
      this.initialized = false;
      logDebug('Embedding service disposed');
    }
  }
}

/**
 * Create a default embedding service
 * Uses all-MiniLM-L6-v2 model (80MB, 384 dimensions)
 */
export function createDefaultEmbeddingService(): TransformersEmbedding {
  return new TransformersEmbedding({
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    batchSize: 32,
    device: 'cpu',
  });
}
