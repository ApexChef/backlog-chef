/**
 * Simple in-memory cache for Fireflies transcripts
 *
 * Reduces API calls by caching meeting data
 */

import { FirefliesTranscript, CachedTranscript } from './types';

export class TranscriptCache {
  private cache: Map<string, CachedTranscript> = new Map();
  private defaultTTL: number = 3600; // 1 hour in seconds

  constructor(ttlSeconds: number = 3600) {
    this.defaultTTL = ttlSeconds;
  }

  /**
   * Get transcript from cache
   * Returns undefined if not found or expired
   */
  get(meetingId: string): FirefliesTranscript | undefined {
    const cached = this.cache.get(meetingId);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(meetingId);
      return undefined;
    }

    return cached.transcript;
  }

  /**
   * Store transcript in cache
   */
  set(meetingId: string, transcript: FirefliesTranscript, ttl?: number): void {
    const now = Date.now();
    const ttlMs = (ttl || this.defaultTTL) * 1000;

    this.cache.set(meetingId, {
      meetingId,
      transcript,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Check if a meeting is cached and not expired
   */
  has(meetingId: string): boolean {
    return this.get(meetingId) !== undefined;
  }

  /**
   * Remove a meeting from cache
   */
  delete(meetingId: string): boolean {
    return this.cache.delete(meetingId);
  }

  /**
   * Clear all cached transcripts
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    // Clean up expired entries first
    this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [meetingId, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(meetingId);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ meetingId: string; cachedAt: number; expiresAt: number }>;
  } {
    this.cleanExpired();

    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map((c) => ({
        meetingId: c.meetingId,
        cachedAt: c.cachedAt,
        expiresAt: c.expiresAt,
      })),
    };
  }
}

// Default cache instance with 1 hour TTL
export const transcriptCache = new TranscriptCache(3600);
