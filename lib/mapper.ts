import type { WebflowItem } from "./webflow";

function parseField(spec: string): { slug: string; outputKey: string } {
  const idx = spec.indexOf(":");
  if (idx === -1) {
    const name = spec.trim();
    return { slug: name, outputKey: name };
  }
  const slug = spec.slice(0, idx).trim();
  const override = spec.slice(idx + 1).trim();
  return { slug, outputKey: override || slug };
}

export function projectItems(
  items: WebflowItem[],
  fields: string[]
): Record<string, unknown>[] {
  const resolved = fields.map(parseField);

  return items.map((item) =>
    Object.fromEntries(
      resolved.map(({ outputKey, slug }) => {
        const value = item.fieldData[slug];
        return [outputKey, value === undefined ? null : value];
      })
    )
  );
}
