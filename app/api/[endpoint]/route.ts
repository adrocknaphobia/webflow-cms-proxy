import { fetchCollectionItems } from "@/lib/webflow";
import { projectItems } from "@/lib/mapper";
import { isAllowedOrigin } from "@/lib/allowed-origins";
import { getEndpoint } from "@/config/endpoints";

type RouteContext = { params: Promise<{ endpoint: string }> };

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

  const cacheMaxAge = Number(process.env.CACHE_MAX_AGE ?? "60");
  const cacheStaleWhileRevalidate = Number(
    process.env.CACHE_STALE_WHILE_REVALIDATE ?? "300"
  );
  const cacheControl = `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheStaleWhileRevalidate}`;

  try {
    const items = await fetchCollectionItems(config.collectionId, apiToken);
    const projected = projectItems(items, config.fields);
    const body = JSON.stringify({ items: projected });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
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
