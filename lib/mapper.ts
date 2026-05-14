import type { WebflowItem } from "./webflow";

export interface Video {
  youtubeId: string;
}

export function mapItemsToVideos(
  items: WebflowItem[],
  youtubeFieldName: string
): Video[] {
  return items
    .map((item) => {
      const youtubeId = item.fieldData[youtubeFieldName];
      return typeof youtubeId === "string" && youtubeId.trim()
        ? { youtubeId: youtubeId.trim() }
        : null;
    })
    .filter((v): v is Video => v !== null);
}
