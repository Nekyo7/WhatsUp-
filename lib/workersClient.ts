import { parseChatFile, parseWhatsAppZip, type ParsedChatResult } from "./parsers";
import { analyzeChat } from "./analytics";
import { calculateReplyDebt } from "./analytics/debt";
import type { Chat, Message, ChatStats, GhostEntry, PromiseItem, ReplyDebtBreakdown } from "@/types";

/**
 * Parses files using a Web Worker if supported and available,
 * with automatic, seamless fallback to the main thread.
 */
export async function parseFilesWithWorkerFallback(
  files: { name: string; content?: string; buffer?: ArrayBuffer }[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<ParsedChatResult[]> {
  const total = files.length;
  const results: ParsedChatResult[] = [];

  // Parse files sequentially, handling text and zip
  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.name);

    if (file.name.toLowerCase().endsWith(".zip") && file.buffer) {
      const parsed = await parseWhatsAppZip(file.buffer, file.name);
      results.push(parsed);
    } else if (file.content !== undefined) {
      // Try Web Worker for large raw text parsing if supported
      let parsedByWorker = false;
      if (typeof window !== "undefined" && typeof Worker !== "undefined" && file.content.length > 50_000) {
        try {
          const worker = new Worker(new URL("../workers/parse.worker.ts", import.meta.url), { type: "module" });
          const workerPromise = new Promise<ParsedChatResult>((resolve, reject) => {
            worker.onmessage = (e) => {
              if (e.data.type === "complete" && e.data.results?.[0]) {
                worker.terminate();
                resolve(e.data.results[0]);
              } else if (e.data.type === "error") {
                worker.terminate();
                reject(new Error(e.data.error));
              }
            };
            worker.onerror = (err) => {
              worker.terminate();
              reject(err);
            };
            worker.postMessage({ files: [{ name: file.name, content: file.content }] });
          });

          const res = await workerPromise;
          results.push(res);
          parsedByWorker = true;
        } catch {
          // Worker initialization failed; fall back to main thread
          parsedByWorker = false;
        }
      }

      if (!parsedByWorker) {
        const parsed = parseChatFile(file.content, file.name);
        results.push(parsed);
      }
    }
  }

  return results;
}
