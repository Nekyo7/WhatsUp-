import * as chrono from "chrono-node";
import type { Message, PromiseItem, PromiseStatus } from "@/types";

const COMMITMENT_REGEXES = [
  /\b(?:i'?ll|i will|let me|will do|give me till|i can send|i promise|will share|will upload|will check|promise to|i am going to|i'll review|i'll ping|will update|will get back)\b/i,
  /\b(?:main kar dunga|mai kar dunga|kal bhej dunga|sham ko bhejta hu|aaj bhej dunga|dekh ke batata hu|karta hu|bhejta hu|share karta hu|pakka bhejta hu|de dunga|bhej dunga|ho jayega|kar dunga|dekh lenge|kal tak|kal subah|sham tak|thodi der mai|thodi der me|bhej rha hu|kar rha hu|mai karunga|mai bhejta hu)\b/i,
];

const EXPLICIT_COMPLETION_REGEXES = [
  /\b(?:bhej diya|kar diya|shared the|uploaded the|mailed the|sent the link|sent it|done with|completed the|ho gaya bhai|check karo|attached the)\b/i,
];

/**
 * Extracts explicit commitments made by the user in chat,
 * extracts deadlines using chrono-node, and tracks completion status.
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

    let isCommitment = false;
    let confidence = 0.7;

    for (const regex of COMMITMENT_REGEXES) {
      if (regex.test(text)) {
        isCommitment = true;
        confidence = 0.88;
        break;
      }
    }

    if (!isCommitment) continue;

    const msgDate = new Date(msg.timestamp);

    // Extract deadline with chrono-node relative to the message timestamp
    let dueAt: string | null = null;
    try {
      // Handle colloquial Hinglish temporal cues
      const textLower = text.toLowerCase();
      if (textLower.includes("kal bhej") || textLower.includes("kal tak") || textLower.includes("kal shaam")) {
        const d = new Date(msgDate.getTime() + 24 * 60 * 60 * 1000);
        d.setHours(18, 0, 0, 0);
        dueAt = d.toISOString();
        confidence = 0.95;
      } else if (textLower.includes("thodi der mai") || textLower.includes("thodi der me")) {
        const d = new Date(msgDate.getTime() + 2 * 60 * 60 * 1000);
        dueAt = d.toISOString();
        confidence = 0.9;
      } else {
        const parsedDeadline = chrono.parseDate(text, msgDate, { forwardDate: true });
        if (parsedDeadline && parsedDeadline.getTime() > msgDate.getTime()) {
          dueAt = parsedDeadline.toISOString();
          confidence = Math.min(0.98, confidence + 0.1);
        }
      }
    } catch {
      // Fallback
    }

    // Determine status: check if explicit completion was confirmed
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
