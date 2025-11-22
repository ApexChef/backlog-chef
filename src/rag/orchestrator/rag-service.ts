/**
 * File: src/rag/orchestrator/rag-service.ts
 * Purpose: Main RAG service coordinating all components
 * Relationships: Central orchestrator for vector store, embeddings, and document processing
 * Key Dependencies: All RAG components
 */

import {
  RAGConfig,
  RAGStatus,
  IVectorStore,
  IEmbeddingService,
  IDocumentLoader,
  ChunkingStrategy,
  SearchQuery,
  SearchResult,
  IndexResult,
  DataSource,
  EnrichedContext,
  RawDocument,
  DocumentChunk,
} from '../interfaces';

import { ChromaStore } from '../stores/chroma-store';
import { TransformersEmbedding } from '../embeddings/transformers-embedding';
import { SemanticChunker, createSemanticChunker } from '../processing/document-chunker';
import { PBIJSONLoader } from '../loaders/pbi-json-loader';
import { MarkdownLoader } from '../loaders/markdown-loader';

import { logInfo, logDebug, logError, logWarn } from '../../utils/logger';

/**
 * Main RAG service
 *
 * Coordinates all RAG components:
 * - Vector store management
 * - Document loading and chunking
 * - Embedding generation
 * - Semantic search
 *
 * Design decisions:
 * - Singleton pattern for resource management
 * - Lazy initialization for performance
 * - Graceful degradation on errors
 * - Comprehensive logging for debugging
 */
export class RAGService {
  private config: RAGConfig;
  private vectorStore?: IVectorStore;
  private embeddingService?: IEmbeddingService;
  private chunker?: ChunkingStrategy;
  private loaders: Map<string, IDocumentLoader> = new Map();
  private initialized = false;

  private constructor(config: RAGConfig) {
    this.config = config;
  }

  /**
   * Create and initialize a new RAG service
   *
   * @param config RAG configuration
   * @returns Initialized RAG service
   */
  static async create(config: RAGConfig): Promise<RAGService> {
    const service = new RAGService(config);
    await service.initialize();
    return service;
  }

  /**
   * Initialize all RAG components
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      logWarn('RAG service already initialized');
      return;
    }

    logInfo('Initializing RAG service...');

    try {
      // Initialize embedding service
      await this.initializeEmbeddingService();

      // Initialize vector store
      await this.initializeVectorStore();

      // Initialize chunker
      this.initializeChunker();

      // Initialize document loaders
      this.initializeLoaders();

      this.initialized = true;
      logInfo('RAG service initialized successfully');
    } catch (error) {
      logError(`Failed to initialize RAG service: ${error}`);
      throw new Error(`RAG service initialization failed: ${error}`);
    }
  }

  /**
   * Initialize the embedding service
   */
  private async initializeEmbeddingService(): Promise<void> {
    logInfo(`Initializing embedding service: ${this.config.embedding.model}`);

    this.embeddingService = new TransformersEmbedding({
      model: this.config.embedding.model,
      dimensions: this.config.embedding.dimensions,
      batchSize: this.config.embedding.batchSize,
      device: 'cpu' as const,
    });

    await this.embeddingService.initialize();
    logInfo('Embedding service initialized');
  }

  /**
   * Initialize the vector store
   */
  private async initializeVectorStore(): Promise<void> {
    logInfo(`Initializing vector store: ${this.config.provider}`);

    // Currently only support ChromaDB
    if (this.config.provider === 'chroma') {
      const storageConfig = this.config.storage.local!;

      this.vectorStore = new ChromaStore();
      await this.vectorStore.initialize({
        type: 'chroma',
        path: storageConfig.path,
        collection: storageConfig.collection,
        persist: storageConfig.persist,
      });

      logInfo('Vector store initialized');
    } else {
      throw new Error(`Unsupported vector store provider: ${this.config.provider}`);
    }
  }

  /**
   * Initialize the document chunker
   */
  private initializeChunker(): void {
    logInfo('Initializing document chunker');

    this.chunker = createSemanticChunker(this.config.chunking);

    logInfo('Document chunker initialized');
  }

  /**
   * Initialize document loaders
   */
  private initializeLoaders(): void {
    logInfo('Initializing document loaders');

    // Register available loaders
    this.loaders.set('pbi_json', new PBIJSONLoader());
    this.loaders.set('markdown', new MarkdownLoader());

    logInfo(`Registered ${this.loaders.size} document loaders`);
  }

  /**
   * Index documents from configured sources
   *
   * @returns Indexing result with statistics
   */
  async indexSources(): Promise<IndexResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const errors: Array<{ source: string; error: string }> = [];

    let totalDocumentsProcessed = 0;
    let totalChunksCreated = 0;
    let totalVectorsIndexed = 0;

    logInfo(`Indexing ${this.config.sources.length} sources...`);

    for (const source of this.config.sources) {
      try {
        logInfo(`Indexing source: ${source.name} (${source.type})`);

        const result = await this.indexSource(source);

        totalDocumentsProcessed += result.stats.documentsProcessed;
        totalChunksCreated += result.stats.chunksCreated;
        totalVectorsIndexed += result.stats.vectorsIndexed;

        if (result.stats.errors.length > 0) {
          errors.push(...result.stats.errors);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Failed to index source ${source.name}: ${errorMessage}`);
        errors.push({
          source: source.name,
          error: errorMessage,
        });
      }
    }

    const timeElapsed = Date.now() - startTime;

    logInfo(
      `Indexing complete: ${totalDocumentsProcessed} docs, ${totalChunksCreated} chunks, ${totalVectorsIndexed} vectors in ${timeElapsed}ms`
    );

    return {
      success: errors.length === 0,
      stats: {
        documentsProcessed: totalDocumentsProcessed,
        chunksCreated: totalChunksCreated,
        vectorsIndexed: totalVectorsIndexed,
        timeElapsed,
        errors,
      },
    };
  }

  /**
   * Index a single data source
   *
   * @param source Data source to index
   * @returns Indexing result
   */
  async indexSource(source: DataSource): Promise<IndexResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const errors: Array<{ source: string; error: string }> = [];

    // Get appropriate loader
    const loader = this.getLoader(source);
    if (!loader) {
      throw new Error(`No loader available for source type: ${source.type}`);
    }

    // Load documents
    logDebug(`Loading documents from ${source.name}`);
    const documents = await loader.load(source);
    logInfo(`Loaded ${documents.length} documents from ${source.name}`);

    // Chunk documents
    logDebug('Chunking documents');
    const allChunks: DocumentChunk[] = [];

    for (const doc of documents) {
      try {
        const chunks = await this.chunker!.chunk(doc);
        allChunks.push(...chunks);
      } catch (error) {
        logWarn(`Failed to chunk document ${doc.id}: ${error}`);
        errors.push({
          source: doc.id,
          error: String(error),
        });
      }
    }

    logInfo(`Created ${allChunks.length} chunks`);

    // Generate embeddings
    logDebug('Generating embeddings');
    const texts = allChunks.map((chunk) => chunk.content);
    const embeddings = await this.embeddingService!.encodeDocuments(texts);

    // Attach embeddings to chunks
    for (let i = 0; i < allChunks.length; i++) {
      allChunks[i].embedding = embeddings[i];
    }

    logInfo(`Generated ${embeddings.length} embeddings`);

    // Index in vector store
    logDebug('Indexing in vector store');
    await this.vectorStore!.upsert(allChunks);

    const timeElapsed = Date.now() - startTime;

    return {
      success: errors.length === 0,
      stats: {
        documentsProcessed: documents.length,
        chunksCreated: allChunks.length,
        vectorsIndexed: allChunks.length,
        timeElapsed,
        errors,
      },
    };
  }

  /**
   * Search for relevant context
   *
   * @param query Search query
   * @returns Array of search results
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    this.ensureInitialized();

    logDebug(`Searching for: ${query.text.substring(0, 50)}...`);

    try {
      // Generate query embedding
      const queryVector = await this.embeddingService!.encodeQuery(query.text);

      // Search vector store
      const results = await this.vectorStore!.search({
        vector: queryVector,
        topK: query.options?.topK || this.config.retrieval.topK,
        filter: query.filters,
        minSimilarity: query.options?.minSimilarity || this.config.retrieval.minSimilarity,
      });

      logInfo(`Found ${results.length} results for query`);

      return results;
    } catch (error) {
      logError(`Search failed: ${error}`);
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Search and format results for Step 4 integration
   *
   * @param pbiTitle PBI title
   * @param pbiDescription PBI description
   * @returns Enriched context in Step 4 format
   */
  async searchForPBI(pbiTitle: string, pbiDescription: string): Promise<EnrichedContext> {
    const query: SearchQuery = {
      text: `${pbiTitle} ${pbiDescription}`,
      options: {
        topK: 5,
        includeMetadata: true,
      },
    };

    const results = await this.search(query);

    // Transform results to Step 4 format
    return this.transformToEnrichedContext(results);
  }

  /**
   * Transform search results to enriched context format
   *
   * @param results Search results
   * @returns Enriched context
   */
  private transformToEnrichedContext(results: SearchResult[]): EnrichedContext {
    const similarWork: EnrichedContext['similar_work'] = [];
    const pastDecisions: EnrichedContext['past_decisions'] = [];
    const technicalDocs: EnrichedContext['technical_docs'] = [];

    for (const result of results) {
      const sourceType = result.metadata.source_type;

      if (sourceType === 'pbi') {
        // Extract learnings from content
        const learnings = this.extractLearnings(result.content);

        similarWork.push({
          ref: result.id,
          title: result.metadata.title || 'Similar PBI',
          similarity: Math.round(result.score * 100),
          learnings,
          link: result.metadata.source_path || '#',
        });
      } else if (sourceType === 'markdown') {
        // Check if it's a decision document
        if (
          result.content.toLowerCase().includes('decision') ||
          result.metadata.category === 'decision'
        ) {
          pastDecisions.push({
            ref: result.id,
            title: result.metadata.title || 'Past Decision',
            decision: this.extractDecision(result.content),
            rationale: this.extractRationale(result.content),
            date: result.metadata.date,
          });
        } else {
          // Regular technical documentation
          const sections = this.extractSections(result.content);

          technicalDocs.push({
            ref: result.id,
            title: result.metadata.title || 'Documentation',
            relevant_sections: sections,
            link: result.metadata.source_path || '#',
          });
        }
      }
    }

    return {
      similar_work: similarWork,
      past_decisions: pastDecisions,
      technical_docs: technicalDocs,
      risk_flags: [], // Risks are analyzed in Step 5
      suggestions: [], // Suggestions generated separately
    };
  }

  /**
   * Extract learnings from PBI content
   */
  private extractLearnings(content: string): string[] {
    const learnings: string[] = [];

    // Look for sections that contain learnings
    const learningMarkers = ['learning:', 'lesson:', 'note:', 'important:'];

    const lines = content.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      for (const marker of learningMarkers) {
        if (lowerLine.includes(marker)) {
          const learning = line.substring(lowerLine.indexOf(marker) + marker.length).trim();
          if (learning.length > 0) {
            learnings.push(learning);
          }
        }
      }
    }

    // If no explicit learnings found, extract first few bullet points
    if (learnings.length === 0) {
      const bulletRegex = /^[-*]\s+(.+)$/gm;
      let match;
      let count = 0;
      while ((match = bulletRegex.exec(content)) !== null && count < 3) {
        learnings.push(match[1].trim());
        count++;
      }
    }

    return learnings.slice(0, 3); // Limit to 3 learnings
  }

  /**
   * Extract decision from content
   */
  private extractDecision(content: string): string {
    // Look for decision section
    const decisionMatch = content.match(/##?\s*Decision\s*\n([^\n#]+)/i);
    if (decisionMatch) {
      return decisionMatch[1].trim();
    }

    // Return first paragraph as fallback
    const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);
    return paragraphs[0]?.substring(0, 200) || 'Decision details in document';
  }

  /**
   * Extract rationale from content
   */
  private extractRationale(content: string): string {
    // Look for rationale section
    const rationaleMatch = content.match(/##?\s*Rationale\s*\n([^\n#]+)/i);
    if (rationaleMatch) {
      return rationaleMatch[1].trim();
    }

    return 'See document for details';
  }

  /**
   * Extract section headings from content
   */
  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const headingRegex = /^##?\s+(.+)$/gm;

    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      sections.push(match[1].trim());
    }

    return sections.slice(0, 5); // Limit to 5 sections
  }

  /**
   * Get service status
   *
   * @returns RAG service status
   */
  async getStatus(): Promise<RAGStatus> {
    if (!this.initialized || !this.vectorStore) {
      return {
        initialized: false,
        healthy: false,
        stats: {
          documentCount: 0,
          vectorCount: 0,
          storageSize: 0,
          collectionName: '',
        },
        indexedSources: 0,
        error: 'Service not initialized',
      };
    }

    try {
      const healthy = await this.vectorStore.healthCheck();
      const stats = await this.vectorStore.getStats();

      return {
        initialized: true,
        healthy,
        stats,
        indexedSources: this.config.sources.length,
        lastIndexed: stats.lastIndexed,
      };
    } catch (error) {
      return {
        initialized: true,
        healthy: false,
        stats: {
          documentCount: 0,
          vectorCount: 0,
          storageSize: 0,
          collectionName: '',
        },
        indexedSources: 0,
        error: String(error),
      };
    }
  }

  /**
   * Get appropriate loader for a data source
   */
  private getLoader(source: DataSource): IDocumentLoader | undefined {
    return this.loaders.get(source.type);
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RAG service not initialized. Call initialize() first.');
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.vectorStore) {
      await this.vectorStore.close();
    }

    if (this.embeddingService && 'dispose' in this.embeddingService) {
      await (this.embeddingService as any).dispose();
    }

    this.initialized = false;
    logInfo('RAG service disposed');
  }
}
