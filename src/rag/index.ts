/**
 * File: src/rag/index.ts
 * Purpose: Public API exports for the RAG system
 * Relationships: Main entry point for RAG functionality
 * Key Dependencies: All RAG components
 */

// Core interfaces
export * from './interfaces';

// Main service
export { RAGService } from './orchestrator/rag-service';

// Configuration
export { loadRAGConfig, createDefaultRAGConfig, isRAGEnabled } from './config/config-loader';

// Components (for advanced usage)
export { ChromaStore, createChromaStore } from './stores/chroma-store';
export { TransformersEmbedding, createDefaultEmbeddingService } from './embeddings/transformers-embedding';
export { SemanticChunker, createSemanticChunker } from './processing/document-chunker';
export { PBIJSONLoader } from './loaders/pbi-json-loader';
export { MarkdownLoader } from './loaders/markdown-loader';
