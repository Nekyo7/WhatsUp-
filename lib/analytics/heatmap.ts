import type { Message, HeatmapPoint } from "@/types";

/**
 * Computes a 7x24 hour-by-weekday message distribution grid.
 * day: 0 (Sun) to 6 (Sat), hour: 0 to 23
 */
export function calculateHeatmap(messages: Message[]): HeatmapPoint[] {
  // Initialize full 7x24 grid with 0 counts
  const grid: Record<string, number> = {};
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid[`${d}_${h}`] = 0;
    }
  }

  for (const msg of messages) {
    if (msg.isSystem) continue;
    try {
      const dt = new Date(msg.timestamp);
      if (!isNaN(dt.getTime())) {
        const d = dt.getDay(); // 0 to 6
        const h = dt.getHours(); // 0 to 23
        const key = `${d}_${h}`;
        grid[key] = (grid[key] || 0) + 1;
      }
    } catch {
      // ignore
    }
  }

  const result: HeatmapPoint[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      result.push({
        day: d,
        hour: h,
        count: grid[`${d}_${h}`] || 0,
      });
    }
  }

  return result;
}
