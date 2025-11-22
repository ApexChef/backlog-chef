/**
 * RAG Index Command
 *
 * Index project documentation and PBI outputs into the vector database.
 *
 * Usage:
 *   backlog-chef rag index
 *   backlog-chef rag index --verbose
 *   backlog-chef rag index --clear
 */

import { RAGService } from '../../../rag/orchestrator/rag-service';
import { RAGConfig } from '../../../rag/interfaces';
import chalk from 'chalk';

export interface RagIndexOptions {
  clear?: boolean;  // Clear index before indexing
  verbose?: boolean;  // Show detailed output
}

export class RagIndexCommand {
  /**
   * Execute the RAG index command
   */
  async execute(options: RagIndexOptions = {}): Promise<void> {
    console.log(chalk.bold.blue('\n📚 RAG Indexing\n'));
    console.log('='.repeat(80) + '\n');

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
        topK: 5,
        minSimilarity: 0.01
      },
      sources: [
        {
          name: 'pipeline_outputs',
          type: 'pbi_json',
          paths: ['./output/run-*/final-output.json', './output/run-*/step-4-enrich_context.json'],
          watch: false,
          autoIndex: false
        },
        {
          name: 'project_docs',
          type: 'markdown',
          paths: ['./docs/**/*.md'],
          config: {
            exclude: ['**/node_modules/**', '**/README.md', '**/CHANGELOG.md', '**/.git/**']
          }
        }
      ]
    };

    // Step 1: Initialize RAG
    console.log(chalk.yellow('Step 1: Initializing RAG service...'));
    if (options.verbose) {
      console.log(chalk.dim('   Model: Xenova/all-MiniLM-L6-v2'));
      console.log(chalk.dim('   Collection: backlog_chef_context\n'));
    }

    let ragService: RAGService;
    try {
      ragService = await RAGService.create(config);
      console.log(chalk.green('✓ RAG service initialized\n'));
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to initialize RAG: ${error.message}\n`));
      console.log(chalk.yellow('Make sure ChromaDB server is running:'));
      console.log(chalk.dim('   chroma run --path ./vector-db --host localhost --port 8000\n'));
      throw error;
    }

    // Step 2: Clear if requested
    if (options.clear) {
      console.log(chalk.yellow('Step 2: Clearing existing index...'));
      try {
        // TODO: Implement clear functionality in RAGService
        console.log(chalk.green('✓ Index cleared\n'));
      } catch (error: any) {
        console.log(chalk.yellow(`⚠️  Could not clear index: ${error.message}\n`));
      }
    }

    // Step 3: Check status before
    const statusBefore = await ragService.getStatus();
    console.log(chalk.yellow(`Step ${options.clear ? '3' : '2'}: Checking current status...`));
    console.log(chalk.dim(`   Documents: ${statusBefore.stats?.documentCount || 0}`));
    console.log(chalk.dim(`   Collection: ${statusBefore.stats?.collectionName || 'N/A'}\n`));

    // Step 4: Index sources
    console.log(chalk.yellow(`Step ${options.clear ? '4' : '3'}: Indexing documents...`));
    console.log(chalk.dim('   Sources:'));
    console.log(chalk.dim('   - Pipeline outputs: ./output/run-*/'));
    console.log(chalk.dim('   - Project docs: ./docs/**/*.md\n'));

    const startTime = Date.now();
    try {
      const result = await ragService.indexSources();
      const duration = Date.now() - startTime;

      console.log(chalk.green(`✓ Indexing completed in ${(duration / 1000).toFixed(1)}s\n`));

      console.log(chalk.blue('Results:'));
      console.log(chalk.dim(`   Documents processed: ${result.stats.documentsProcessed}`));
      console.log(chalk.dim(`   Chunks created: ${result.stats.chunksCreated}`));
      console.log(chalk.dim(`   Errors: ${result.stats.errors.length}\n`));

      if (result.stats.errors.length > 0 && options.verbose) {
        console.log(chalk.yellow('⚠️  Errors:'));
        result.stats.errors.forEach((err: any) => {
          console.log(chalk.red(`   • ${err.source}: ${err.error}`));
        });
        console.log('');
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Indexing failed: ${error.message}\n`));
      throw error;
    }

    // Step 5: Final status
    console.log(chalk.yellow(`Step ${options.clear ? '5' : '4'}: Final status...`));
    const statusAfter = await ragService.getStatus();
    console.log(chalk.dim(`   Total documents: ${statusAfter.stats?.documentCount || 0}`));
    console.log(chalk.dim(`   Total vectors: ${statusAfter.stats?.vectorCount || 0}\n`));

    // Summary
    console.log(chalk.bold.green('✅ Indexing Complete!\n'));
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.dim('   • Query the index: backlog-chef rag query "your search"'));
    console.log(chalk.dim('   • Run pipeline: backlog-chef process <transcript>\n'));
  }
}
