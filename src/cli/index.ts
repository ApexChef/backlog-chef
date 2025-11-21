#!/usr/bin/env node

/**
 * Backlog Chef CLI
 *
 * Simple CLI interface for backlog-chef commands
 * Will be migrated to OCLIF in the future (PBI-001)
 */

import { FormatCommand } from './commands/format';
import { ProcessCommand } from './commands/process';

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
  const filePath = args[0];
  if (!filePath) {
    throw new Error('Missing file path argument. Usage: backlog-chef process <file> [options]');
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

function showHelp(): void {
  console.log(`
backlog-chef - AI-powered backlog intelligence tool

USAGE
  $ backlog-chef <command> [options]

COMMANDS
  process      Process meeting transcripts into Product Backlog Items
  format       Convert PBI JSON to different output formats

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

  # Show help for specific command
  $ backlog-chef process --help
  $ backlog-chef format --help

For more information, visit: https://github.com/ApexChef/backlog-chef
`);
}

// Run CLI
main();
