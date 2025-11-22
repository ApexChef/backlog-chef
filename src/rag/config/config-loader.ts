/**
 * File: src/rag/config/config-loader.ts
 * Purpose: Load and validate RAG configuration from YAML
 * Relationships: Provides configuration to RAGService
 * Key Dependencies: js-yaml for YAML parsing
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import { RAGConfig } from '../interfaces';
import { logInfo, logWarn, logError } from '../../utils/logger';

/**
 * Default RAG configuration
 * Used as fallback if config file not found or invalid
 */
const DEFAULT_CONFIG: RAGConfig = {
  enabled: false, // Disabled by default for safety
  provider: 'chroma',
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    batchSize: 32,
    device: 'cpu',
  },
  storage: {
    local: {
      type: 'chroma',
      path: './vector-db',
      persist: true,
      collection: 'backlog_chef_context',
    },
  },
  chunking: {
    strategy: 'semantic',
    minSize: 100,
    maxSize: 500,
    overlap: 50,
    splitOn: ['\n\n', '\n', '. ', ', '],
    preserveWhitespace: false,
  },
  retrieval: {
    topK: 5,
    minSimilarity: 0.7,
  },
  sources: [],
};

/**
 * Load RAG configuration from YAML file
 *
 * @param configPath Path to config file (defaults to config/rag-config.yaml)
 * @returns RAG configuration object
 */
export function loadRAGConfig(configPath?: string): RAGConfig {
  const defaultPath = resolve(process.cwd(), 'config/rag-config.yaml');
  const path = configPath || defaultPath;

  try {
    logInfo(`Loading RAG config from: ${path}`);

    const fileContent = readFileSync(path, 'utf-8');
    const parsed = yaml.load(fileContent) as any;

    if (!parsed || !parsed.rag) {
      logWarn('Invalid RAG config structure, using defaults');
      return DEFAULT_CONFIG;
    }

    const ragConfig = parsed.rag;

    // Merge with defaults
    const config: RAGConfig = {
      enabled: ragConfig.enabled !== undefined ? ragConfig.enabled : DEFAULT_CONFIG.enabled,
      provider: ragConfig.provider || DEFAULT_CONFIG.provider,
      embedding: {
        ...DEFAULT_CONFIG.embedding,
        ...ragConfig.embedding,
      },
      storage: {
        local: ragConfig.storage?.local
          ? {
              ...DEFAULT_CONFIG.storage.local!,
              ...ragConfig.storage.local,
            }
          : DEFAULT_CONFIG.storage.local,
        cloud: ragConfig.storage?.cloud,
      },
      chunking: {
        ...DEFAULT_CONFIG.chunking,
        ...ragConfig.chunking,
      },
      retrieval: {
        ...DEFAULT_CONFIG.retrieval,
        ...ragConfig.retrieval,
      },
      sources: ragConfig.sources || DEFAULT_CONFIG.sources,
      monitoring: ragConfig.monitoring,
    };

    // Validate configuration
    validateRAGConfig(config);

    logInfo('RAG config loaded successfully');
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logWarn(`RAG config file not found at ${path}, using defaults`);
      return DEFAULT_CONFIG;
    }

    logError(`Failed to load RAG config: ${error}`);
    logWarn('Using default RAG configuration');
    return DEFAULT_CONFIG;
  }
}

/**
 * Validate RAG configuration
 * Throws error if configuration is invalid
 *
 * @param config RAG configuration to validate
 */
function validateRAGConfig(config: RAGConfig): void {
  // Validate provider
  const validProviders = ['chroma', 'pinecone', 'faiss', 'weaviate'];
  if (!validProviders.includes(config.provider)) {
    throw new Error(`Invalid provider: ${config.provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate embedding dimensions
  if (config.embedding.dimensions <= 0) {
    throw new Error('Embedding dimensions must be positive');
  }

  // Validate chunking config
  if (config.chunking.minSize >= config.chunking.maxSize) {
    throw new Error('Chunking minSize must be less than maxSize');
  }

  if (config.chunking.overlap >= config.chunking.maxSize) {
    throw new Error('Chunking overlap must be less than maxSize');
  }

  // Validate retrieval config
  if (config.retrieval.topK <= 0) {
    throw new Error('Retrieval topK must be positive');
  }

  if (config.retrieval.minSimilarity < 0 || config.retrieval.minSimilarity > 1) {
    throw new Error('Retrieval minSimilarity must be between 0 and 1');
  }

  // Validate storage config
  if (config.provider === 'chroma' && !config.storage.local) {
    throw new Error('Local storage configuration required for ChromaDB');
  }

  // Validate sources
  if (config.enabled && config.sources.length === 0) {
    logWarn('RAG is enabled but no sources configured');
  }

  for (const source of config.sources) {
    if (!source.name) {
      throw new Error('Source name is required');
    }
    if (!source.type) {
      throw new Error(`Source type is required for source: ${source.name}`);
    }
  }
}

/**
 * Create a default RAG configuration
 * Useful for testing or when config file is not available
 *
 * @returns Default RAG configuration
 */
export function createDefaultRAGConfig(): RAGConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Check if RAG is enabled in configuration
 *
 * @param config RAG configuration
 * @returns true if RAG is enabled, false otherwise
 */
export function isRAGEnabled(config: RAGConfig): boolean {
  return config.enabled === true;
}
