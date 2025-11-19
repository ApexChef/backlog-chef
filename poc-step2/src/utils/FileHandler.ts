import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './Logger';

export class FileHandler {
  /**
   * Read a text file from the filesystem
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      logger.debug(`Reading file: ${absolutePath}`);

      // Check if file exists
      await fs.access(absolutePath);

      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8');

      logger.debug(`File read successfully: ${content.length} characters`);
      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Write JSON data to a file
   */
  static async writeJson(filePath: string, data: any): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      logger.debug(`Writing JSON to: ${absolutePath}`);

      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // Write formatted JSON
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(absolutePath, json, 'utf-8');

      logger.debug(`JSON written successfully: ${json.length} characters`);
    } catch (error) {
      throw new Error(`Failed to write JSON to ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<{size: number; isFile: boolean}> {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);
      return {
        size: stats.size,
        isFile: stats.isFile()
      };
    } catch (error) {
      throw new Error(`Failed to get stats for ${filePath}: ${(error as Error).message}`);
    }
  }
}