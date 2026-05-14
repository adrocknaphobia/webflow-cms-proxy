const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

export interface WebflowItem {
  id: string;
  fieldData: Record<string, unknown>;
}

interface WebflowCollectionResponse {
  items: WebflowItem[];
}

export async function fetchCollectionItems(
  collectionId: string,
  apiToken: string
): Promise<WebflowItem[]> {
  const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items/live?limit=100`;

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
  return data.items ?? [];
}
