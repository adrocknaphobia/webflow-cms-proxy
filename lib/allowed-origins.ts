const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let domainsCache: { domains: string[]; expiresAt: number } | null = null;

function isWebflowOrigin(hostname: string): boolean {
  return (
    hostname === "webflow.com" ||
    hostname.endsWith(".webflow.com") ||
    hostname === "webflow.io" ||
    hostname.endsWith(".webflow.io")
  );
}

async function fetchCustomDomains(
  siteId: string,
  apiToken: string
): Promise<string[]> {
  const res = await fetch(
    `https://api.webflow.com/v2/sites/${siteId}/custom_domains`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  if (!res.ok) throw new Error(`Webflow API error: ${res.status}`);
  const data = (await res.json()) as { customDomains: { url: string }[] };
  return (data.customDomains ?? []).map((d) => `https://${d.url}`);
}

async function getCustomDomains(): Promise<string[]> {
  if (domainsCache && domainsCache.expiresAt > Date.now()) {
    return domainsCache.domains;
  }

  const siteId = process.env.WEBFLOW_SITE_ID;
  const apiToken = process.env.WEBFLOW_API_TOKEN;
  if (!siteId || !apiToken) return [];

  try {
    const domains = await fetchCustomDomains(siteId, apiToken);
    domainsCache = { domains, expiresAt: Date.now() + CACHE_TTL_MS };
    return domains;
  } catch {
    return [];
  }
}

export async function isAllowedOrigin(origin: string | null): Promise<boolean> {
  if (!origin) return false;

  try {
    const { hostname } = new URL(origin);
    if (isWebflowOrigin(hostname)) return true;
  } catch {
    return false;
  }

  const customDomains = await getCustomDomains();
  return customDomains.includes(origin);
}
