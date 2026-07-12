interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class InMemoryCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  set(key: string, value: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, item);
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired items before returning size
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Cleanup expired items periodically
  startCleanupInterval(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanExpired();
    }, intervalMs);
  }
}
