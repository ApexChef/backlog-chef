/**
 * File: src/rag/stores/chroma-store.ts
 * Purpose: ChromaDB vector store implementation for local semantic search
 * Relationships: Implements IVectorStore interface
 * Key Dependencies: chromadb (ChromaDB client)
 */

import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import {
  IVectorStore,
  VectorStoreConfig,
  DocumentChunk,
  SearchResult,
  VectorSearchQuery,
  VectorStoreStats,
} from '../interfaces';
import { logInfo, logDebug, logError, logWarn } from '../../utils/logger';

/**
 * ChromaDB vector store implementation
 *
 * ChromaDB is a local vector database optimized for AI applications.
 * It provides:
 * - Built-in persistence to disk
 * - Metadata filtering
 * - Similarity search with cosine distance
 * - Native TypeScript client
 *
 * Design decisions:
 * - Uses local file-based storage for simplicity
 * - Automatic collection creation
 * - Graceful handling of empty collections
 * - Metadata stored as JSON for flexibility
 */
export class ChromaStore implements IVectorStore {
  private client?: ChromaClient;
  private collection?: Collection;
  private config?: VectorStoreConfig;
  private initialized = false;

  /**
   * Initialize the ChromaDB client and collection
   *
   * @param config Vector store configuration
   */
  async initialize(config: VectorStoreConfig): Promise<void> {
    if (this.initialized) {
      logWarn('ChromaStore already initialized, skipping...');
      return;
    }

    this.config = config;

    try {
      logInfo(`Initializing ChromaDB store at ${config.path}`);

      // Create ChromaDB client
      // For ChromaDB 3.x, we need to connect to localhost server
      // In production, you'd run: chroma run --path ./vector-db
      // For testing, we'll use in-memory or connect to default server
      this.client = new ChromaClient({
        host: 'localhost',
        port: 8000,
      });

      // Get or create collection
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: config.collection,
          metadata: {
            description: 'Backlog Chef RAG context storage',
            created_at: new Date().toISOString(),
          },
        });

        logInfo(`Connected to collection: ${config.collection}`);
      } catch (error) {
        logError(`Failed to get/create collection: ${error}`);
        throw error;
      }

      this.initialized = true;
      logInfo('ChromaDB store initialized successfully');
    } catch (error) {
      logError(`Failed to initialize ChromaDB store: ${error}`);
      throw new Error(`ChromaDB initialization failed: ${error}`);
    }
  }

  /**
   * Insert or update documents in ChromaDB
   *
   * @param documents Documents with embeddings to upsert
   */
  async upsert(documents: DocumentChunk[]): Promise<void> {
    this.ensureInitialized();

    if (documents.length === 0) {
      logWarn('No documents to upsert');
      return;
    }

    logDebug(`Upserting ${documents.length} documents to ChromaDB`);

    try {
      // Prepare data for ChromaDB
      const ids: string[] = [];
      const embeddings: number[][] = [];
      const metadatas: Record<string, any>[] = [];
      const documents_text: string[] = [];

      for (const doc of documents) {
        if (!doc.embedding) {
          throw new Error(`Document ${doc.id} missing embedding`);
        }

        ids.push(doc.id);

        // Convert Float32Array to number[] if needed
        const embeddingArray = doc.embedding instanceof Float32Array
          ? Array.from(doc.embedding)
          : doc.embedding;

        embeddings.push(embeddingArray);
        metadatas.push(this.sanitizeMetadata(doc.metadata));
        documents_text.push(doc.content);
      }

      // Upsert to collection
      await this.collection!.upsert({
        ids,
        embeddings,
        metadatas,
        documents: documents_text,
      });

      logInfo(`Successfully upserted ${documents.length} documents`);
    } catch (error) {
      logError(`Failed to upsert documents: ${error}`);
      throw new Error(`Document upsert failed: ${error}`);
    }
  }

  /**
   * Search for similar vectors
   *
   * @param query Vector search query with filters
   * @returns Array of search results
   */
  async search(query: VectorSearchQuery): Promise<SearchResult[]> {
    this.ensureInitialized();

    logDebug(`Searching with topK=${query.topK}, minSimilarity=${query.minSimilarity}`);

    try {
      // Convert Float32Array to number[] if needed
      const queryEmbedding = query.vector instanceof Float32Array
        ? Array.from(query.vector)
        : query.vector;

      // Perform similarity search
      const results = await this.collection!.query({
        queryEmbeddings: [queryEmbedding],
        nResults: query.topK,
        where: query.filter,
        include: ['documents', 'metadatas', 'distances'] as any,
      });

      logDebug(`ChromaDB raw results: ${JSON.stringify({
        idsLength: results.ids?.length || 0,
        firstIdLength: results.ids?.[0]?.length || 0
      })}`);

      // Transform ChromaDB results to our SearchResult format
      const searchResults: SearchResult[] = [];

      if (results.ids && results.ids.length > 0 && results.ids[0].length > 0) {
        const ids = results.ids[0];
        const documents = results.documents?.[0] || [];
        const metadatas = results.metadatas?.[0] || [];
        const distances = results.distances?.[0] || [];

        for (let i = 0; i < ids.length; i++) {
          // Convert distance to similarity score (ChromaDB uses L2 distance)
          // Similarity = 1 / (1 + distance)
          const distance = distances[i] || 0;
          const similarity = 1 / (1 + distance);

          // Filter by minimum similarity if specified
          if (query.minSimilarity && similarity < query.minSimilarity) {
            continue;
          }

          searchResults.push({
            id: ids[i],
            content: documents[i] as string || '',
            score: similarity,
            metadata: metadatas[i] as any || {},
            explanation: {
              semantic_score: similarity,
            },
          });
        }
      }

      logInfo(`Found ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      logError(`Search failed: ${error}`);
      throw new Error(`Vector search failed: ${error}`);
    }
  }

  /**
   * Delete documents matching filter
   *
   * @param filter Metadata filter for deletion
   * @returns Number of documents deleted
   */
  async delete(filter: Record<string, any>): Promise<number> {
    this.ensureInitialized();

    logDebug(`Deleting documents with filter: ${JSON.stringify(filter)}`);

    try {
      // ChromaDB delete by filter
      await this.collection!.delete({
        where: filter,
      });

      // ChromaDB doesn't return count, so we return -1 to indicate unknown
      logInfo('Documents deleted successfully');
      return -1;
    } catch (error) {
      logError(`Delete failed: ${error}`);
      throw new Error(`Document deletion failed: ${error}`);
    }
  }

  /**
   * Get statistics about the vector store
   *
   * @returns Vector store statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    this.ensureInitialized();

    try {
      const count = await this.collection!.count();

      return {
        documentCount: count,
        vectorCount: count,
        storageSize: 0, // ChromaDB doesn't expose storage size directly
        collectionName: this.config!.collection,
        lastIndexed: undefined,
      };
    } catch (error) {
      logError(`Failed to get stats: ${error}`);
      throw new Error(`Stats retrieval failed: ${error}`);
    }
  }

  /**
   * Check if vector store is healthy
   *
   * @returns true if healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.client || !this.collection) {
      return false;
    }

    try {
      // Try to get collection info as a health check
      await this.collection.count();
      return true;
    } catch (error) {
      logError(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Close connections and cleanup
   */
  async close(): Promise<void> {
    if (this.client) {
      // ChromaDB client doesn't have an explicit close method
      // Resources will be cleaned up automatically
      this.client = undefined;
      this.collection = undefined;
      this.initialized = false;
      logInfo('ChromaDB store closed');
    }
  }

  /**
   * Ensure the store is initialized
   * Throws error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.client || !this.collection) {
      throw new Error('ChromaStore not initialized. Call initialize() first.');
    }
  }

  /**
   * Sanitize metadata for ChromaDB
   * ChromaDB has restrictions on metadata types
   *
   * Allowed types: string, number, boolean
   * Arrays must be arrays of allowed types
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Handle arrays - ChromaDB doesn't support arrays in metadata
      // Convert all arrays to JSON string
      if (Array.isArray(value)) {
        sanitized[key] = JSON.stringify(value);
        continue;
      }

      // Handle objects
      if (typeof value === 'object') {
        // Convert objects to JSON string
        sanitized[key] = JSON.stringify(value);
        continue;
      }

      // Handle primitives
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        sanitized[key] = value;
        continue;
      }

      // Skip unsupported types
      logWarn(`Skipping unsupported metadata type for key ${key}: ${typeof value}`);
    }

    return sanitized;
  }

  /**
   * Clear all documents from the collection
   * Useful for testing or rebuilding the index
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      logInfo(`Clearing all documents from collection ${this.config!.collection}`);

      // Delete the collection
      await this.client!.deleteCollection({
        name: this.config!.collection,
      });

      // Recreate the collection
      this.collection = await this.client!.createCollection({
        name: this.config!.collection,
        metadata: {
          description: 'Backlog Chef RAG context storage',
          created_at: new Date().toISOString(),
        },
      });

      logInfo('Collection cleared and recreated');
    } catch (error) {
      logError(`Failed to clear collection: ${error}`);
      throw new Error(`Collection clear failed: ${error}`);
    }
  }
}

/**
 * Create a ChromaDB store with default configuration
 *
 * @param path Path to store the vector database
 * @param collection Collection name
 */
export function createChromaStore(path: string, collection: string): ChromaStore {
  const store = new ChromaStore();
  return store;
}
