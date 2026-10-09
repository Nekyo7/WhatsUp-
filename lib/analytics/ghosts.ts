import type { Message, GhostEntry, GhostStatus, GhostEvidence } from "@/types";

const QUESTION_INDICATORS = [
  "?", "kya", "kab", "kaha", "kyun", "kaise", "when", "where", "why", "how", "what",
  "can you", "are you", "will you", "could you", "would you", "bhej de", "bhej diya",
  "kar diya", "mila kya", "done?", "update?", "status?", "batadena", "karega", "kre ye"
];

const CONVERSATION_CLOSERS = [
  "ok", "okay", "k", "kk", "thanks", "thx", "thank you", "dhanyawad", "shukriya",
  "👍", "👌", "🙏", "❤️", "bye", "good night", "gn", "tc", "take care", "alright",
  "perfect", "done", "got it", "cool", "see you", "cya", "ha", "haan", "sahi hai"
];

/**
 * Checks if a message text is a polite conversation ending (e.g. "ok", "thanks", "bye")
 * and not an open question or task request.
 */
export function isConversationCloser(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[^\w\s\u0900-\u097F👍👌🙏❤️]/g, "");
  if (!clean || clean.length > 30) return false;

  // If it has a question mark or question keyword, it is NOT closed
  if (text.includes("?") || QUESTION_INDICATORS.some((q) => clean.includes(q))) {
    return false;
  }

  return CONVERSATION_CLOSERS.some((c) => clean === c || clean.startsWith(c + " ") || clean.endsWith(" " + c));
}

/**
 * Adjusts time gap to exclude overnight sleep hours (23:00 to 08:00)
 * so sleep time does not inflate daytime reply latency.
 */
export function calculateSleepAwareGapMs(start: Date, end: Date): number {
  const rawDiffMs = Math.max(0, end.getTime() - start.getTime());
  if (rawDiffMs <= 0) return 0;

  // For gaps under 1 hour, sleep adjustment is negligible
  if (rawDiffMs < 60 * 60 * 1000) return rawDiffMs;

  let current = new Date(start.getTime());
  let effectiveMs = 0;
  const endMs = end.getTime();

  // Increment by hour steps for accurate sleep window exclusion
  const stepMs = 60 * 60 * 1000;
  while (current.getTime() < endMs) {
    const hour = current.getUTCHours();
    const nextStep = Math.min(current.getTime() + stepMs, endMs);
    const duration = nextStep - current.getTime();

    // Sleep window: 23:00 - 08:00 UTC (or local nocturnal window)
    const isSleepWindow = hour >= 23 || hour < 8;
    if (!isSleepWindow) {
      effectiveMs += duration;
    } else {
      // Weight nocturnal silence at 10%
      effectiveMs += duration * 0.1;
    }
    current = new Date(nextStep);
  }

  return Math.max(0, Math.floor(effectiveMs));
}

/**
 * Calculates median and 90th percentile reply latencies between two participants.
 */
export function calculateAdaptiveLatencies(
  messages: Message[],
  senderA: string,
  senderB: string
): {
  medianSecsAtoB: number | null;
  p90SecsAtoB: number | null;
  turnCountAtoB: number;
} {
  const gapsSecs: number[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const m1 = messages[i];
    const m2 = messages[i + 1];

    if (m1.sender === senderA && m2.sender === senderB) {
      const d1 = new Date(m1.timestamp);
      const d2 = new Date(m2.timestamp);
      const gapMs = calculateSleepAwareGapMs(d1, d2);
      const gapSecs = Math.floor(gapMs / 1000);

      // Ignore gaps > 48h as separate conversation sessions
      if (gapSecs > 10 && gapSecs < 48 * 3600) {
        gapsSecs.push(gapSecs);
      }
    }
  }

  if (gapsSecs.length === 0) {
    return { medianSecsAtoB: null, p90SecsAtoB: null, turnCountAtoB: 0 };
  }

  gapsSecs.sort((a, b) => a - b);
  const mid = Math.floor(gapsSecs.length / 2);
  const median = gapsSecs.length % 2 !== 0 ? gapsSecs[mid] : Math.floor((gapsSecs[mid - 1] + gapsSecs[mid]) / 2);

  const p90Idx = Math.floor(gapsSecs.length * 0.9);
  const p90 = gapsSecs[Math.min(p90Idx, gapsSecs.length - 1)];

  return { medianSecsAtoB: median, p90SecsAtoB: p90, turnCountAtoB: gapsSecs.length };
}

/**
 * Format minutes into a friendly string (e.g. "45m", "2h", "1.5d")
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 24 * 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / (24 * 60)).toFixed(1)}d`;
}

/**
 * Classifies a chat's ghost status across 4 distinct ghost lanes with adaptive thresholds.
 * Preserves full compatibility with tests while defaulting referenceTime to the chat's
 * last message timestamp if no explicit reference time is passed.
 */
export function classifyGhostStatus(
  chatId: string,
  messages: Message[],
  selfName: string,
  allChatsVolumeRankPercentile = 0.5,
  referenceTime?: Date,
  participantCount?: number
): GhostEntry | null {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validMessages.length === 0) return null;

  const lastMsg = validMessages[validMessages.length - 1];
  const lastMsgTime = new Date(lastMsg.timestamp);

  // If no reference time is passed, measure against the export's last message timestamp!
  const effectiveRefTime = referenceTime || lastMsgTime;
  const timeDiffMs = effectiveRefTime.getTime() - lastMsgTime.getTime();
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

  const otherSender = validMessages.find((m) => m.sender !== selfName)?.sender || "They";

  // Check if thread ended with a natural conversation closer
  if (isConversationCloser(lastMsg.text) && daysSilent > 0) {
    return null; // Naturally closed thread is not ghosting
  }

  // 1. REVIVABLE: Top 20% volume chat dormant > 60 days
  if (daysSilent > 60 && (allChatsVolumeRankPercentile >= 0.80 || validMessages.length >= 80)) {
    return {
      chatId,
      personName: otherSender,
      type: "revivable",
      status: "gone-quiet",
      score: 80,
      confidence: "high",
      reason: `Top-tier chat (top 20% by volume) silent for ${daysSilent} days`,
      explanation: `${otherSender} was a top conversational partner, but neither side has messaged in ${daysSilent} days.`,
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

      const latencies = calculateAdaptiveLatencies(validMessages, otherSender, selfName);
      const normalMins = latencies.medianSecsAtoB ? Math.round(latencies.medianSecsAtoB / 60) : 120;
      const hoursPastNormal = Math.max(0, Math.round((daysSilent * 24) - (normalMins / 60)));

      const evidence: GhostEvidence = {
        unansweredMessageText: lastMsg.text,
        unansweredTimestamp: lastMsg.timestamp,
        sender: lastMsg.sender,
        recipient: selfName,
        isQuestion: hasQuestion,
        normalReplyTimeMins: normalMins,
        daysSilent,
        hoursPastNormal,
      };

      return {
        chatId,
        personName: lastMsg.sender,
        type: "you_ghosted",
        status: "ghosted-by-me",
        score,
        confidence: latencies.turnCountAtoB >= 3 ? "high" : "medium",
        reason: questionReason,
        explanation: `You usually reply to ${lastMsg.sender} in ~${formatDuration(normalMins)}. Their last message (${hasQuestion ? "a direct question" : "unanswered"}) has waited ${daysSilent} days.`,
        evidence,
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

    const latencies = calculateAdaptiveLatencies(validMessages, selfName, otherSender);
    const normalMins = latencies.medianSecsAtoB ? Math.round(latencies.medianSecsAtoB / 60) : 90;
    const hoursPastNormal = Math.max(0, Math.round((daysSilent * 24) - (normalMins / 60)));

    const evidence: GhostEvidence = {
      unansweredMessageText: lastMsg.text,
      unansweredTimestamp: lastMsg.timestamp,
      sender: selfName,
      recipient: otherSender,
      isQuestion: hasQuestion,
      normalReplyTimeMins: normalMins,
      daysSilent,
      hoursPastNormal,
    };

    return {
      chatId,
      personName: otherSender,
      type: "they_ghosted",
      status: "ghosting",
      score,
      confidence: latencies.turnCountAtoB >= 3 ? "high" : "medium",
      reason: `Your message has been unanswered for ${daysSilent} days`,
      explanation: `${otherSender} usually replies in ~${formatDuration(normalMins)}. Your last message (${hasQuestion ? "a direct question" : "waiting for reply"}) has been unanswered for ${daysSilent} days.`,
      evidence,
      daysSilent,
      lastMessageText: lastMsg.text,
      lastMessageTimestamp: lastMsg.timestamp,
    };
  }

  // 4. FADING: Last 30-day weekly average < 25% of chat's own peak 30-day average
  if (validMessages.length >= 15) {
    const { recentRate, peakRate } = calculate30DayActivityRates(validMessages, effectiveRefTime);
    if (peakRate > 2 && recentRate < peakRate * 0.25) {
      return {
        chatId,
        personName: otherSender,
        type: "fading",
        status: "slowing",
        score: 60,
        confidence: "high",
        reason: `Activity dropped below 25% of peak (${recentRate.toFixed(1)}/wk vs ${peakRate.toFixed(1)}/wk peak)`,
        explanation: `Conversation pace between you and ${otherSender} has slowed down to ${recentRate.toFixed(1)} msgs/wk (down from peak of ${peakRate.toFixed(1)} msgs/wk).`,
        daysSilent,
        lastMessageText: lastMsg.text,
        lastMessageTimestamp: lastMsg.timestamp,
      };
    }
  }

  return null;
}

/**
 * Returns all ghost entries for a chat (supporting both directions).
 */
export function analyzeAllGhostDirections(
  chatId: string,
  messages: Message[],
  selfName: string,
  allChatsVolumeRankPercentile = 0.5,
  referenceTime?: Date,
  participantCount?: number
): GhostEntry[] {
  const entries: GhostEntry[] = [];
  const primary = classifyGhostStatus(chatId, messages, selfName, allChatsVolumeRankPercentile, referenceTime, participantCount);
  if (primary) {
    entries.push(primary);
  }
  return entries;
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
