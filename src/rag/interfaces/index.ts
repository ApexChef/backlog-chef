/**
 * File: src/rag/interfaces/index.ts
 * Purpose: Core interface definitions for the RAG system
 * Relationships: Used by all RAG components to ensure type safety and consistency
 * Key Dependencies: None (pure interfaces)
 */

/**
 * Vector representation of text
 */
export type Vector = Float32Array | number[];

/**
 * Document metadata stored with vectors
 */
export interface DocumentMetadata {
  /** Unique identifier for the source document */
  source_id: string;

  /** Type of source (pbi, markdown, confluence, azure_devops) */
  source_type: string;

  /** File path or URL */
  source_path: string;

  /** Position of this chunk in the original document */
  chunk_index: number;

  /** Total number of chunks from this document */
  chunk_total: number;

  /** Document title (if available) */
  title?: string;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  /** Project identifier for multi-tenancy */
  project_id?: string;

  /** Searchable tags */
  tags?: string[];

  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Document chunk with content and metadata
 */
export interface DocumentChunk {
  /** Unique identifier for this chunk */
  id: string;

  /** Text content of the chunk */
  content: string;

  /** Vector embedding (populated after embedding) */
  embedding?: Vector;

  /** Metadata about this chunk */
  metadata: DocumentMetadata;
}

/**
 * Raw document before chunking
 */
export interface RawDocument {
  /** Unique identifier */
  id: string;

  /** Document content */
  content: string;

  /** Source metadata */
  metadata: Partial<DocumentMetadata>;
}

/**
 * Data source configuration
 */
export interface DataSource {
  /** Source name */
  name: string;

  /** Source type */
  type: 'pbi_json' | 'markdown' | 'confluence' | 'azure_devops' | 'custom';

  /** File paths or patterns */
  paths?: string[];

  /** Whether to watch for changes */
  watch?: boolean;

  /** Whether to auto-index new files */
  autoIndex?: boolean;

  /** Additional source-specific configuration */
  config?: Record<string, any>;
}

/**
 * Search result from vector store
 */
export interface SearchResult {
  /** Chunk/document ID */
  id: string;

  /** Text content */
  content: string;

  /** Similarity score (0-1) */
  score: number;

  /** Associated metadata */
  metadata: DocumentMetadata;

  /** Score explanation (optional) */
  explanation?: {
    semantic_score: number;
    keyword_score?: number;
    rerank_score?: number;
  };
}

/**
 * Search query configuration
 */
export interface SearchQuery {
  /** Query text */
  text: string;

  /** Metadata filters */
  filters?: {
    source_type?: string[];
    date_range?: { start: Date; end: Date };
    project_id?: string;
    tags?: string[];
    [key: string]: any;
  };

  /** Search options */
  options?: {
    /** Number of results to return */
    topK?: number;

    /** Minimum similarity threshold */
    minSimilarity?: number;

    /** Include metadata in results */
    includeMetadata?: boolean;

    /** Include score explanations */
    explainScore?: boolean;
  };
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
  /** Total number of documents indexed */
  documentCount: number;

  /** Total number of chunks/vectors */
  vectorCount: number;

  /** Storage size in bytes */
  storageSize: number;

  /** Last indexing timestamp */
  lastIndexed?: Date;

  /** Collection/index name */
  collectionName: string;
}

/**
 * Indexing result
 */
export interface IndexResult {
  /** Whether indexing was successful */
  success: boolean;

  /** Statistics about the indexing operation */
  stats: {
    /** Number of documents processed */
    documentsProcessed: number;

    /** Number of chunks created */
    chunksCreated: number;

    /** Number of vectors indexed */
    vectorsIndexed: number;

    /** Time elapsed in milliseconds */
    timeElapsed: number;

    /** Errors encountered */
    errors: Array<{
      source: string;
      error: string;
    }>;
  };
}

/**
 * Vector store interface
 * Abstract interface for different vector database implementations
 */
export interface IVectorStore {
  /**
   * Initialize the vector store
   * @param config Configuration for this store
   */
  initialize(config: VectorStoreConfig): Promise<void>;

  /**
   * Insert or update documents in the vector store
   * @param documents Documents with embeddings to upsert
   */
  upsert(documents: DocumentChunk[]): Promise<void>;

  /**
   * Search for similar vectors
   * @param query Search query with filters
   */
  search(query: VectorSearchQuery): Promise<SearchResult[]>;

  /**
   * Delete documents matching filter
   * @param filter Metadata filter for deletion
   */
  delete(filter: Record<string, any>): Promise<number>;

  /**
   * Get statistics about the vector store
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * Check if vector store is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
}

/**
 * Vector search query (internal, after embedding)
 */
export interface VectorSearchQuery {
  /** Query vector */
  vector: Vector;

  /** Number of results */
  topK: number;

  /** Metadata filters */
  filter?: Record<string, any>;

  /** Minimum similarity score */
  minSimilarity?: number;
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  /** Store type */
  type: 'chroma' | 'pinecone' | 'faiss' | 'weaviate';

  /** Local storage path (for local stores) */
  path?: string;

  /** Collection/index name */
  collection: string;

  /** Persist to disk */
  persist?: boolean;

  /** Cloud configuration (for cloud stores) */
  cloud?: {
    apiKey: string;
    environment: string;
    index: string;
    namespace?: string;
  };
}

/**
 * Embedding service interface
 */
export interface IEmbeddingService {
  /**
   * Initialize the embedding service
   */
  initialize(): Promise<void>;

  /**
   * Encode multiple documents into vectors
   * @param texts Array of text to encode
   */
  encodeDocuments(texts: string[]): Promise<Vector[]>;

  /**
   * Encode a single query into a vector
   * @param text Query text to encode
   */
  encodeQuery(text: string): Promise<Vector>;

  /**
   * Get the dimensions of the embedding vectors
   */
  getDimensions(): number;

  /**
   * Get the model name being used
   */
  getModelName(): string;
}

/**
 * Document loader interface
 */
export interface IDocumentLoader {
  /**
   * Check if this loader can handle the given source
   * @param source Data source configuration
   */
  canLoad(source: DataSource): boolean;

  /**
   * Load documents from the source
   * @param source Data source configuration
   */
  load(source: DataSource): Promise<RawDocument[]>;

  /**
   * Extract metadata from a document
   * @param doc Raw document
   */
  extractMetadata(doc: RawDocument): DocumentMetadata;
}

/**
 * Chunking strategy
 */
export interface ChunkingStrategy {
  /**
   * Split a document into chunks
   * @param document Raw document to chunk
   */
  chunk(document: RawDocument): Promise<DocumentChunk[]>;
}

/**
 * Chunking configuration
 */
export interface ChunkingConfig {
  /** Chunking strategy */
  strategy: 'semantic' | 'fixed' | 'recursive';

  /** Minimum chunk size in characters */
  minSize: number;

  /** Maximum chunk size in characters */
  maxSize: number;

  /** Overlap between chunks in characters */
  overlap: number;

  /** Separators to split on (in priority order) */
  splitOn?: string[];

  /** Preserve whitespace */
  preserveWhitespace?: boolean;
}

/**
 * Query processor interface
 */
export interface IQueryProcessor {
  /**
   * Process and enhance a search query
   * @param input Raw query text
   * @param context Optional PBI context
   */
  process(input: string, context?: any): Promise<ProcessedQuery>;

  /**
   * Expand query with synonyms and related terms
   * @param query Processed query
   */
  expand(query: ProcessedQuery): Promise<string[]>;

  /**
   * Extract keywords from text
   * @param text Input text
   */
  extractKeywords(text: string): Promise<string[]>;
}

/**
 * Processed query
 */
export interface ProcessedQuery {
  /** Original query */
  original: string;

  /** Cleaned query */
  cleaned: string;

  /** Extracted keywords */
  keywords: string[];

  /** Query intent */
  intent?: string;
}

/**
 * Reranker interface (for future implementation)
 */
export interface IReranker {
  /**
   * Rerank search results
   * @param query Original query
   * @param results Initial search results
   * @param topK Number of results to return after reranking
   */
  rerank(query: string, results: SearchResult[], topK: number): Promise<SearchResult[]>;
}

/**
 * RAG service configuration
 */
export interface RAGConfig {
  /** Whether RAG is enabled */
  enabled: boolean;

  /** Vector store provider */
  provider: 'chroma' | 'pinecone' | 'faiss' | 'weaviate';

  /** Embedding configuration */
  embedding: {
    model: string;
    dimensions: number;
    batchSize?: number;
    device?: 'cpu' | 'cuda';
  };

  /** Storage configuration */
  storage: {
    local?: {
      type: string;
      path: string;
      persist: boolean;
      collection: string;
    };
    cloud?: {
      type: string;
      apiKey: string;
      environment: string;
      index: string;
      namespace?: string;
    };
  };

  /** Chunking configuration */
  chunking: ChunkingConfig;

  /** Retrieval configuration */
  retrieval: {
    topK: number;
    minSimilarity: number;
    maxDistance?: number;
    rerank?: {
      enabled: boolean;
      model: string;
      topK: number;
      batchSize: number;
    };
    cache?: {
      enabled: boolean;
      ttl: number;
      maxEntries: number;
    };
  };

  /** Data sources */
  sources: DataSource[];

  /** Monitoring configuration */
  monitoring?: {
    metrics?: {
      enabled: boolean;
      exportPath: string;
      exportInterval: number;
    };
    logging?: {
      level: string;
      path: string;
      maxFiles: number;
      maxSize: string;
    };
  };
}

/**
 * RAG system status
 */
export interface RAGStatus {
  /** Whether the system is initialized */
  initialized: boolean;

  /** Whether the system is healthy */
  healthy: boolean;

  /** Vector store statistics */
  stats: VectorStoreStats;

  /** Number of indexed sources */
  indexedSources: number;

  /** Last indexing time */
  lastIndexed?: Date;

  /** Error message if unhealthy */
  error?: string;
}

/**
 * Enriched context for Step 4
 */
export interface EnrichedContext {
  /** Similar work found via RAG */
  similar_work: Array<{
    ref: string;
    title: string;
    similarity: number;
    learnings: string[];
    link: string;
  }>;

  /** Past decisions found */
  past_decisions: Array<{
    ref: string;
    title: string;
    decision: string;
    rationale: string;
    constraints?: string;
    date?: string;
  }>;

  /** Technical documentation found */
  technical_docs: Array<{
    ref: string;
    title: string;
    relevant_sections: string[];
    link: string;
  }>;

  /** Risk flags identified */
  risk_flags: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
  }>;

  /** Suggestions based on context */
  suggestions: string[];
}
