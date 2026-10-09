import type { Message, GhostEntry } from "@/types";

const QUESTION_INDICATORS = [
  "?", "kya", "kab", "kaha", "kyun", "kaise", "when", "where", "why", "how", "what",
  "can you", "are you", "will you", "could you", "would you", "bhej de", "bhej diya",
  "kar diya", "mila kya", "done?", "update?", "status?", "batadena", "karega", "kre ye"
];

/**
 * Classifies a chat's ghost status across 4 distinct lanes:
 * 1. you_ghosted: Last message from them (or unanswered question), pending your response.
 * 2. they_ghosted: Last message from you, unanswered.
 * 3. fading: Last 30-day weekly rate < 35% of peak weekly rate.
 * 4. revivable: Substantial chat volume dormant > 14 days.
 */
export function classifyGhostStatus(
  chatId: string,
  messages: Message[],
  selfName: string,
  allChatsVolumeRankPercentile = 0.5,
  referenceTime: Date = new Date()
): GhostEntry | null {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validMessages.length === 0) return null;

  const lastMsg = validMessages[validMessages.length - 1];
  const lastMsgTime = new Date(lastMsg.timestamp);
  const timeDiffMs = referenceTime.getTime() - lastMsgTime.getTime();
  const daysSilent = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60 * 24)));
  const hoursSilent = Math.max(0, Math.floor(timeDiffMs / (1000 * 60 * 60)));

  const isLastFromYou = lastMsg.sender === selfName;
  const isLastFromThem = !isLastFromYou;

  const textLower = lastMsg.text.toLowerCase();
  const hasQuestion = QUESTION_INDICATORS.some((q) => textLower.includes(q));

  // 1. Check for REVIVABLE first if dormant > 14 days on a chat with >= 30 msgs
  if (daysSilent >= 14 && (allChatsVolumeRankPercentile >= 0.7 || validMessages.length >= 30)) {
    return {
      chatId,
      type: "revivable",
      score: 75,
      reason: `Formerly close friend (${validMessages.length} msgs) dormant for ${daysSilent} days`,
      daysSilent,
      lastMessageText: lastMsg.text,
      lastMessageTimestamp: lastMsg.timestamp,
    };
  }

  // 2. Check for YOU_GHOSTED (Priority: they messaged last)
  if (isLastFromThem) {
    // If silent >= 1 day OR has direct pending question
    if (daysSilent >= 1 || hasQuestion || hoursSilent >= 12) {
      let score = 50;
      if (hasQuestion) score += 25;
      if (validMessages.length > 40) score += 15;
      if (daysSilent > 7) score += 10;
      score = Math.min(100, score);

      const questionReason = hasQuestion
        ? "Left with a direct pending question"
        : daysSilent > 0
        ? `Unanswered message (${daysSilent}d silent)`
        : `Awaiting your reply (${hoursSilent}h ago)`;

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

  // 3. Check for THEY_GHOSTED (Priority: you messaged last)
  if (isLastFromYou && (daysSilent >= 1 || hoursSilent >= 24)) {
    let score = 40;
    if (validMessages.length > 40) score += 20;
    if (daysSilent > 7) score += 15;
    score = Math.min(100, score);

    return {
      chatId,
      type: "they_ghosted",
      score,
      reason: daysSilent > 0 ? `Your message has been pending for ${daysSilent} days` : `Your message has been pending for ${hoursSilent}h`,
      daysSilent,
      lastMessageText: lastMsg.text,
      lastMessageTimestamp: lastMsg.timestamp,
    };
  }

  // 4. Check for FADING (messages/week in last 30 days < 35% of peak 30 days)
  if (validMessages.length >= 15) {
    const { recentRate, peakRate } = calculate30DayActivityRates(validMessages, referenceTime);
    if (peakRate > 3 && recentRate < peakRate * 0.35) {
      return {
        chatId,
        type: "fading",
        score: 60,
        reason: `Activity dropped ${Math.round((1 - recentRate / peakRate) * 100)}% from peak (${recentRate.toFixed(1)}/wk vs ${peakRate.toFixed(1)}/wk)`,
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
