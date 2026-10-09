import { analyzeChat, type FullChatAnalysisResult } from "../lib/analytics";
import { calculateReplyDebt } from "../lib/analytics/debt";
import type { Chat, Message, ReplyDebtBreakdown, GhostEntry, PromiseItem, ChatStats } from "@/types";

export interface AnalyticsWorkerInput {
  chats: {
    chat: Chat;
    messages: Message[];
  }[];
  customSelfNames?: Record<string, string>; // chatId -> selfName override
  referenceTimeIso?: string;
}

export interface AnalyticsWorkerComplete {
  type: "analytics_complete";
  results: {
    chatId: string;
    stats: ChatStats;
    ghost: GhostEntry | null;
    promises: PromiseItem[];
  }[];
  replyDebt: ReplyDebtBreakdown;
}

export interface AnalyticsWorkerError {
  type: "analytics_error";
  error: string;
}

export type AnalyticsWorkerMessage = AnalyticsWorkerComplete | AnalyticsWorkerError;

addEventListener("message", (event: MessageEvent<AnalyticsWorkerInput>) => {
  try {
    const { chats, customSelfNames = {}, referenceTimeIso } = event.data;
    const referenceTime = referenceTimeIso ? new Date(referenceTimeIso) : new Date();

    // Compute volume percentiles
    const sortedByVolume = [...chats].sort((a, b) => a.messages.length - b.messages.length);
    const totalChats = sortedByVolume.length || 1;

    const analysisResults: {
      chatId: string;
      stats: ChatStats;
      ghost: GhostEntry | null;
      promises: PromiseItem[];
    }[] = [];

    const allGhosts: GhostEntry[] = [];
    const chatObjects: Chat[] = [];

    for (let i = 0; i < chats.length; i++) {
      const item = chats[i];
      const selfName = customSelfNames[item.chat.id] || item.chat.selfName || "You";
      const rankIndex = sortedByVolume.findIndex((x) => x.chat.id === item.chat.id);
      const volumePercentile = (rankIndex + 1) / totalChats;

      const analysis = analyzeChat(item.chat.id, item.messages, selfName, volumePercentile, referenceTime);

      analysisResults.push({
        chatId: item.chat.id,
        stats: analysis.stats,
        ghost: analysis.ghost,
        promises: analysis.promises,
      });

      if (analysis.ghost) {
        allGhosts.push(analysis.ghost);
      }
      chatObjects.push(item.chat);
    }

    const replyDebt = calculateReplyDebt(allGhosts, chatObjects);

    postMessage({
      type: "analytics_complete",
      results: analysisResults,
      replyDebt,
    } as AnalyticsWorkerComplete);
  } catch (err: any) {
    postMessage({
      type: "analytics_error",
      error: err.message || "Failed to process analytics in worker",
    } as AnalyticsWorkerError);
  }
});
