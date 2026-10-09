import type { Message, ChatStats, GhostEntry, PromiseItem, GroupMemberStat } from "@/types";
import { calculateSessionsAndTalkTime } from "./sessions";
import { calculateReplyTimes } from "./replies";
import { classifyGhostStatus, calculate30DayActivityRates } from "./ghosts";
import { calculateReplyDebt } from "./debt";
import { extractPromises } from "./promises";
import { calculateHeatmap } from "./heatmap";

export {
  calculateSessionsAndTalkTime,
  calculateReplyTimes,
  classifyGhostStatus,
  calculateReplyDebt,
  extractPromises,
  calculateHeatmap,
};

export interface FullChatAnalysisResult {
  stats: ChatStats;
  ghost: GhostEntry | null;
  promises: PromiseItem[];
}

/**
 * Runs full local-first analytics on a single chat dataset
 */
export function analyzeChat(
  chatId: string,
  messages: Message[],
  selfName: string,
  volumePercentile = 0.5,
  referenceTime: Date = new Date()
): FullChatAnalysisResult {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 1. Message shares
  const youCount = validMessages.filter((m) => m.sender === selfName).length;
  const totalCount = validMessages.length || 1;
  const messageShareYou = Number((youCount / totalCount).toFixed(2));
  const messageShareThem = Number(((totalCount - youCount) / totalCount).toFixed(2));

  // 2. Sessions & Talk Time
  const sessionData = calculateSessionsAndTalkTime(messages, selfName);

  // 3. Reply Times
  const replyData = calculateReplyTimes(messages, selfName);

  // 4. Heatmap
  const heatmap = calculateHeatmap(messages);

  // 5. Last message details
  const lastMsg = validMessages[validMessages.length - 1];
  const lastMessageFrom = lastMsg?.sender || "Unknown";
  const lastTime = lastMsg ? new Date(lastMsg.timestamp).getTime() : referenceTime.getTime();
  const daysSinceLastMessage = Math.max(
    0,
    Math.floor((referenceTime.getTime() - lastTime) / (1000 * 60 * 60 * 24))
  );

  // 6. 30-day activity rates
  const { recentRate, peakRate } = calculate30DayActivityRates(validMessages, referenceTime);

  // 7. Ghost classification
  const ghost = classifyGhostStatus(chatId, messages, selfName, volumePercentile, referenceTime);

  // 8. Promises
  const promises = extractPromises(messages, selfName, referenceTime);

  // 9. Historical Longest Silence & Unanswered Questions
  let maxSilenceDays = 0;
  let unansweredQuestions = 0;
  for (let i = 0; i < validMessages.length - 1; i++) {
    const t1 = new Date(validMessages[i].timestamp).getTime();
    const t2 = new Date(validMessages[i + 1].timestamp).getTime();
    const gapDays = Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
    if (gapDays > maxSilenceDays) {
      maxSilenceDays = gapDays;
    }
  }

  // Count unanswered questions from others
  const questionRegex = /\?|kya|kab|kaha|kyun|kaise|crc|update|status|when|why|where/i;
  for (let i = 0; i < validMessages.length; i++) {
    const msg = validMessages[i];
    if (msg.sender !== selfName && questionRegex.test(msg.text)) {
      const nextFromSelf = validMessages.slice(i + 1, i + 5).find((m) => m.sender === selfName);
      if (!nextFromSelf) {
        unansweredQuestions++;
      }
    }
  }

  // 10. Per-Member breakdown for Group & Multi-participant chats
  const sendersSet = new Set(validMessages.map((m) => m.sender));
  const memberStats: GroupMemberStat[] = [];

  sendersSet.forEach((sender) => {
    const senderMsgs = validMessages.filter((m) => m.sender === sender);
    const count = senderMsgs.length;
    const share = Number((count / totalCount).toFixed(2));
    const initiated = sessionData.initiatorCounts[sender] || 0;

    // Approximate talk time share proportionally
    const talkMins = Math.round(sessionData.estimatedTalkTimeMinutes * share);

    memberStats.push({
      name: sender,
      messageCount: count,
      messageShare: share,
      talkTimeMinutes: talkMins,
      initiatorCount: initiated,
      medianReplyTimeSecs: sender === selfName ? replyData.medianReplyTimeYouSecs : replyData.medianReplyTimeThemSecs,
    });
  });

  memberStats.sort((a, b) => b.messageCount - a.messageCount);

  const stats: ChatStats = {
    chatId,
    messageShareYou,
    messageShareThem,
    sessionCount: sessionData.sessions.length,
    estimatedTalkTimeMinutes: sessionData.estimatedTalkTimeMinutes,
    initiatorShareYou: sessionData.initiatorShareYou,
    initiatorShareThem: sessionData.initiatorShareThem,
    medianReplyTimeYouSecs: replyData.medianReplyTimeYouSecs,
    medianReplyTimeThemSecs: replyData.medianReplyTimeThemSecs,
    heatmap,
    lastMessageFrom,
    daysSinceLastMessage,
    messagesPerWeekRecent: Number(recentRate.toFixed(1)),
    messagesPerWeekPeak: Number(peakRate.toFixed(1)),
    memberStats,
    historicalLongestSilenceDays: maxSilenceDays,
    unansweredQuestionsCount: unansweredQuestions,
  };

  return {
    stats,
    ghost,
    promises,
  };
}
