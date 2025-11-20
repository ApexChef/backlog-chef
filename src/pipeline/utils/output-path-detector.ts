/**
 * Output Path Detector
 *
 * Smart detection of output paths based on input file patterns
 */

import path from 'path';

export interface OutputPathConfig {
  outputDir: string;
  isProjectPBI: boolean;
  itemNumber?: string;
}

/**
 * Detect appropriate output path based on input file path
 *
 * Rules:
 * 1. If input matches `project-backlog-items/input/XXX-*.*`:
 *    Output to: `project-backlog-items/output/XXX-{name}/`
 *
 * 2. Otherwise:
 *    Output to: `output/run-{timestamp}/` (default)
 *
 * @param inputPath - Absolute path to the input file
 * @param defaultOutputDir - Default output directory (from .env or 'output')
 * @returns OutputPathConfig with detected output directory
 */
export function detectOutputPath(
  inputPath: string,
  defaultOutputDir: string = 'output'
): OutputPathConfig {
  // Normalize the path to use forward slashes
  const normalizedPath = inputPath.replace(/\\/g, '/');

  // Check if this is a project backlog item
  const projectPBIPattern = /project-backlog-items\/input\/(\d{3})-([^/]+)\.(txt|json|xml)$/i;
  const match = normalizedPath.match(projectPBIPattern);

  if (match) {
    // Extract item number and name
    const itemNumber = match[1]; // e.g., "001"
    const itemName = match[2]; // e.g., "oclif-cli"

    // Create output path: project-backlog-items/output/XXX-name/
    const outputDir = path.join('project-backlog-items', 'output', `${itemNumber}-${itemName}`);

    return {
      outputDir,
      isProjectPBI: true,
      itemNumber,
    };
  }

  // Default: use timestamp-based directory
  return {
    outputDir: defaultOutputDir,
    isProjectPBI: false,
  };
}

/**
 * Generate run directory name for non-project PBIs
 *
 * @param baseDir - Base output directory
 * @returns Path with run-{timestamp} subdirectory
 */
export function generateRunDirectory(baseDir: string): string {
  const timestamp = Date.now();
  return path.join(baseDir, `run-${timestamp}`);
}
