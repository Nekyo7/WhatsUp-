import type { ReplyDebtBreakdown, GhostEntry, Chat, PromiseItem } from "@/types";

/**
 * Calculates the Reply Debt Score (0 - 100) and detailed guilt breakdown.
 * Considers how many people are waiting on you, duration of unanswered messages,
 * question urgency, chat historical importance, and open unfulfilled promises.
 */
export function calculateReplyDebt(
  ghosts: GhostEntry[],
  chats: Chat[],
  promises: PromiseItem[] = []
): ReplyDebtBreakdown {
  const youGhostedList = ghosts.filter((g) => g.type === "you_ghosted");

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  let rawScore = 0;
  let totalUnansweredDays = 0;
  let highPriorityCount = 0;

  const chatsInDebt = youGhostedList.map((g) => {
    const chat = chatMap.get(g.chatId);
    const title = chat?.title || "Direct Message";
    const msgCount = chat?.messageCount || 10;
    const isHighImportance = msgCount >= 40;
    const hasQuestion = g.reason.toLowerCase().includes("question") || g.lastMessageText.includes("?");

    if (g.daysSilent >= 3 || hasQuestion || isHighImportance) {
      highPriorityCount++;
    }

    totalUnansweredDays += g.daysSilent;

    // Weight 0.3 to 1.0 based on past chat volume
    const importanceWeight = Math.min(1.0, Math.max(0.3, msgCount / 80));
    // Time factor curves
    const timeFactor = Math.min(1.0, Math.log2(g.daysSilent + 1) / Math.log2(31));
    const urgency = hasQuestion ? 1.35 : 1.0;

    const chatDebtPoints = importanceWeight * Math.max(0.5, timeFactor) * urgency * 22;
    rawScore += chatDebtPoints;

    return {
      chatId: g.chatId,
      chatTitle: title,
      daysWaiting: g.daysSilent,
      weight: Number(importanceWeight.toFixed(2)),
      lastQuestion: g.lastMessageText,
    };
  });

  // Open promises debt penalty (+8 points per open unfulfilled promise)
  const openPromises = promises.filter((p) => p.status === "open");
  rawScore += openPromises.length * 8;

  // Base penalty per person waiting
  rawScore += youGhostedList.length * 10;

  const finalScore = Math.min(100, Math.round(rawScore));

  return {
    score: finalScore,
    peopleWaitingCount: youGhostedList.length,
    totalUnansweredDays,
    highPriorityCount,
    chatsInDebt: chatsInDebt.sort((a, b) => b.daysWaiting - a.daysWaiting),
  };
}
