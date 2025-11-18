/**
 * File service for reading and writing JSON files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtractedPBIsFile, ScoredPBIsOutput } from '../models/types';

export class FileService {
  /**
   * Read extracted PBIs from JSON file
   */
  async readExtractedPBIs(filePath: string): Promise<ExtractedPBIsFile> {
    try {
      const absolutePath = path.resolve(filePath);
      console.log(`Reading extracted PBIs from: ${absolutePath}`);

      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const data = JSON.parse(fileContent) as ExtractedPBIsFile;

      if (!data.candidates || !Array.isArray(data.candidates)) {
        throw new Error('Invalid file format: missing candidates array');
      }

      console.log(`Successfully loaded ${data.candidates.length} PBI candidates`);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read extracted PBIs: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write scored PBIs to JSON file
   */
  async writeScoredPBIs(filePath: string, data: ScoredPBIsOutput): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const directory = path.dirname(absolutePath);

      // Ensure output directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write formatted JSON
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.writeFile(absolutePath, jsonContent, 'utf-8');

      console.log(`Successfully wrote scored PBIs to: ${absolutePath}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write scored PBIs: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}