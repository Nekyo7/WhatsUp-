import type { Message } from "@/types";

const MAX_REPLY_GAP_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ReplyAnalysisResult {
  medianReplyTimeYouSecs: number | null;
  medianReplyTimeThemSecs: number | null;
  replyDeltasYou: number[];
  replyDeltasThem: number[];
}

function calculateMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Calculates reply latency between conversational turns.
 * Gaps over 24 hours are excluded as "no direct reply".
 */
export function calculateReplyTimes(messages: Message[], selfName: string): ReplyAnalysisResult {
  const valid = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const replyDeltasYou: number[] = [];
  const replyDeltasThem: number[] = [];

  for (let i = 0; i < valid.length - 1; i++) {
    const current = valid[i];
    const next = valid[i + 1];

    if (current.sender !== next.sender) {
      const deltaMs = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();

      if (deltaMs > 0 && deltaMs <= MAX_REPLY_GAP_MS) {
        const deltaSecs = Math.round(deltaMs / 1000);
        if (next.sender === selfName) {
          replyDeltasYou.push(deltaSecs);
        } else {
          replyDeltasThem.push(deltaSecs);
        }
      }
    }
  }

  return {
    medianReplyTimeYouSecs: calculateMedian(replyDeltasYou),
    medianReplyTimeThemSecs: calculateMedian(replyDeltasThem),
    replyDeltasYou,
    replyDeltasThem,
  };
}
