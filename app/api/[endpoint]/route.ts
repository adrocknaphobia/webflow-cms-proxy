import { fetchCollectionItemsCached } from "@/lib/webflow";
import { projectItems } from "@/lib/mapper";
import { isAllowedOrigin } from "@/lib/allowed-origins";
import { getEndpoint } from "@/config/endpoints";

type RouteContext = { params: Promise<{ endpoint: string }> };

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 100;

function parsePaging(url: URL): { offset: number; limit: number } {
  const rawOffset = Number(url.searchParams.get("offset"));
  const rawLimit = Number(url.searchParams.get("limit"));
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(MAX_LIMIT, Math.trunc(rawLimit))
      : DEFAULT_LIMIT;
  return { offset, limit };
}

async function corsHeaders(request: Request): Promise<Record<string, string>> {
  const origin = request.headers.get("Origin");
  if (!(await isAllowedOrigin(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: await corsHeaders(request),
  });
}

export async function GET(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  const { endpoint } = await params;
  const cors = await corsHeaders(request);
  const config = getEndpoint(endpoint);

  if (!config) {
    return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const apiToken = process.env.WEBFLOW_API_TOKEN;
  if (!apiToken) {
    return new Response(JSON.stringify({ error: "Failed to fetch items" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const { offset, limit } = parsePaging(new URL(request.url));
  const cacheMaxAge = Number(process.env.CACHE_MAX_AGE ?? "60");
  const cacheStaleWhileRevalidate = Number(
    process.env.CACHE_STALE_WHILE_REVALIDATE ?? "300"
  );
  const localCacheTtl = Number(process.env.LOCAL_CACHE_TTL ?? "300");
  const cacheControl = `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheStaleWhileRevalidate}`;

  try {
    const { result, cached } = await fetchCollectionItemsCached(
      config.collectionId,
      apiToken,
      { offset, limit, ttlSeconds: localCacheTtl }
    );
    const projected = projectItems(result.items, config.fields);
    const body = JSON.stringify({ items: projected, pagination: result.pagination });

    if (process.env.LOG_REQUESTS) {
      console.log(
        `[webflow-cms] ${endpoint} cache=${cached ? "HIT" : "MISS"} offset=${offset} limit=${limit}`
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
        "X-Cache": cached ? "HIT" : "MISS",
        ...cors,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch items" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
