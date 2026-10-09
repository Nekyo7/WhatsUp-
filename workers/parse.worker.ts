import { parseChatFile, type ParsedChatResult } from "../lib/parsers";

export interface ParseWorkerInput {
  files: {
    name: string;
    content: string;
  }[];
}

export interface ParseWorkerProgress {
  type: "progress";
  current: number;
  total: number;
  fileName: string;
}

export interface ParseWorkerComplete {
  type: "complete";
  results: ParsedChatResult[];
}

export interface ParseWorkerError {
  type: "error";
  error: string;
}

export type ParseWorkerMessage = ParseWorkerProgress | ParseWorkerComplete | ParseWorkerError;

// Worker listener
addEventListener("message", (event: MessageEvent<ParseWorkerInput>) => {
  try {
    const { files } = event.data;
    if (!files || !Array.isArray(files)) {
      postMessage({ type: "error", error: "Invalid payload sent to parse worker" } as ParseWorkerError);
      return;
    }

    const results: ParsedChatResult[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      postMessage({
        type: "progress",
        current: i + 1,
        total,
        fileName: file.name,
      } as ParseWorkerProgress);

      const parsed = parseChatFile(file.content, file.name);
      results.push(parsed);
    }

    postMessage({
      type: "complete",
      results,
    } as ParseWorkerComplete);
  } catch (err: any) {
    postMessage({
      type: "error",
      error: err.message || "Failed to parse files in worker",
    } as ParseWorkerError);
  }
});
