/**
 * RAG Query Command
 *
 * Search the RAG vector database for similar documents.
 *
 * Usage:
 *   backlog-chef rag query "search term"
 *   backlog-chef rag query "authentication" --top 10
 *   backlog-chef rag query "OAuth patterns" --min-score 0.5 --json
 */

import { RAGService } from '../../../rag/orchestrator/rag-service';
import { RAGConfig } from '../../../rag/interfaces';
import chalk from 'chalk';

export interface RagQueryOptions {
  top?: number;  // Number of results (default: 5)
  minScore?: number;  // Minimum similarity score 0-1 (default: 0.01)
  json?: boolean;  // Output as JSON
  verbose?: boolean;  // Detailed output
}

export class RagQueryCommand {
  /**
   * Execute the RAG query command
   */
  async execute(query: string, options: RagQueryOptions = {}): Promise<void> {
    const topK = options.top || 5;
    const minScore = options.minScore || 0.01;
    const jsonOutput = options.json || false;

    if (!jsonOutput) {
      console.log(chalk.bold.blue('\n🔍 RAG Query\n'));
      console.log('='.repeat(80) + '\n');
      console.log(chalk.yellow('Query:'), chalk.bold(query));
      console.log(chalk.dim(`Results: ${topK}, Min Score: ${minScore}\n`));
    }

    // Configuration
    const config: RAGConfig = {
      enabled: true,
      provider: 'chroma',
      embedding: {
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384,
        batchSize: 32,
        device: 'cpu'
      },
      storage: {
        local: {
          type: 'chroma',
          path: './vector-db',
          persist: true,
          collection: 'backlog_chef_context'
        }
      },
      chunking: {
        strategy: 'semantic',
        minSize: 100,
        maxSize: 500,
        overlap: 50
      },
      retrieval: {
        topK,
        minSimilarity: minScore
      },
      sources: []
    };

    // Initialize RAG
    let ragService: RAGService;
    try {
      ragService = await RAGService.create(config);
    } catch (error: any) {
      if (jsonOutput) {
        console.log(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.log(chalk.red(`❌ Failed to initialize RAG: ${error.message}\n`));
        console.log(chalk.yellow('Make sure ChromaDB server is running:'));
        console.log(chalk.dim('   chroma run --path ./vector-db --host localhost --port 8000\n'));
      }
      throw error;
    }

    // Check if index has documents
    const status = await ragService.getStatus();
    const docCount = status.stats?.documentCount || 0;

    if (docCount === 0) {
      if (jsonOutput) {
        console.log(JSON.stringify({ error: 'No documents indexed', results: [] }, null, 2));
      } else {
        console.log(chalk.yellow('⚠️  No documents in index\n'));
        console.log(chalk.dim('Run indexing first:'));
        console.log(chalk.dim('   backlog-chef rag index\n'));
      }
      return;
    }

    // Search
    const startTime = Date.now();
    let results;
    try {
      results = await ragService.search({
        text: query,
        options: { topK, minSimilarity: minScore }
      });
    } catch (error: any) {
      if (jsonOutput) {
        console.log(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.log(chalk.red(`❌ Search failed: ${error.message}\n`));
      }
      throw error;
    }
    const duration = Date.now() - startTime;

    // Output results
    if (jsonOutput) {
      console.log(JSON.stringify({
        query,
        documentsInIndex: docCount,
        searchDuration: duration,
        resultsFound: results.length,
        results: results.map(r => ({
          source: r.metadata.source_path || r.metadata.source || 'Unknown',
          type: r.metadata.source_type || r.metadata.type || 'Unknown',
          score: r.score,
          content: r.content.substring(0, 200),
          metadata: r.metadata
        }))
      }, null, 2));
    } else {
      if (results.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No results found (searched ${docCount} documents in ${duration}ms)\n`));
        console.log(chalk.dim('Try:'));
        console.log(chalk.dim('  • Lower --min-score threshold'));
        console.log(chalk.dim('  • Use different search terms\n'));
      } else {
        console.log(chalk.green(`\n✓ Found ${results.length} results (searched ${docCount} docs in ${duration}ms)\n`));

        results.forEach((result, idx) => {
          console.log(chalk.bold(`${idx + 1}. ${result.metadata.source_path || result.metadata.source || 'Unknown'}`));
          console.log(chalk.dim(`   Score: ${(result.score * 100).toFixed(1)}% | Type: ${result.metadata.source_type || result.metadata.type || 'unknown'}`));

          // Show snippet
          const lines = result.content.split('\n');
          const snippet = lines[0].substring(0, 120);
          console.log(chalk.dim(`   "${snippet}${snippet.length < result.content.length ? '...' : ''}"`));

          // Show metadata
          if (result.metadata.title) {
            console.log(chalk.dim(`   📄 ${result.metadata.title}`));
          }

          console.log('');
        });

        if (!jsonOutput) {
          console.log(chalk.blue('💡 Tip: Use --json for machine-readable output\n'));
        }
      }
    }
  }
}
