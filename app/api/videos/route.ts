import { fetchCollectionItems } from "@/lib/webflow";
import { mapItemsToVideos } from "@/lib/mapper";
import { isAllowedOrigin } from "@/lib/allowed-origins";

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

export async function GET(request: Request): Promise<Response> {
  const collectionId = process.env.WEBFLOW_COLLECTION_ID;
  const apiToken = process.env.WEBFLOW_API_TOKEN;
  const youtubeFieldName = process.env.YOUTUBE_FIELD_NAME;
  const cacheMaxAge = Number(process.env.CACHE_MAX_AGE ?? "60");
  const cacheStaleWhileRevalidate = Number(
    process.env.CACHE_STALE_WHILE_REVALIDATE ?? "300"
  );
  const cors = await corsHeaders(request);

  if (!collectionId || !apiToken || !youtubeFieldName) {
    return new Response(JSON.stringify({ error: "Failed to fetch videos" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const cacheControl = `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheStaleWhileRevalidate}`;

  try {
    const items = await fetchCollectionItems(collectionId, apiToken);
    const videos = mapItemsToVideos(items, youtubeFieldName);
    const body = JSON.stringify({ videos });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
        ...cors,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch videos" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
