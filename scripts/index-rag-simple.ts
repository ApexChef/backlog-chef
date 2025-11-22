#!/usr/bin/env ts-node
/**
 * Simple RAG Indexing Script
 *
 * This script indexes your project documentation into the ChromaDB vector database.
 *
 * Usage: npx ts-node scripts/index-rag-simple.ts
 *
 * Prerequisites:
 *   - ChromaDB server running on localhost:8000
 *     Start it with: chroma run --path ./vector-db --host localhost --port 8000
 */

import { RAGService } from '../src/rag/orchestrator/rag-service';
import { RAGConfig } from '../src/rag/interfaces';
import chalk from 'chalk';

async function main() {
  console.log(chalk.bold.blue('\n📚 RAG Indexing Script\n'));
  console.log('='.repeat(80) + '\n');

  // Configuration (from config/rag-config.yaml)
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
  console.log(chalk.dim('   (This may take a moment - downloading embeddings model if needed)\n'));

  let ragService: RAGService;
  try {
    ragService = await RAGService.create(config);
    console.log(chalk.green('✓ RAG service initialized\n'));
  } catch (error: any) {
    console.log(chalk.red(`❌ Failed to initialize RAG: ${error.message}\n`));
    console.log(chalk.yellow('Make sure ChromaDB server is running:'));
    console.log(chalk.dim('   chroma run --path ./vector-db --host localhost --port 8000\n'));
    process.exit(1);
  }

  // Step 2: Check status before
  console.log(chalk.yellow('Step 2: Checking current index status...'));
  const statusBefore = await ragService.getStatus();
  console.log(chalk.dim(`   Documents: ${statusBefore.stats?.documentCount || 0}`));
  console.log(chalk.dim(`   Collection: ${statusBefore.stats?.collectionName || 'N/A'}\n`));

  // Step 3: Index sources
  console.log(chalk.yellow('Step 3: Indexing documents...'));
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

    if (result.stats.errors.length > 0) {
      console.log(chalk.yellow('⚠️  Errors:'));
      result.stats.errors.forEach((err: any) => {
        console.log(chalk.red(`   • ${err.source}: ${err.error}`));
      });
      console.log('');
    }
  } catch (error: any) {
    console.log(chalk.red(`❌ Indexing failed: ${error.message}\n`));
    process.exit(1);
  }

  // Step 4: Check status after
  console.log(chalk.yellow('Step 4: Final index status...'));
  const statusAfter = await ragService.getStatus();
  console.log(chalk.dim(`   Total documents: ${statusAfter.stats?.documentCount || 0}`));
  console.log(chalk.dim(`   Total vectors: ${statusAfter.stats?.vectorCount || 0}\n`));

  // Step 5: Test search
  console.log(chalk.yellow('Step 5: Testing semantic search...'));
  const testQuery = 'authentication and user login';
  console.log(chalk.dim(`   Query: "${testQuery}"\n`));

  try {
    const results = await ragService.search({
      text: testQuery,
      options: { topK: 3, minSimilarity: 0.01 }
    });

    if (results.length === 0) {
      console.log(chalk.yellow('   No results found\n'));
    } else {
      console.log(chalk.green(`   Found ${results.length} results:\n`));
      results.forEach((result, idx) => {
        console.log(chalk.bold(`   ${idx + 1}. ${result.metadata.source || 'Unknown'}`));
        console.log(chalk.dim(`      Score: ${(result.score * 100).toFixed(1)}%`));
        const snippet = result.content.substring(0, 80).replace(/\n/g, ' ');
        console.log(chalk.dim(`      "${snippet}..."\n`));
      });
    }
  } catch (error: any) {
    console.log(chalk.yellow(`   Search failed: ${error.message}\n`));
  }

  //  Summary
  console.log(chalk.bold.green('✅ Indexing Complete!\n'));
  console.log(chalk.blue('Next steps:'));
  console.log(chalk.dim('   • Run pipeline: node dist/index.js examples/sample-transcript.txt'));
  console.log(chalk.dim('   • Check Step 4 output for similar_work results'));
  console.log(chalk.dim('   • Re-run this script after creating new PBIs\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Script failed:'), error.message);
  process.exit(1);
});
