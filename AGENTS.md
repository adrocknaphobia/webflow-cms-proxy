# Agent Instructions

## This is NOT the Next.js you know

This project uses Next.js 16 + React 19. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project Overview

A config-driven Next.js proxy in front of the Webflow Data API. Its job is to keep the Webflow API token server-side while letting client React components fetch CMS data over CORS-restricted endpoints.

The shape: **one dynamic route**, **one JSON config file**. Adding an endpoint means adding an entry to the JSON file pointed at by `ENDPOINTS_CONFIG` — no new code.

## Architecture

- **Runtime:** Next.js App Router (Node)
- **HTTP client:** native `fetch` against the Webflow Data API (no SDK)
- **Routing:** `app/api/[endpoint]/route.ts` resolves the slug against the loaded config, fetches the collection by ID, projects the declared field slugs, returns `{ items: [...] }`
- **Config:** `config/endpoints.ts` reads the JSON file at the path in `ENDPOINTS_CONFIG` (once, at module load). Throws at startup if the var is unset or the file is unreadable.
- **Schema discovery:** `scripts/schema.mjs` is a dev-time tool that lists collections and field slugs. Not used at request time.
- **CORS:** Webflow domains hardcoded; custom domains fetched from the Webflow Sites API and cached in process memory for 24h

## Key Files

```
config/endpoints.json          — Default endpoint config (slug → { collectionId, fields })
config/endpoints.ts            — Loader: reads ENDPOINTS_CONFIG path, parses JSON, exposes getEndpoint
app/api/[endpoint]/route.ts    — Generic GET/OPTIONS handler
lib/webflow.ts                 — Webflow Data API client (just fetchCollectionItems)
lib/mapper.ts                  — projectItems: WebflowItem[] → Record<string, unknown>[]
lib/allowed-origins.ts         — CORS allowlist (Webflow domains + cached custom domains)
scripts/schema.mjs             — Dev-time discovery script (npm run schema)
.env.local                     — Local env vars (not committed)
```

## Adding an endpoint

Append to the JSON file at `ENDPOINTS_CONFIG`. `collectionId` is the Webflow Collection ID (visible at the top of the collection settings panel in the Designer, with a copy button). `fields` is an array of Webflow field **slugs**, optionally followed by `":outputKey"` to rename it in the response:

```json
{
  "posts": {
    "collectionId": "<webflow-collection-id>",
    "fields": [
      "name:title",
      "slug",
      "published-on:publishedAt",
      "excerpt"
    ]
  }
}
```

That's it. `/api/posts` returns `{ items: [{ title, slug, publishedAt, excerpt }, ...] }`. Different environments point `ENDPOINTS_CONFIG` at different files.

**Why IDs and slugs, not display names**: collection IDs and field slugs are stable across renames in the Designer; display names are not. Slugs aren't visible in the Designer UI — use the discovery script (next section) to find them.

## Discovering collection IDs and field slugs

```bash
npm run schema                              # list all collections in the site (id + name)
npm run schema -- <collectionId>            # list fields for a collection (slug + display name + type)
```

The script reads `WEBFLOW_API_TOKEN` (and `WEBFLOW_SITE_ID` for the no-arg form) from `.env.local`. Run it once when wiring up a new endpoint and copy the slugs into `endpoints.json`.

**A field slug typo will not error** — the proxy returns `null` for that field. The discovery script is the safeguard against typos.

**How field resolution works**: on the first request to an endpoint, the loader fetches the collection schema from `GET /v2/collections/{id}` to build a `displayName → slug` map, cached per-collection for the process lifetime. Display names not found in the schema throw a 500 (server log has the offending field name). If two fields share a display name, the first match wins.

## Response shape

```json
{ "items": [{ "outputKey": value, ... }, ...] }
```

- Missing/undeclared field values become `null` (the proxy is a thin pass-through; clients decide what to do with nulls)
- Only fields listed in `fields` are exposed — everything else from the Webflow item is dropped
- Empty strings pass through as `""`

## Environment Variables

| Variable | Purpose |
|---|---|
| `WEBFLOW_API_TOKEN` | Webflow API token — needs `cms:read` (CMS endpoints) and `sites:read` (CORS custom-domain lookup) |
| `WEBFLOW_SITE_ID` | Webflow site ID — used by `npm run schema` and by CORS |
| `CACHE_MAX_AGE` | `Cache-Control: s-maxage` in seconds |
| `CACHE_STALE_WHILE_REVALIDATE` | `Cache-Control: stale-while-revalidate` in seconds |
| `ENDPOINTS_CONFIG` | Path to the endpoints JSON file (relative to project root) |

Collection IDs and field mappings live in the JSON file at `ENDPOINTS_CONFIG`, not env.

## CORS

Per-request resolution in `lib/allowed-origins.ts`:
1. `*.webflow.com` and `*.webflow.io` — hardcoded
2. Custom domains — fetched from `GET /v2/sites/:id/custom_domains` on first request, cached in process memory for 24h

`Access-Control-Allow-Origin` always echoes the exact incoming origin (never `*`). Cache resets on cold start / redeploy.

## Paging

Clients control the page via `?offset=` and `?limit=` query params, forwarded to Webflow:

```
GET /api/books?offset=10&limit=5
```

Response:

```json
{
  "items": [ ... ],
  "pagination": { "offset": 10, "limit": 5, "total": 42 }
}
```

Defaults: `offset=0`, `limit=100`. Limit is clamped to `[1, 100]` (Webflow's max page size). Negative offset clamps to 0. Invalid values (`?limit=abc`) fall back to defaults. No 400s for bad input — match the route's lenient style.

## Webflow CMS Notes

- Use `/items/live` (not `/items`) — only published items
- Slugs are stable across display-name renames; field display names are not. Config uses slugs (with the rename override producing the public-facing names)
- The slug for a collection's primary identifier field is always `name`, regardless of its display name (e.g. "VideoID", "Book Title" — both slug `name`)
- Webflow's max `limit` per page is 100
