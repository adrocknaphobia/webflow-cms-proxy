import { getCachedItems, setCachedItems } from "./cache";

const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

export interface WebflowItem {
  id: string;
  fieldData: Record<string, unknown>;
}

export interface WebflowPagination {
  offset: number;
  limit: number;
  total: number;
}

export interface WebflowItemsResult {
  items: WebflowItem[];
  pagination: WebflowPagination;
}

interface WebflowCollectionResponse {
  items?: WebflowItem[];
  pagination?: WebflowPagination;
}

export async function fetchCollectionItems(
  collectionId: string,
  apiToken: string,
  options: { offset?: number; limit?: number } = {}
): Promise<WebflowItemsResult> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 100;
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items/live?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "accept-version": "1.0.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Webflow API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as WebflowCollectionResponse;
  const items = data.items ?? [];
  return {
    items,
    pagination: data.pagination ?? { offset, limit, total: items.length },
  };
}

export async function fetchCollectionItemsCached(
  collectionId: string,
  apiToken: string,
  options: { offset?: number; limit?: number; ttlSeconds?: number } = {}
): Promise<{ result: WebflowItemsResult; cached: boolean }> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 100;
  const ttl = options.ttlSeconds ?? 0;

  const hit = getCachedItems(collectionId, offset, limit);
  if (hit) return { result: hit, cached: true };

  const result = await fetchCollectionItems(collectionId, apiToken, { offset, limit });
  setCachedItems(collectionId, offset, limit, result, ttl);
  return { result, cached: false };
}
