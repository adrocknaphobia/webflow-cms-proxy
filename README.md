# webflow-cms

A config-driven Next.js proxy that exposes selected Webflow CMS collections as JSON endpoints, keeping the Webflow Data API token off the client.

## How it works

Each entry in the endpoints JSON file becomes a route at `/api/<slug>`. The config declares which Webflow collection to read and which fields to expose (with optional renaming). The path to the file is set by `ENDPOINTS_CONFIG` in `.env`, so different environments can load different configs.

```json
// config/endpoints.json
{
  "videos": {
    "collectionId": "69d529341fc5cefa55a232ed",
    "fields": ["name:youtubeId"]
  }
}
```

`collectionId` is the Webflow Collection ID (copyable from the Designer). `fields` is an array of Webflow field **slugs** — append `":outputKey"` to rename a field in the response. Plain `"slug"` exposes it as `slug`; `"name:youtubeId"` exposes it as `youtubeId`.

Slugs aren't visible in the Webflow Designer — use the discovery script:

```bash
npm run schema                       # list collections in the site
npm run schema -- <collectionId>     # list fields (with slugs) for a collection
```

Request `/api/videos` →

```json
{
  "items": [{ "youtubeId": "dQw4w9WgXcQ" }, ...],
  "pagination": { "offset": 0, "limit": 100, "total": 3 }
}
```

Paging via `?offset=` and `?limit=` (max 100, defaults `0` / `100`):

```
GET /api/videos?offset=10&limit=5
```

Unknown endpoint slugs return 404.

## Adding an endpoint

Add an entry to the JSON file at `ENDPOINTS_CONFIG`:

```json
{
  "posts": {
    "collectionId": "abc123",
    "fields": [
      "name:title",
      "slug",
      "published-on:publishedAt"
    ]
  }
}
```

Now `/api/posts` serves `{ items: [{ title, slug, publishedAt }, ...] }`. No code changes.

## Development

```bash
cp .env.example .env.local   # fill in credentials
npm install
npm run dev
```

See `AGENTS.md` for architecture notes.
