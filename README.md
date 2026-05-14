# webflow-cms

Next.js backend that queries a Webflow CMS collection and returns the items as JSON.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/videos` | Returns published YouTube IDs from a Webflow CMS collection |

## Development

```bash
cp .env.example .env.local   # fill in credentials
npm install
npm run dev
```

See `AGENTS.md` for architecture notes.
