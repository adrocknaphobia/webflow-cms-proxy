import type { WebflowItem, WebflowItemsResult } from "./webflow";

const MAX_ENTRIES = 20;

interface Entry {
  collectionId: string;
  offset: number;
  limit: number;
  items: WebflowItem[];
  total: number;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

function keyFor(collectionId: string, offset: number, limit: number): string {
  return `${collectionId}:${offset}:${limit}`;
}

function contains(entry: Entry, offset: number, limit: number): boolean {
  return (
    entry.offset <= offset && offset + limit <= entry.offset + entry.limit
  );
}

export function getCachedItems(
  collectionId: string,
  offset: number,
  limit: number
): WebflowItemsResult | null {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.collectionId !== collectionId) continue;
    if (entry.expiresAt < now) {
      cache.delete(key);
      continue;
    }
    if (!contains(entry, offset, limit)) continue;
    cache.delete(key);
    cache.set(key, entry);
    const start = offset - entry.offset;
    return {
      items: entry.items.slice(start, start + limit),
      pagination: { offset, limit, total: entry.total },
    };
  }
  return null;
}

export function setCachedItems(
  collectionId: string,
  offset: number,
  limit: number,
  value: WebflowItemsResult,
  ttlSeconds: number
): void {
  if (ttlSeconds <= 0) return;
  const k = keyFor(collectionId, offset, limit);
  cache.delete(k);
  cache.set(k, {
    collectionId,
    offset,
    limit,
    items: value.items,
    total: value.pagination.total,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
