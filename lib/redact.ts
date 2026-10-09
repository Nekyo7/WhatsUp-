import type { Message } from "@/types";

export interface RedactionResult {
  redactedMessages: {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
  }[];
  redactedExcerptText: string;
  nameMapping: Record<string, string>; // e.g. "Rohan Sharma" -> "Person B"
  reverseNameMapping: Record<string, string>; // e.g. "Person B" -> "Rohan Sharma"
  stats: {
    namesMaskedCount: number;
    phonesMaskedCount: number;
    emailsMaskedCount: number;
    urlsMaskedCount: number;
  };
}

// Regex patterns for PII detection
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}\b/g;
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Redacts contact names (in headers & text bodies), emails, phone numbers, and URLs.
 * Redaction is best-effort and local-only.
 */
export function redactMessages(
  messages: Message[],
  selfName: string,
  allParticipants: string[] = []
): RedactionResult {
  // 1. Build consistent pseudo-anonymous name mappings
  const nameMapping: Record<string, string> = {};
  const reverseNameMapping: Record<string, string> = {};

  // Self is always Person A (You)
  nameMapping[selfName] = "Person A (You)";
  reverseNameMapping["Person A (You)"] = selfName;
  reverseNameMapping["Person A"] = selfName;

  let personIndex = 1; // 1 -> B, 2 -> C, ...
  const getNextPersonCode = () => {
    const char = String.fromCharCode(65 + personIndex);
    personIndex++;
    return `Person ${char}`;
  };

  // Collect all unique senders from the batch + known participants
  const uniqueNames = new Set<string>();
  allParticipants.forEach((p) => uniqueNames.add(p));
  messages.forEach((m) => {
    if (m.sender && m.sender !== selfName) {
      uniqueNames.add(m.sender);
    }
  });

  uniqueNames.forEach((name) => {
    if (name && !nameMapping[name]) {
      const code = getNextPersonCode();
      nameMapping[name] = code;
      reverseNameMapping[code] = name;
    }
  });

  // Sort names by length descending to prevent sub-string collision replacements (e.g. "Alex Johnson" before "Alex")
  const sortedNames = Object.keys(nameMapping).sort((a, b) => b.length - a.length);

  let namesMaskedCount = 0;
  let phonesMaskedCount = 0;
  let emailsMaskedCount = 0;
  let urlsMaskedCount = 0;

  // 2. Redact text per message
  const redactedMessages = messages.map((msg) => {
    let text = msg.text || "";

    // Mask URLs first so internal tokens aren't broken
    text = text.replace(URL_REGEX, (url) => {
      urlsMaskedCount++;
      try {
        const parsed = new URL(url);
        return `[URL: ${parsed.hostname}]`;
      } catch {
        return "[URL: external-link]";
      }
    });

    // Mask Emails
    text = text.replace(EMAIL_REGEX, () => {
      emailsMaskedCount++;
      return "[EMAIL: hidden]";
    });

    // Mask Phone numbers (validating it looks like a real phone number length >= 8 digits)
    text = text.replace(PHONE_REGEX, (match) => {
      const digitsOnly = match.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        phonesMaskedCount++;
        return "[PHONE: masked]";
      }
      return match;
    });

    // Mask contact names appearing within the message body
    for (const rawName of sortedNames) {
      if (!rawName || rawName.trim().length < 2) continue;
      // Match full name
      const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nameRegex = new RegExp(`\\b${escaped}\\b`, "gi");
      if (nameRegex.test(text)) {
        namesMaskedCount++;
        text = text.replace(nameRegex, nameMapping[rawName]);
      }

      // If name has multiple words (e.g. "Rohan Sharma"), also mask first name if unique
      const firstName = rawName.split(" ")[0];
      if (
        firstName &&
        firstName.length > 2 &&
        firstName !== rawName &&
        !sortedNames.some((other) => other !== rawName && other.startsWith(firstName))
      ) {
        const escapedFirst = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const firstRegex = new RegExp(`\\b${escapedFirst}\\b`, "gi");
        if (firstRegex.test(text)) {
          namesMaskedCount++;
          text = text.replace(firstRegex, nameMapping[rawName]);
        }
      }
    }

    const maskedSender = nameMapping[msg.sender] || msg.sender;

    return {
      id: msg.id,
      sender: maskedSender,
      text,
      timestamp: msg.timestamp,
    };
  });

  // Construct formatted excerpt string
  const excerptLines = redactedMessages.map(
    (m) => `[${new Date(m.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}] ${m.sender}: ${m.text}`
  );

  return {
    redactedMessages,
    redactedExcerptText: excerptLines.join("\n"),
    nameMapping,
    reverseNameMapping,
    stats: {
      namesMaskedCount,
      phonesMaskedCount,
      emailsMaskedCount,
      urlsMaskedCount,
    },
  };
}

/**
 * Replaces "Person A", "Person B", etc. back to real contact names client-side for user display.
 */
export function unredactText(text: string, reverseNameMapping: Record<string, string>): string {
  if (!text || !reverseNameMapping) return text;
  let unredacted = text;

  // Sort keys descending so "Person A (You)" is replaced before "Person A"
  const keys = Object.keys(reverseNameMapping).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const realName = reverseNameMapping[key];
    if (realName) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      unredacted = unredacted.replace(new RegExp(escaped, "g"), realName);
    }
  }

  return unredacted;
}
