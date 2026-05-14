#!/usr/bin/env node

const token = process.env.WEBFLOW_API_TOKEN;
if (!token) {
  console.error(
    "WEBFLOW_API_TOKEN is not set. Use --env-file=.env.local or export it."
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "accept-version": "1.0.0",
};

const collectionId = process.argv[2];

if (!collectionId) {
  const siteId = process.env.WEBFLOW_SITE_ID;
  if (!siteId) {
    console.error("WEBFLOW_SITE_ID is not set");
    process.exit(1);
  }
  const res = await fetch(
    `https://api.webflow.com/v2/sites/${siteId}/collections`,
    { headers }
  );
  if (!res.ok) {
    console.error(`Webflow API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`\nCollections in site ${siteId}:\n`);
  for (const c of data.collections ?? []) {
    console.log(`  ${c.displayName.padEnd(24)}  ${c.id}`);
  }
  console.log("\nRun `npm run schema -- <collectionId>` to see its fields.\n");
} else {
  const res = await fetch(
    `https://api.webflow.com/v2/collections/${collectionId}`,
    { headers }
  );
  if (!res.ok) {
    console.error(`Webflow API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`\n${data.displayName} (${data.id})\n`);
  for (const f of data.fields ?? []) {
    const name = f.displayName.padEnd(24);
    const slug = (f.slug ?? "").padEnd(20);
    console.log(`  ${name}  slug: ${slug}  type: ${f.type ?? "?"}`);
  }
  console.log();
}
