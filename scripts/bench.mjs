// One-off benchmark: Webflow API latency vs. slicing cost.
// Run: node --env-file=.env.local scripts/bench.mjs

const token = process.env.WEBFLOW_API_TOKEN;
const VIDEOS = "69d529341fc5cefa55a232ed";
const BOOKS = "69bac0322d45bc4a7e2e5fe9";
const headers = { Authorization: `Bearer ${token}`, "accept-version": "1.0.0" };

async function fetchOnce(id) {
  const start = performance.now();
  const r = await fetch(
    `https://api.webflow.com/v2/collections/${id}/items/live?limit=100&offset=0`,
    { headers }
  );
  const data = await r.json();
  return { ms: performance.now() - start, items: data.items ?? [] };
}

async function sampleApi(label, id, n) {
  await fetchOnce(id); // warm-up
  const times = [];
  for (let i = 0; i < n; i++) times.push((await fetchOnce(id)).ms);
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = sorted[Math.floor(n * 0.5)];
  const p95 = sorted[Math.floor(n * 0.95)];
  console.log(
    `${label}: n=${n}  min=${sorted[0].toFixed(0)}ms  p50=${p50.toFixed(0)}ms  avg=${avg.toFixed(0)}ms  p95=${p95.toFixed(0)}ms  max=${sorted[n - 1].toFixed(0)}ms`
  );
}

console.log("--- Webflow Data API latency ---");
await sampleApi("videos (3 items)", VIDEOS, 10);
await sampleApi("books  (3 items)", BOOKS, 10);

console.log("\n--- Slicing cost (simulated 100-item array) ---");
const first = await fetchOnce(BOOKS);
const items = [];
while (items.length < 100) items.push(...first.items);
items.length = 100;

for (const limit of [1, 5, 25, 50, 100]) {
  const iter = 1_000_000;
  const start = performance.now();
  for (let i = 0; i < iter; i++) items.slice(0, limit);
  const total = performance.now() - start;
  const perOp = (total / iter) * 1000; // µs
  console.log(`  slice(0, ${String(limit).padStart(3)}): ${perOp.toFixed(2)}µs per call`);
}

console.log("\n--- Subset-lookup scan cost (20 entries, find containing range) ---");
const entries = Array.from({ length: 20 }, (_, i) => ({
  collectionId: i === 19 ? BOOKS : `dummy-${i}`,
  offset: 0,
  limit: 100,
  expiresAt: Date.now() + 60_000,
}));
const target = { collectionId: BOOKS, offset: 0, limit: 2 };
const iter = 1_000_000;
const start = performance.now();
for (let i = 0; i < iter; i++) {
  for (const e of entries) {
    if (
      e.collectionId === target.collectionId &&
      e.expiresAt > Date.now() &&
      e.offset <= target.offset &&
      target.offset + target.limit <= e.offset + e.limit
    ) {
      break;
    }
  }
}
const total = performance.now() - start;
console.log(`  scan 20 entries (match at last): ${((total / iter) * 1000).toFixed(2)}µs per lookup`);
