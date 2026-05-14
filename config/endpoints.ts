import { readFileSync } from "fs";
import { resolve } from "path";

export interface EndpointConfig {
  /** Webflow collection ID (copyable from the Designer, top of the collection settings panel) */
  collectionId: string;
  /**
   * Fields to expose. Each entry is a Webflow field slug, optionally
   * followed by ":outputKey" to rename it in the response.
   * Run `npm run schema -- <collectionId>` to discover slugs.
   * Examples: "slug", "name:youtubeId", "published-on:publishedAt"
   */
  fields: string[];
}

function loadEndpoints(): Record<string, EndpointConfig> {
  const configPath = process.env.ENDPOINTS_CONFIG;
  if (!configPath) {
    throw new Error("ENDPOINTS_CONFIG is not set");
  }
  const absolute = resolve(process.cwd(), configPath);
  const raw = readFileSync(absolute, "utf-8");
  return JSON.parse(raw) as Record<string, EndpointConfig>;
}

const endpoints = loadEndpoints();

export function getEndpoint(slug: string): EndpointConfig | undefined {
  return endpoints[slug];
}
