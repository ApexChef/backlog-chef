#!/usr/bin/env node

/**
 * Backlog Chef CLI
 *
 * Simple CLI interface for backlog-chef commands
 * Will be migrated to OCLIF in the future (PBI-001)
 */

import { FormatCommand } from './commands/format';
import { ProcessCommand } from './commands/process';
import { RagQueryCommand } from './commands/rag/query';
import { RagIndexCommand } from './commands/rag/index';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'process':
        await handleProcessCommand(args.slice(1));
        break;

      case 'format':
        await handleFormatCommand(args.slice(1));
        break;

      case 'rag':
        await handleRagCommand(args.slice(1));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "backlog-chef --help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

async function handleProcessCommand(args: string[]): Promise<void> {
  const processCmd = new ProcessCommand();

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    ProcessCommand.showHelp();
    return;
  }

  // Parse arguments
  const fireflies = args.includes('--fireflies') ? args[args.indexOf('--fireflies') + 1] : undefined;

  // If using --fireflies, file path is optional (will use fetched transcript)
  // Otherwise, file path is required
  let filePath: string;
  if (fireflies) {
    filePath = ''; // Will be set by fetchFromFireflies
  } else {
    filePath = args[0];
    if (!filePath) {
      throw new Error('Missing file path argument. Usage: backlog-chef process <file> [options]');
    }
  }

  const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined;
  const formats = args.includes('--formats') ? args[args.indexOf('--formats') + 1] : undefined;
  const config = args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined;
  const verbose = args.includes('--verbose');

  await processCmd.execute(filePath, {
    output,
    formats,
    config,
    verbose,
    fireflies,
  });
}

async function handleFormatCommand(args: string[]): Promise<void> {
  const formatCmd = new FormatCommand();

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    FormatCommand.showHelp();
    return;
  }

  // Parse arguments
  const filePattern = args[0];
  if (!filePattern) {
    throw new Error('Missing file pattern argument. Usage: backlog-chef format <file-or-pattern> --to <format>');
  }

  const toIndex = args.indexOf('--to');
  if (toIndex === -1 || !args[toIndex + 1]) {
    throw new Error('Missing --to flag. Usage: backlog-chef format <file-or-pattern> --to <format>');
  }

  const to = args[toIndex + 1];
  const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined;
  const force = args.includes('--force');
  const verbose = args.includes('--verbose');

  await formatCmd.execute(filePattern, {
    to,
    output,
    force,
    verbose,
  });
}

async function handleRagCommand(args: string[]): Promise<void> {
  // Check for help flag
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showRagHelp();
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case 'query': {
      const query = args[1];
      if (!query) {
        throw new Error('Missing query argument. Usage: backlog-chef rag query "search term"');
      }

      const top = args.includes('--top') ? parseInt(args[args.indexOf('--top') + 1], 10) : undefined;
      const minScore = args.includes('--min-score') ? parseFloat(args[args.indexOf('--min-score') + 1]) : undefined;
      const json = args.includes('--json');
      const verbose = args.includes('--verbose');

      const queryCmd = new RagQueryCommand();
      await queryCmd.execute(query, { top, minScore, json, verbose });
      break;
    }

    case 'index': {
      const clear = args.includes('--clear');
      const verbose = args.includes('--verbose');

      const indexCmd = new RagIndexCommand();
      await indexCmd.execute({ clear, verbose });
      break;
    }

    default:
      throw new Error(`Unknown rag subcommand: ${subcommand}. Use: query or index`);
  }
}

function showRagHelp(): void {
  console.log(`
backlog-chef rag - RAG vector database commands

USAGE
  $ backlog-chef rag <subcommand> [options]

SUBCOMMANDS
  index        Index project documentation into vector database
  query        Search the vector database for similar documents

OPTIONS
  --help, -h   Show help information

QUERY OPTIONS
  --top N          Number of results to return (default: 5)
  --min-score N    Minimum similarity score 0-1 (default: 0.01)
  --json           Output results as JSON
  --verbose        Show detailed output

INDEX OPTIONS
  --clear      Clear index before indexing
  --verbose    Show detailed output

EXAMPLES
  # Index your documentation
  $ backlog-chef rag index

  # Search for authentication docs
  $ backlog-chef rag query "authentication patterns"

  # Get top 10 results with min score
  $ backlog-chef rag query "OAuth" --top 10 --min-score 0.5

  # Output as JSON for scripting
  $ backlog-chef rag query "database" --json

REQUIREMENTS
  ChromaDB server must be running:
  $ chroma run --path ./vector-db --host localhost --port 8000
`);
}

function showHelp(): void {
  console.log(`
backlog-chef - AI-powered backlog intelligence tool

USAGE
  $ backlog-chef <command> [options]

COMMANDS
  process      Process meeting transcripts into Product Backlog Items
  format       Convert PBI JSON to different output formats
  rag          RAG vector database commands (index, query)

OPTIONS
  --help, -h   Show help information

EXAMPLES
  # Process a meeting transcript
  $ backlog-chef process examples/sample-transcript.txt

  # Process with custom output directory
  $ backlog-chef process transcript.txt --output ./my-pbis

  # Convert PBI JSON to Obsidian format
  $ backlog-chef format output/pbi-001.json --to obsidian

  # Convert all PBIs to Confluence format
  $ backlog-chef format "output/**/*.json" --to confluence

  # Index documentation into vector database
  $ backlog-chef rag index

  # Query the vector database
  $ backlog-chef rag query "authentication patterns"

  # Show help for specific command
  $ backlog-chef process --help
  $ backlog-chef format --help
  $ backlog-chef rag --help

For more information, visit: https://github.com/ApexChef/backlog-chef
`);
}

// Run CLI
main();
