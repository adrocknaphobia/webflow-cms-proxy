# Agent Instructions

## This is NOT the Next.js you know

This project uses Next.js 16 + React 19. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Project Overview

A Next.js App Router backend that queries a Webflow CMS collection and returns items as JSON. Currently exposes a single endpoint that returns YouTube video IDs.

## Architecture

- **Runtime:** Next.js App Router (Node)
- **HTTP client:** native `fetch` against the Webflow Data API (no SDK)
- **CORS:** dynamic per-request — Webflow domains hardcoded; custom domains fetched once from the Webflow Sites API and cached in process memory for 24h

## Key Files

```
app/api/videos/route.ts   — GET /api/videos handler
lib/webflow.ts            — Webflow CMS API client
lib/mapper.ts             — Maps CMS items to { youtubeId } objects
lib/allowed-origins.ts    — CORS allowlist (Webflow domains + cached custom domains)
.env.local                — Local env vars (not committed)
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `WEBFLOW_SITE_ID` | Webflow site ID |
| `WEBFLOW_API_TOKEN` | Webflow Data API token (CMS read access) |
| `WEBFLOW_SITE_API_TOKEN` | Webflow Sites API token (`sites:read` scope — used by CORS to fetch custom domains) |
| `WEBFLOW_COLLECTION_ID` | CMS collection ID |
| `YOUTUBE_FIELD_NAME` | CMS field API slug holding the YouTube ID |
| `CACHE_MAX_AGE` | `Cache-Control: s-maxage` in seconds |
| `CACHE_STALE_WHILE_REVALIDATE` | `Cache-Control: stale-while-revalidate` in seconds |

## CORS

Allowed origins resolved per request in `lib/allowed-origins.ts`:
1. `*.webflow.com` and `*.webflow.io` — hardcoded
2. Custom domains — fetched from `GET /v2/sites/:id/custom_domains` on first request, cached in process memory for 24h

`Access-Control-Allow-Origin` always echoes the exact incoming origin (never `*`). The in-memory cache resets on cold start / redeploy.

## Webflow CMS Notes

- Use `/items/live` (not `/items`) to return only published items
- The CMS field's **API slug** (not display name) is what `YOUTUBE_FIELD_NAME` must match
