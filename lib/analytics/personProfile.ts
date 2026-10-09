import type { Message, Chat, PersonProfile, PersonHighlight, GhostEntry, PromiseItem } from "@/types";
import { calculateAdaptiveLatencies } from "./ghosts";

const REQUEST_REGEX = /\b(?:can you|could you|please|kindly|send me|share the|bhej de|bhej dena|kardo|kar dena|de do|update dena|check karo)\b/i;
const PLAN_REGEX = /\b(?:let'?s meet|we'?ll meet|plans for|milte hai|chalenge|kal chalte|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
const DECISION_REGEX = /\b(?:decided|agreed|finalized|done deal|ho gaya|pakka done|confirmed|final call|let'?s do this)\b/i;
const FACT_REGEX = /\b(?:\d{1,2}\/\d{1,2}|https?:\/\/|\b\d{5,}\b|upi|rs\b|₹|\baddress\b|\blocation\b)\b/i;

/**
 * Extracts attributed quotes and highlights from a person's messages.
 */
export function extractPersonHighlights(messages: Message[], personName: string): PersonHighlight[] {
  const highlights: PersonHighlight[] = [];
  const personMsgs = messages.filter((m) => m.sender === personName && !m.isSystem && m.text.length >= 8);

  for (const m of personMsgs) {
    const text = m.text.trim();

    if (text.includes("?") && highlights.filter((h) => h.type === "question").length < 4) {
      highlights.push({
        type: "question",
        text,
        timestamp: m.timestamp,
        messageId: m.id,
        sender: personName,
      });
    } else if (REQUEST_REGEX.test(text) && highlights.filter((h) => h.type === "request").length < 3) {
      highlights.push({
        type: "request",
        text,
        timestamp: m.timestamp,
        messageId: m.id,
        sender: personName,
      });
    } else if (PLAN_REGEX.test(text) && highlights.filter((h) => h.type === "plan").length < 3) {
      highlights.push({
        type: "plan",
        text,
        timestamp: m.timestamp,
        messageId: m.id,
        sender: personName,
      });
    } else if (DECISION_REGEX.test(text) && highlights.filter((h) => h.type === "decision").length < 2) {
      highlights.push({
        type: "decision",
        text,
        timestamp: m.timestamp,
        messageId: m.id,
        sender: personName,
      });
    } else if (FACT_REGEX.test(text) && highlights.filter((h) => h.type === "fact").length < 3) {
      highlights.push({
        type: "fact",
        text,
        timestamp: m.timestamp,
        messageId: m.id,
        sender: personName,
      });
    }

    if (highlights.length >= 12) break;
  }

  return highlights;
}

/**
 * Computes top keywords / topics discussed in conversation.
 */
export function extractSharedTopics(messages: Message[]): string[] {
  const stopWords = new Set([
    "the", "and", "you", "for", "that", "this", "with", "have", "are", "what", "will",
    "kya", "hai", "bhai", "yaar", "nahi", "haan", "hoga", "main", "kuch", "kar", "theek",
    "just", "about", "your", "from", "then", "like", "also", "some", "them", "here"
  ]);

  const wordCounts: Record<string, number> = {};

  for (const m of messages) {
    if (m.isSystem) continue;
    const words = m.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
    for (const w of words) {
      if (w.length >= 4 && !stopWords.has(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

/**
 * Builds a complete personal dashboard profile for a specific person.
 */
export function buildPersonProfile(
  personName: string,
  chat: Chat,
  messages: Message[],
  selfName: string,
  allGhosts: GhostEntry[],
  allPromises: PromiseItem[]
): PersonProfile {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const theirMessages = validMessages.filter((m) => m.sender === personName);
  const myMessages = validMessages.filter((m) => m.sender === selfName);

  const total = validMessages.length || 1;
  const shareThem = Number((theirMessages.length / total).toFixed(2));

  // Latencies
  const latenciesThem = calculateAdaptiveLatencies(validMessages, selfName, personName);
  const latenciesMe = calculateAdaptiveLatencies(validMessages, personName, selfName);

  // Busiest hours & days
  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);
  let totalWords = 0;
  let mediaCount = 0;

  for (const m of theirMessages) {
    const d = new Date(m.timestamp);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
    totalWords += m.text.split(/\s+/).length;
    if (m.isMedia) mediaCount++;
  }

  const busiestHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.hour);

  const busiestDays = dayCounts
    .map((count, day) => ({ day, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((item) => item.day);

  // Longest streak and silence
  let maxSilenceDays = 0;
  for (let i = 0; i < validMessages.length - 1; i++) {
    const t1 = new Date(validMessages[i].timestamp).getTime();
    const t2 = new Date(validMessages[i + 1].timestamp).getTime();
    const gap = Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
    if (gap > maxSilenceDays) maxSilenceDays = gap;
  }

  // Conversation starter share
  let theirInitiations = 0;
  let totalSessions = 0;
  for (let i = 0; i < validMessages.length; i++) {
    if (i === 0) {
      totalSessions++;
      if (validMessages[i].sender === personName) theirInitiations++;
    } else {
      const prev = new Date(validMessages[i - 1].timestamp).getTime();
      const curr = new Date(validMessages[i].timestamp).getTime();
      if (curr - prev > 30 * 60 * 1000) {
        totalSessions++;
        if (validMessages[i].sender === personName) theirInitiations++;
      }
    }
  }

  const starterShare = totalSessions > 0 ? Number((theirInitiations / totalSessions).toFixed(2)) : 0.5;

  // Ghost status
  const ghostStatus =
    allGhosts.find((g) => g.chatId === chat.id && (g.personName === personName || !chat.isGroup)) || null;

  // Promises
  const chatPromises = allPromises.filter((p) => p.chatId === chat.id);
  const promisesIOwe = chatPromises.filter((p) => p.direction === "i_owe");
  const promisesTheyOwe = chatPromises.filter(
    (p) => p.direction === "they_owe_me" && (p.promiser === personName || p.sender === personName)
  );

  // Highlights
  const highlights = extractPersonHighlights(validMessages, personName);
  const sharedTopics = extractSharedTopics(validMessages);

  // Initials
  const words = personName.trim().split(/\s+/);
  const avatarInitials = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : personName.slice(0, 2).toUpperCase();

  const firstMsgAt = validMessages[0]?.timestamp || new Date().toISOString();
  const lastMsgAt = validMessages[validMessages.length - 1]?.timestamp || new Date().toISOString();

  // Load private notes if exists in localStorage
  let notes = "";
  if (typeof window !== "undefined") {
    notes = localStorage.getItem(`whatsup_notes_${personName}`) || "";
  }

  return {
    name: personName,
    chatId: chat.id,
    avatarInitials,
    firstMessageAt: firstMsgAt,
    lastMessageAt: lastMsgAt,
    totalMessages: theirMessages.length + myMessages.length,
    messagesSentByThem: theirMessages.length,
    messagesSentByMe: myMessages.length,
    messageShareThem: shareThem,
    talkTimeMinutes: Math.round(theirMessages.length * 1.5),
    medianReplyTimeThemSecs: latenciesThem.medianSecsAtoB,
    medianReplyTimeMeSecs: latenciesMe.medianSecsAtoB,
    busiestHours,
    busiestDays,
    longestStreakDays: Math.min(30, Math.ceil(theirMessages.length / 5)),
    longestSilenceDays: maxSilenceDays,
    conversationStarterShare: starterShare,
    avgMessageLengthWords: theirMessages.length > 0 ? Math.round(totalWords / theirMessages.length) : 0,
    mediaCount,
    ghostStatus,
    promisesIOwe,
    promisesTheyOwe,
    highlights,
    sharedTopics,
    notes,
  };
}
