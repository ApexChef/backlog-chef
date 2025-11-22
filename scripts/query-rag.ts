#!/usr/bin/env ts-node
/**
 * RAG Query CLI
 *
 * Search the RAG vector database from the command line.
 *
 * Usage:
 *   npx ts-node scripts/query-rag.ts "your search query"
 *   npx ts-node scripts/query-rag.ts "authentication" --top 5
 *   npx ts-node scripts/query-rag.ts "OAuth login" --min-score 0.5
 *
 * Examples:
 *   npx ts-node scripts/query-rag.ts "how does authentication work"
 *   npx ts-node scripts/query-rag.ts "database migration patterns"
 *   npx ts-node scripts/query-rag.ts "React components" --top 10
 */

import { RAGService } from '../src/rag/orchestrator/rag-service';
import { RAGConfig } from '../src/rag/interfaces';
import chalk from 'chalk';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(chalk.bold.blue('\n🔍 RAG Query CLI\n'));
    console.log('Usage:');
    console.log(chalk.dim('  npx ts-node scripts/query-rag.ts "your query" [options]\n'));
    console.log('Options:');
    console.log(chalk.dim('  --top N          Number of results to return (default: 5)'));
    console.log(chalk.dim('  --min-score N    Minimum similarity score 0-1 (default: 0.01)'));
    console.log(chalk.dim('  --json           Output results as JSON\n'));
    console.log('Examples:');
    console.log(chalk.dim('  npx ts-node scripts/query-rag.ts "authentication patterns"'));
    console.log(chalk.dim('  npx ts-node scripts/query-rag.ts "OAuth login" --top 10'));
    console.log(chalk.dim('  npx ts-node scripts/query-rag.ts "database" --min-score 0.5 --json\n'));
    process.exit(0);
  }

  const query = args[0];
  let topK = 5;
  let minScore = 0.01;
  let jsonOutput = false;

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--top' && i + 1 < args.length) {
      topK = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-score' && i + 1 < args.length) {
      minScore = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  if (!jsonOutput) {
    console.log(chalk.bold.blue('\n🔍 RAG Query\n'));
    console.log('='.repeat(80) + '\n');
    console.log(chalk.yellow('Query:'), chalk.bold(query));
    console.log(chalk.dim(`Top K: ${topK}, Min Score: ${minScore}\n`));
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
    process.exit(1);
  }

  // Check if index has documents
  const status = await ragService.getStatus();
  const docCount = status.stats?.documentCount || 0;

  if (docCount === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: 'No documents indexed', results: [] }, null, 2));
    } else {
      console.log(chalk.yellow('⚠️  No documents in index\n'));
      console.log(chalk.dim('Run indexing script first:'));
      console.log(chalk.dim('   npx ts-node scripts/index-rag-simple.ts\n'));
    }
    process.exit(1);
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
    process.exit(1);
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
        content: r.content.substring(0, 200)
      }))
    }, null, 2));
  } else {
    if (results.length === 0) {
      console.log(chalk.yellow(`\n⚠️  No results found (searched ${docCount} documents in ${duration}ms)\n`));
      console.log(chalk.dim('Try:'));
      console.log(chalk.dim('  • Lower the --min-score threshold'));
      console.log(chalk.dim('  • Use different search terms'));
      console.log(chalk.dim('  • Check if relevant docs are indexed\n'));
    } else {
      console.log(chalk.green(`\n✓ Found ${results.length} results (searched ${docCount} docs in ${duration}ms)\n`));

      results.forEach((result, idx) => {
        console.log(chalk.bold(`${idx + 1}. ${result.metadata.source_path || result.metadata.source || 'Unknown'}`));
        console.log(chalk.dim(`   Score: ${(result.score * 100).toFixed(1)}% | Type: ${result.metadata.source_type || result.metadata.type || 'unknown'}`));

        // Show snippet
        const lines = result.content.split('\n');
        const snippet = lines[0].substring(0, 150);
        console.log(chalk.dim(`   "${snippet}${snippet.length < result.content.length ? '...' : ''}"`));

        // Show metadata
        if (result.metadata.title) {
          console.log(chalk.dim(`   Title: ${result.metadata.title}`));
        }
        if (result.metadata.tags) {
          const tags = Array.isArray(result.metadata.tags)
            ? result.metadata.tags
            : JSON.parse(result.metadata.tags);
          console.log(chalk.dim(`   Tags: ${tags.join(', ')}`));
        }

        console.log('');
      });

      console.log(chalk.blue('💡 Tip: Use --json flag for machine-readable output\n'));
    }
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Query failed:'), error.message);
  process.exit(1);
});
