import type { Message, Session } from "@/types";

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

export interface SessionAnalysisResult {
  sessions: Session[];
  estimatedTalkTimeMinutes: number;
  initiatorCounts: Record<string, number>;
  initiatorShareYou: number;
  initiatorShareThem: number;
}

/**
 * Groups messages into conversational sessions (gap > 30 mins starts a new session),
 * calculates estimated talk time and initiator shares.
 */
export function calculateSessionsAndTalkTime(
  messages: Message[],
  selfName: string
): SessionAnalysisResult {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validMessages.length === 0) {
    return {
      sessions: [],
      estimatedTalkTimeMinutes: 0,
      initiatorCounts: {},
      initiatorShareYou: 0.5,
      initiatorShareThem: 0.5,
    };
  }

  const sessions: Session[] = [];
  const initiatorCounts: Record<string, number> = {};

  let currentSessionStart = new Date(validMessages[0].timestamp).getTime();
  let currentSessionEnd = currentSessionStart;
  let currentSessionMsgCount = 1;
  let currentInitiator = validMessages[0].sender;

  initiatorCounts[currentInitiator] = (initiatorCounts[currentInitiator] || 0) + 1;

  for (let i = 1; i < validMessages.length; i++) {
    const msg = validMessages[i];
    const msgTime = new Date(msg.timestamp).getTime();
    const gap = msgTime - currentSessionEnd;

    if (gap > SESSION_GAP_MS) {
      // Close previous session
      sessions.push({
        chatId: validMessages[0].chatId,
        start: new Date(currentSessionStart).toISOString(),
        end: new Date(currentSessionEnd).toISOString(),
        messageCount: currentSessionMsgCount,
      });

      // Start new session
      currentSessionStart = msgTime;
      currentSessionEnd = msgTime;
      currentSessionMsgCount = 1;
      currentInitiator = msg.sender;
      initiatorCounts[currentInitiator] = (initiatorCounts[currentInitiator] || 0) + 1;
    } else {
      currentSessionEnd = msgTime;
      currentSessionMsgCount++;
    }
  }

  // Commit last session
  sessions.push({
    chatId: validMessages[0].chatId,
    start: new Date(currentSessionStart).toISOString(),
    end: new Date(currentSessionEnd).toISOString(),
    messageCount: currentSessionMsgCount,
  });

  // Calculate estimated talk time in minutes
  // For each session: duration + 1 minute per single isolated message buffer
  let totalMinutes = 0;
  for (const s of sessions) {
    const durationMins = (new Date(s.end).getTime() - new Date(s.start).getTime()) / (60 * 1000);
    // Baseline: if duration is 0 (single msg), count as 1 min; otherwise duration + 1 min buffer
    totalMinutes += Math.max(1, Math.round(durationMins) + 1);
  }

  const totalSessions = sessions.length || 1;
  const youInitiated = initiatorCounts[selfName] || 0;
  let themInitiated = 0;
  for (const [sender, count] of Object.entries(initiatorCounts)) {
    if (sender !== selfName) {
      themInitiated += count;
    }
  }

  const initiatorShareYou = totalSessions > 0 ? Number((youInitiated / totalSessions).toFixed(2)) : 0.5;
  const initiatorShareThem = totalSessions > 0 ? Number((themInitiated / totalSessions).toFixed(2)) : 0.5;

  return {
    sessions,
    estimatedTalkTimeMinutes: totalMinutes,
    initiatorCounts,
    initiatorShareYou,
    initiatorShareThem,
  };
}
