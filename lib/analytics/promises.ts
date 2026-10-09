import * as chrono from "chrono-node";
import type { Message, PromiseItem, PromiseStatus, PromiseDirection, PromiseResolution } from "@/types";

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
  /\bi won'?t\b/i,
  /\bwould send if\b/i,
];

// Positive commitment patterns
const COMMITMENT_REGEXES = [
  /\b(?:i'?ll|i will|let me|will do|give me till|i can send|i promise|will share|will upload|will send|will check and send|i am going to|i'll review|i'll ping|will update|will get back|we'll meet|i'll pay|will transfer)\b/i,
  /\b(?:main kar dunga|mai kar dunga|kal bhej dunga|sham ko bhejta hu|aaj bhej dunga|dekh ke batata hu|karta hu|bhejta hu|share karta hu|pakka bhejta hu|de dunga|bhej dunga|ho jayega|kar dunga|dekh lenge|kal tak|kal subah|sham tak|thodi der mai|thodi der me|bhej rha hu|kar rha hu|mai karunga|mai bhejta hu|main bhejunga|main karunga|karunga|bhejunga|pakka|promise kar raha|kar dungi|bhej dungi)\b/i,
];

// Explicit completion cues from the sender
const EXPLICIT_COMPLETION_REGEXES = [
  /\b(?:bhej diya|kar diya|shared the|uploaded the|mailed the|sent the link|sent it|done with|completed the|ho gaya bhai|check karo|attached the|done|paid|transferred|here you go|here it is)\b/i,
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
 * Extracts explicit commitments made in chat (both directions: I owe vs They owe me),
 * extracts deadlines using chrono-node and Hinglish tense resolution,
 * filters negative/non-commitment patterns, tracks completion resolution,
 * and incorporates user overrides.
 */
export function extractPromises(
  messages: Message[],
  selfName: string,
  referenceTime?: Date,
  userOverrides?: Record<string, "kept" | "dismissed" | "wrong">
): PromiseItem[] {
  const validMessages = messages
    .filter((m) => !m.isSystem)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validMessages.length === 0) return [];

  const effectiveRefTime = referenceTime || new Date(validMessages[validMessages.length - 1].timestamp);
  const promises: PromiseItem[] = [];

  for (let i = 0; i < validMessages.length; i++) {
    const msg = validMessages[i];
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

    const isFromMe = msg.sender === selfName;
    const direction: PromiseDirection = isFromMe ? "i_owe" : "they_owe_me";
    const otherParticipant = validMessages.find((m) => m.sender !== msg.sender)?.sender || (isFromMe ? "Others" : selfName);

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

    // 6. Determine resolution: check if explicit completion was confirmed later in chat
    let status: PromiseStatus = "open";
    let resolution: PromiseResolution = "open";
    let evidenceText = `Promised on ${msgDate.toLocaleDateString()}`;

    const daysSinceMsg = (effectiveRefTime.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24);

    for (let j = i + 1; j < validMessages.length; j++) {
      const laterMsg = validMessages[j];
      // Completion cue must come from the person who made the promise
      if (laterMsg.sender === msg.sender) {
        for (const compRegex of EXPLICIT_COMPLETION_REGEXES) {
          if (compRegex.test(laterMsg.text) || laterMsg.isMedia) {
            status = "done";
            resolution = "kept";
            evidenceText = `Completed in follow-up message: "${laterMsg.text.slice(0, 60)}"`;
            break;
          }
        }
        if (status === "done") break;
      }
    }

    if (status === "open") {
      if (dueAt && new Date(dueAt).getTime() < effectiveRefTime.getTime()) {
        resolution = "overdue";
        evidenceText = `Due date passed on ${new Date(dueAt).toLocaleDateString()} without completion cue`;
      } else if (daysSinceMsg > 14) {
        status = "stale";
        resolution = "broken";
        evidenceText = `Unresolved after ${Math.floor(daysSinceMsg)} days of silence`;
      } else {
        resolution = "open";
        evidenceText = dueAt ? `Due by ${new Date(dueAt).toLocaleDateString()}` : `Open commitment`;
      }
    }

    const promiseId = `promise_${msg.id}`;

    // Apply any user override
    const override = userOverrides ? userOverrides[promiseId] : null;
    if (override === "kept") {
      status = "done";
      resolution = "kept";
      evidenceText = "Marked as kept by user";
    } else if (override === "dismissed") {
      status = "done";
      evidenceText = "Dismissed by user";
    }

    promises.push({
      id: promiseId,
      chatId: msg.chatId,
      messageId: msg.id,
      text,
      sender: msg.sender,
      promiser: msg.sender,
      promisee: otherParticipant,
      direction,
      dueAt,
      status,
      resolution,
      confidence: Number(confidence.toFixed(2)),
      evidence: evidenceText,
      userOverride: override || null,
      createdAt: msg.timestamp,
    });
  }

  return promises;
}

/**
 * Standalone heuristic evaluator for a single message text candidate.
 * Used by /api/confirm-promise as an intelligent offline/fallback validator.
 */
export function analyzePromiseCandidate(
  text: string,
  referenceDate: Date = new Date()
): {
  isPromise: boolean;
  promiseText: string;
  dueAt: string | null;
  confidence: number;
  reasoning: string;
} {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 5) {
    return {
      isPromise: false,
      promiseText: trimmed,
      dueAt: null,
      confidence: 0.1,
      reasoning: "Text is too short to be a meaningful commitment.",
    };
  }

  // Filter out quoted or forwarded text
  if (
    trimmed.startsWith(">") ||
    trimmed.startsWith('"') ||
    trimmed.startsWith("“") ||
    trimmed.startsWith("[Forwarded") ||
    trimmed.toLowerCase().startsWith("forwarded")
  ) {
    return {
      isPromise: false,
      promiseText: trimmed,
      dueAt: null,
      confidence: 0.1,
      reasoning: "Quoted or forwarded content is not a first-person commitment.",
    };
  }

  // Filter out questions
  if (trimmed.endsWith("?") || trimmed.includes("?")) {
    return {
      isPromise: false,
      promiseText: trimmed,
      dueAt: null,
      confidence: 0.1,
      reasoning: "Question or inquiry, not a declaration of commitment.",
    };
  }

  // Filter out negative non-commitments
  for (const neg of NEGATIVE_PATTERNS) {
    if (neg.test(trimmed)) {
      return {
        isPromise: false,
        promiseText: trimmed,
        dueAt: null,
        confidence: 0.1,
        reasoning: "Contains non-commitment or conditional pattern.",
      };
    }
  }

  // Test positive commitment patterns
  let isCommitment = false;
  let confidence = 0.75;
  for (const regex of COMMITMENT_REGEXES) {
    if (regex.test(trimmed)) {
      isCommitment = true;
      confidence = 0.88;
      break;
    }
  }

  if (!isCommitment) {
    return {
      isPromise: false,
      promiseText: trimmed,
      dueAt: null,
      confidence: 0.2,
      reasoning: "No explicit first-person commitment patterns detected.",
    };
  }

  // Extract deadline
  let dueAt: string | null = null;
  try {
    const hinglishRes = resolveHinglishDueDate(trimmed, referenceDate);
    if (hinglishRes.dueAt) {
      dueAt = hinglishRes.dueAt;
      confidence = 0.95;
    } else if (!hinglishRes.isAmbiguous) {
      const parsedDeadline = chrono.parseDate(trimmed, referenceDate, { forwardDate: true });
      if (parsedDeadline && parsedDeadline.getTime() > referenceDate.getTime()) {
        dueAt = parsedDeadline.toISOString();
        confidence = Math.min(0.98, confidence + 0.08);
      }
    }
  } catch {
    // fallback cleanly
  }

  return {
    isPromise: true,
    promiseText: trimmed,
    dueAt,
    confidence: Number(confidence.toFixed(2)),
    reasoning: "Detected first-person commitment via keyword heuristic.",
  };
}

