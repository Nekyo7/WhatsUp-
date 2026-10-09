import type { Message, GhostEntry } from "@/types";

const QUESTION_INDICATORS = [
  "?", "kya", "kab", "kaha", "kyun", "kaise", "when", "where", "why", "how", "what",
  "can you", "are you", "will you", "could you", "would you", "bhej de", "bhej diya",
  "kar diya", "mila kya", "done?", "update?", "status?", "batadena", "karega", "kre ye"
];

/**
 * Classifies a chat's ghost status across 4 distinct ghost lanes:
 * 1. revivable: Top 20% chat by volume, silent for over 60 days.
 * 2. you_ghosted: Their last message(s) unanswered > 3 days. Higher score for direct question & active chats. Excludes groups > 8 members.
 * 3. they_ghosted: Your last message unanswered > 3 days.
 * 4. fading: Last-30-day weekly average < 25% of chat's own peak 30-day average.
 *
 * (Note: "In-Sync" is an overview status for chats with no ghost flags, not a ghost lane.)
 */
export function classifyGhostStatus(
  chatId: string,
  messages: Message[],
  selfName: string,
  allChatsVolumeRankPercentile = 0.5,
  referenceTime: Date = new Date(),
  participantCount?: number
): GhostEntry | null {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validMessages.length === 0) return null;

  const lastMsg = validMessages[validMessages.length - 1];
  const lastMsgTime = new Date(lastMsg.timestamp);
  const timeDiffMs = referenceTime.getTime() - lastMsgTime.getTime();
  const daysSilent = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60 * 24)));

  const isLastFromYou = lastMsg.sender === selfName;
  const isLastFromThem = !isLastFromYou;

  const textLower = lastMsg.text.toLowerCase();
  const hasQuestion = QUESTION_INDICATORS.some((q) => textLower.includes(q));

  // Determine effective participant count
  const effectiveParticipantCount =
    participantCount !== undefined
      ? participantCount
      : new Set(validMessages.map((m) => m.sender)).size;

  // 1. REVIVABLE: Top 20% volume chat dormant > 60 days
  if (daysSilent > 60 && (allChatsVolumeRankPercentile >= 0.80 || validMessages.length >= 80)) {
    return {
      chatId,
      type: "revivable",
      score: 80,
      reason: `Top-tier chat (top 20% by volume) silent for ${daysSilent} days`,
      daysSilent,
      lastMessageText: lastMsg.text,
      lastMessageTimestamp: lastMsg.timestamp,
    };
  }

  // 2. YOU_GHOSTED: Their last message unanswered > 3 days (Skip for large groups > 8 participants)
  if (isLastFromThem && daysSilent > 3) {
    if (effectiveParticipantCount <= 8) {
      let score = 50;
      if (hasQuestion) score += 25;
      if (validMessages.length > 40 || allChatsVolumeRankPercentile >= 0.7) score += 15;
      if (daysSilent > 7) score += 10;
      score = Math.min(100, score);

      const questionReason = hasQuestion
        ? `Left with a direct pending question (${daysSilent}d silent)`
        : `Unanswered message (${daysSilent}d silent)`;

      return {
        chatId,
        type: "you_ghosted",
        score,
        reason: questionReason,
        daysSilent,
        lastMessageText: lastMsg.text,
        lastMessageTimestamp: lastMsg.timestamp,
      };
    }
  }

  // 3. THEY_GHOSTED: Your last message unanswered > 3 days
  if (isLastFromYou && daysSilent > 3) {
    let score = 40;
    if (validMessages.length > 40 || allChatsVolumeRankPercentile >= 0.7) score += 20;
    if (daysSilent > 7) score += 15;
    score = Math.min(100, score);

    return {
      chatId,
      type: "they_ghosted",
      score,
      reason: `Your message has been unanswered for ${daysSilent} days`,
      daysSilent,
      lastMessageText: lastMsg.text,
      lastMessageTimestamp: lastMsg.timestamp,
    };
  }

  // 4. FADING: Last 30-day weekly average < 25% of chat's own peak 30-day average
  if (validMessages.length >= 15) {
    const { recentRate, peakRate } = calculate30DayActivityRates(validMessages, referenceTime);
    if (peakRate > 2 && recentRate < peakRate * 0.25) {
      return {
        chatId,
        type: "fading",
        score: 60,
        reason: `Activity dropped below 25% of peak (${recentRate.toFixed(1)}/wk vs ${peakRate.toFixed(1)}/wk peak)`,
        daysSilent,
        lastMessageText: lastMsg.text,
        lastMessageTimestamp: lastMsg.timestamp,
      };
    }
  }

  return null;
}

export function calculate30DayActivityRates(
  messages: Message[],
  referenceTime: Date = new Date()
): { recentRate: number; peakRate: number } {
  if (messages.length === 0) return { recentRate: 0, peakRate: 0 };

  const firstTime = new Date(messages[0].timestamp).getTime();
  const lastTime = referenceTime.getTime();
  const totalDays = Math.max(1, (lastTime - firstTime) / (1000 * 60 * 60 * 24));

  if (totalDays < 30) {
    const weeks = Math.max(1, totalDays / 7);
    const rate = messages.length / weeks;
    return { recentRate: rate, peakRate: rate };
  }

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = lastTime - thirtyDaysMs;
  const recentMsgs = messages.filter((m) => new Date(m.timestamp).getTime() >= cutoff);
  const recentRate = (recentMsgs.length / 30) * 7;

  let peakMsgsCount = recentMsgs.length;
  const stepMs = 7 * 24 * 60 * 60 * 1000;
  for (let t = firstTime; t <= cutoff; t += stepMs) {
    const countInWindow = messages.filter((m) => {
      const mt = new Date(m.timestamp).getTime();
      return mt >= t && mt < t + thirtyDaysMs;
    }).length;
    if (countInWindow > peakMsgsCount) {
      peakMsgsCount = countInWindow;
    }
  }

  const peakRate = (peakMsgsCount / 30) * 7;
  return { recentRate, peakRate: Math.max(peakRate, recentRate) };
}

