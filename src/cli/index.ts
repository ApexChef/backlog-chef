#!/usr/bin/env node

/**
 * Backlog Chef CLI
 *
 * Simple CLI interface for backlog-chef commands
 * Will be migrated to OCLIF in the future (PBI-001)
 */

import { FormatCommand } from './commands/format';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
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
  format       Convert PBI JSON to different output formats

OPTIONS
  --help, -h   Show help information

EXAMPLES
  # Convert PBI JSON to Obsidian format
  $ backlog-chef format output/pbi-001.json --to obsidian

  # Convert all PBIs to Confluence format
  $ backlog-chef format "output/**/*.json" --to confluence

  # Show help for specific command
  $ backlog-chef format --help

For more information, visit: https://github.com/ApexChef/backlog-chef
`);
}

// Run CLI
main();
