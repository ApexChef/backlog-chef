#!/usr/bin/env node

/**
 * Backlog Chef CLI Entry Point
 *
 * This is the executable entry point for the global CLI installation.
 * It bootstraps the OCLIF framework and runs the appropriate command.
 */

async function main() {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: false, dir: __dirname });
}

main();
