export class LRUCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number | null }> = new Map();
  private maxSize: number;
  private ttl: number | null;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, ttl?: number) {
    this.maxSize = maxSize;
    this.ttl = ttl ?? null;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V): void {
    this.cache.delete(key);

    const expiresAt = this.ttl !== null ? Date.now() + this.ttl : null;

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, expiresAt });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  invalidateByPrefix(prefix: string): void {
    const keysToDelete: K[] = [];
    for (const key of this.cache.keys()) {
      if (String(key).startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}
