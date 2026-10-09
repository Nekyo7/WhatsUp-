import * as chrono from "chrono-node";
import type { Message, PromiseItem, PromiseStatus } from "@/types";

// Negative patterns: requests, non-commitments, conditionals, pure attendance
const NEGATIVE_PATTERNS = [
  /\blet me know\b/i,
  /\blet me see if\b/i,
  /\blet me check if\b/i,
  /\blet me think\b/i,
  /\bi'?ll be there\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwill you\b/i,
  /\bare you\b/i,
  /\bkya (?:tu|tum|aap)\b/i,
  /\bbhejega kya\b/i,
  /\bkarega kya\b/i,
  /\b(?:if|agar)\s+.*\b(?:karunga|bhejunga|dunga)\b/i, // conditional
];

// Positive commitment patterns
const COMMITMENT_REGEXES = [
  /\b(?:i'?ll|i will|let me|will do|give me till|i can send|i promise|will share|will upload|will send|will check and send|i am going to|i'll review|i'll ping|will update|will get back)\b/i,
  /\b(?:main kar dunga|mai kar dunga|kal bhej dunga|sham ko bhejta hu|aaj bhej dunga|dekh ke batata hu|karta hu|bhejta hu|share karta hu|pakka bhejta hu|de dunga|bhej dunga|ho jayega|kar dunga|dekh lenge|kal tak|kal subah|sham tak|thodi der mai|thodi der me|bhej rha hu|kar rha hu|mai karunga|mai bhejta hu|main bhejunga|main karunga|karunga|bhejunga)\b/i,
];

// Explicit completion cues from the sender
const EXPLICIT_COMPLETION_REGEXES = [
  /\b(?:bhej diya|kar diya|shared the|uploaded the|mailed the|sent the link|sent it|done with|completed the|ho gaya bhai|check karo|attached the|done)\b/i,
];

// Hinglish future vs past tense indicators
const FUTURE_VERB_REGEX = /\b(?:dunga|bhejunga|karunga|karta hu|bhejta hu|dega|karenge|bhejenge|later|baad me|evening|shaam|subah|tak|afternoon|tonight)\b/i;
const PAST_VERB_REGEX = /\b(?:bheja|kiya|tha|diya tha|bheja tha|gaya tha|dekha tha|hua tha|bhej diya|kar diya)\b/i;

/**
 * Disambiguates Hinglish "kal" and "parso" based on verb tense:
 * - Future verbs (dunga, bhejunga, karunga, etc.) -> tomorrow (+24h) or parso (+48h)
 * - Past verbs (bheja, kiya, tha, etc.) -> yesterday / past context (NOT a due date)
 * - Unclear -> null
 */
export function resolveHinglishDueDate(text: string, msgDate: Date): { dueAt: string | null; isAmbiguous: boolean } {
  const textLower = text.toLowerCase();
  const hasKal = /\bkal\b/i.test(textLower);
  const hasParso = /\bparso\b/i.test(textLower);

  if (!hasKal && !hasParso) {
    // Check for "thodi der me" or "aaj shaam"
    if (textLower.includes("thodi der mai") || textLower.includes("thodi der me")) {
      const d = new Date(msgDate.getTime() + 2 * 60 * 60 * 1000);
      return { dueAt: d.toISOString(), isAmbiguous: false };
    }
    if (textLower.includes("aaj shaam") || textLower.includes("tonight") || textLower.includes("today evening")) {
      const d = new Date(msgDate.getTime());
      d.setHours(19, 0, 0, 0);
      if (d.getTime() < msgDate.getTime()) {
        d.setDate(d.getDate() + 1);
      }
      return { dueAt: d.toISOString(), isAmbiguous: false };
    }
    return { dueAt: null, isAmbiguous: false };
  }

  const isPast = PAST_VERB_REGEX.test(textLower);
  const isFuture = FUTURE_VERB_REGEX.test(textLower);

  if (isPast && !isFuture) {
    // "kal bheja tha" -> past reference, not a future due date
    return { dueAt: null, isAmbiguous: false };
  }

  if (isFuture) {
    const daysToAdd = hasParso ? 2 : 1;
    const d = new Date(msgDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    d.setHours(18, 0, 0, 0); // Default to 6 PM
    return { dueAt: d.toISOString(), isAmbiguous: false };
  }

  // If both or neither match, it's ambiguous
  return { dueAt: null, isAmbiguous: true };
}

/**
 * Extracts explicit commitments made by the user in chat,
 * extracts deadlines using chrono-node and Hinglish tense resolution,
 * filters negative/non-commitment patterns, and tracks completion status.
 */
export function extractPromises(
  messages: Message[],
  selfName: string,
  referenceTime: Date = new Date()
): PromiseItem[] {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const promises: PromiseItem[] = [];

  for (let i = 0; i < validMessages.length; i++) {
    const msg = validMessages[i];
    if (msg.sender !== selfName) continue;

    const text = msg.text.trim();
    if (!text || text.length < 5) continue;

    // 1. Filter out quoted or forwarded text
    if (
      text.startsWith(">") ||
      text.startsWith('"') ||
      text.startsWith("“") ||
      text.startsWith("[Forwarded") ||
      text.toLowerCase().startsWith("forwarded")
    ) {
      continue;
    }

    // 2. Filter out questions
    if (text.endsWith("?") || text.includes("?")) {
      continue;
    }

    // 3. Filter out negative non-commitment patterns
    let isNegative = false;
    for (const negRegex of NEGATIVE_PATTERNS) {
      if (negRegex.test(text)) {
        isNegative = true;
        break;
      }
    }
    if (isNegative) continue;

    // 4. Test commitment patterns
    let isCommitment = false;
    let confidence = 0.75;

    for (const regex of COMMITMENT_REGEXES) {
      if (regex.test(text)) {
        isCommitment = true;
        confidence = 0.88;
        break;
      }
    }

    if (!isCommitment) continue;

    const msgDate = new Date(msg.timestamp);

    // 5. Extract deadline using Hinglish tense resolution or chrono-node
    let dueAt: string | null = null;
    try {
      const hinglishRes = resolveHinglishDueDate(text, msgDate);
      if (hinglishRes.dueAt) {
        dueAt = hinglishRes.dueAt;
        confidence = 0.95;
      } else if (!hinglishRes.isAmbiguous) {
        // Fallback to chrono-node for English temporal extraction
        const parsedDeadline = chrono.parseDate(text, msgDate, { forwardDate: true });
        if (parsedDeadline && parsedDeadline.getTime() > msgDate.getTime()) {
          dueAt = parsedDeadline.toISOString();
          confidence = Math.min(0.98, confidence + 0.08);
        }
      }
    } catch {
      // Fallback cleanly
    }

    // 6. Determine status: check if explicit completion was confirmed later in chat
    let status: PromiseStatus = "open";
    const daysSinceMsg = (referenceTime.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24);

    for (let j = i + 1; j < validMessages.length; j++) {
      const laterMsg = validMessages[j];
      if (laterMsg.sender === selfName) {
        for (const compRegex of EXPLICIT_COMPLETION_REGEXES) {
          if (compRegex.test(laterMsg.text)) {
            status = "done";
            break;
          }
        }
        if (status === "done") break;
      }
    }

    if (status === "open" && daysSinceMsg > 14) {
      status = "stale";
    }

    promises.push({
      id: `promise_${msg.id}`,
      chatId: msg.chatId,
      messageId: msg.id,
      text,
      sender: msg.sender,
      dueAt,
      status,
      confidence: Number(confidence.toFixed(2)),
      createdAt: msg.timestamp,
    });
  }

  return promises;
}

