import type { Message, Platform, ImportReport } from "@/types";

export interface ParsedChatResult {
  chatId: string;
  title: string;
  platform: Platform;
  isGroup: boolean;
  participants: string[];
  messages: Message[];
  firstMessageAt: string;
  lastMessageAt: string;
  detectedSelfNameCandidate?: string;
  report?: ImportReport;
}

const SYSTEM_PHRASES = [
  "messages and calls are end-to-end encrypted",
  "messages to this chat and calls are now secured",
  "created group",
  "created this group",
  "added",
  "left",
  "removed",
  "changed the subject",
  "changed the group",
  "changed this group's icon",
  "changed the group description",
  "security code changed",
  "you're now an admin",
  "joined using this group's invite link",
  "disappearing messages",
  "started a call",
  "missed voice call",
  "missed video call",
  "waiting for this message. this may take a while",
  "pinned a message",
  "changed their phone number",
  "switched to a new phone number",
];

const MEDIA_PHRASES = [
  "<media omitted>",
  "image omitted",
  "video omitted",
  "audio omitted",
  "sticker omitted",
  "document omitted",
  "gif omitted",
  "contact card omitted",
  "(file attached)",
  "location:",
  "this message was deleted",
  "you deleted this message",
  "poll:",
];

const HINGLISH_KEYWORDS = [
  "bhai", "yaar", "kya", "haan", "nahi", "kar", "karna", "karega", "kardo",
  "bhej", "bheja", "dekh", "theek", "accha", "acha", "sahi", "aaj", "kal",
  "parso", "hoga", "raha", "rahe", "wala", "wali", "matlab", "kuch", "aisa",
  "samajh", "paise", "kaam", "abhy", "chal", "chalo", "sun", "are", "arre", "bc", "bhaiya",
  "pakka", "batata", "karenge", "bhejenge", "sham", "shaam", "subah", "raat"
];

export function detectLanguage(text: string): "en" | "hinglish" | "hi" | "other" {
  if (!text) return "en";
  // Check for Devanagari Unicode range
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let hinglishMatches = 0;
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, "");
    if (HINGLISH_KEYWORDS.includes(cleaned)) {
      hinglishMatches++;
    }
  }
  if (hinglishMatches >= 1 || (words.length > 2 && hinglishMatches / words.length > 0.15)) {
    return "hinglish";
  }
  return "en";
}

/**
 * Auto-detects whether date format is DD/MM/YY(YY) or MM/DD/YY(YY)
 * by scanning candidate date tokens across the entire export for values > 12.
 */
export function detectDateFormat(lines: string[]): "DMY" | "MDY" {
  let firstOver12 = 0;
  let secondOver12 = 0;

  const datePattern = /(?:^\[?|\s)(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/;

  // Check lines throughout the file for unambiguous days (> 12)
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/[\u200E\u200F\u202A-\u202E\u202F\u00A0\uFEFF]/g, " ");
    const match = cleanLine.match(datePattern);
    if (match) {
      const num1 = parseInt(match[1], 10);
      const num2 = parseInt(match[2], 10);
      if (num1 > 12 && num2 <= 12) {
        firstOver12++;
      } else if (num2 > 12 && num1 <= 12) {
        secondOver12++;
      }
    }
  }

  // Default to DMY (standard across India, UK, Europe, Latin America) unless clear MDY signal
  return secondOver12 > firstOver12 ? "MDY" : "DMY";
}

/**
 * Parses date and time components into a standard UTC ISO 8601 string.
 */
export function parseWhatsAppTimestamp(
  datePart: string,
  timePart: string,
  dateFormat: "DMY" | "MDY"
): string | null {
  try {
    const cleanDate = datePart.trim();
    const cleanTime = timePart.replace(/[\u202F\u00A0\uFEFF]/g, " ").trim();

    let year = 2024;
    let month = 1;
    let day = 1;

    // Check for ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = cleanDate.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      const dMatch = cleanDate.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
      if (!dMatch) return null;

      const num1 = parseInt(dMatch[1], 10);
      const num2 = parseInt(dMatch[2], 10);
      let num3 = parseInt(dMatch[3], 10);

      if (dateFormat === "MDY") {
        month = num1;
        day = num2;
      } else {
        day = num1;
        month = num2;
      }

      if (num3 < 100) {
        num3 += 2000;
      }
      year = num3;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Clean time part (e.g. "3:45:12 PM", "15:45", "03:45 pm", "3:45:12", "03.45 pm")
    const normalizedTime = cleanTime.replace(/\./g, ":");
    const tMatch = normalizedTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i);
    if (!tMatch) return null;

    let hours = parseInt(tMatch[1], 10);
    const minutes = parseInt(tMatch[2], 10);
    const seconds = tMatch[3] ? parseInt(tMatch[3], 10) : 0;
    const ampm = tMatch[4]?.toLowerCase();

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

/**
 * Robust WhatsApp text parser supporting:
 * - Square brackets format: [15/03/24, 3:45:12 PM] Sender: Message (iOS)
 * - Standard dash format: 15/03/2024, 15:45 - Sender: Message (Android)
 * - Dots format: 15.03.24, 15:45 - Sender: Message
 * - Phone numbers as senders: 15/03/24, 15:45 - +91 98765 43210: Message
 * - Multi-line message continuation
 * - Full system message filtering
 * - Detailed Import Report generation
 */
export function parseWhatsAppExport(fileContent: string, fileName: string): ParsedChatResult {
  const lines = fileContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const dateFormat = detectDateFormat(lines);

  // Universal regex matching both brackets and dash formats:
  // 1) [15/03/24, 11:42:15 AM] Sender: Text
  // 2) 15/03/24, 11:42 AM - Sender: Text
  // 3) 15/03/2024, 11:42 - Sender: Text
  // 4) 2024-03-15, 11:42 - Sender: Text
  // 5) 15.03.2024, 11:42 - Sender: Text
  const linePattern = /^(?:\[?(\d{1,4}[./\-]\d{1,2}[./\-]\d{2,4})[,\s]+(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[AaPp][Mm])?)\]?(?:\s*-\s*|\s+))([^:]+?)(?::\s*(.*)|$)/;

  const messages: Message[] = [];
  const participantsSet = new Set<string>();
  const senderCounts: Record<string, number> = {};
  const unparsedLines: string[] = [];
  let systemMessagesCount = 0;
  let mediaCount = 0;

  const chatId = "wa_" + Math.random().toString(36).substring(2, 9);
  let chatTitle = fileName.replace(/\.txt$/i, "").replace(/^WhatsApp Chat with /i, "").trim();
  if (!chatTitle) chatTitle = "WhatsApp Chat";

  let currentMsg: Message | null = null;
  let msgIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Strip zero-width, bidirectional, and special non-breaking space characters
    const line = rawLine
      .replace(/[\u200E\u200F\u202A-\u202E\uFEFF\u200B\u200C\u200D]/g, "")
      .replace(/[\u202F\u00A0]/g, " ")
      .trimEnd();

    if (!line) continue;

    const match = line.match(linePattern);

    if (match) {
      // Commit previous message
      if (currentMsg) {
        messages.push(currentMsg);
        currentMsg = null;
      }

      const dateStr = match[1];
      const timeStr = match[2];
      const possibleSender = match[3]?.trim();
      const content = match[4] !== undefined ? match[4].trim() : "";

      const parsedTs = parseWhatsAppTimestamp(dateStr, timeStr, dateFormat);
      const isoTimestamp = parsedTs || (messages.length > 0 ? messages[messages.length - 1].timestamp : new Date().toISOString());

      // Check if this is a system message:
      // In WhatsApp exports:
      // 1) Any timestamp line without a colon separating sender & content (content === "") is a system event
      // 2) Explicit system senders or specific system headers (calls, encryption notices)
      const lowerSender = possibleSender.toLowerCase();
      const lowerContent = content.toLowerCase();
      const isSystemNotice =
        content === "" ||
        lowerSender === "system" ||
        lowerSender === "whatsapp" ||
        lowerContent.includes("messages and calls are end-to-end encrypted") ||
        lowerContent.includes("security code changed") ||
        lowerContent.startsWith("missed voice call") ||
        lowerContent.startsWith("missed video call") ||
        lowerContent.includes("disappearing messages");

      if (isSystemNotice) {
        systemMessagesCount++;
        const fullText = (possibleSender + (content ? ": " + content : "")).trim();
        const isCall =
          fullText.toLowerCase().includes("missed voice call") ||
          fullText.toLowerCase().includes("missed video call") ||
          fullText.toLowerCase().includes("started a call");

        currentMsg = {
          id: `${chatId}_msg_${++msgIdx}`,
          chatId,
          sender: "System",
          timestamp: isoTimestamp,
          text: fullText,
          isSystem: true,
          isMedia: false,
          type: isCall ? "call" : "system",
          lang: "en",
        };
      } else {
        const sender = possibleSender;
        participantsSet.add(sender);
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;

        const isMedia = MEDIA_PHRASES.some((phrase) => lowerContent.includes(phrase));
        if (isMedia) mediaCount++;

        const isDeleted =
          lowerContent === "this message was deleted" ||
          lowerContent === "you deleted this message" ||
          lowerContent === "this message was deleted.";

        currentMsg = {
          id: `${chatId}_msg_${++msgIdx}`,
          chatId,
          sender,
          timestamp: isoTimestamp,
          text: content,
          isSystem: false,
          isMedia,
          type: isDeleted ? "deleted" : isMedia ? "media" : "text",
          lang: detectLanguage(content),
        };
      }
    } else {
      // Continuation of a multi-line message
      if (currentMsg) {
        currentMsg.text += "\n" + line;
        currentMsg.lang = detectLanguage(currentMsg.text);
      } else {
        // Line before any valid message header (e.g. metadata or corrupted header)
        unparsedLines.push(`L${i + 1}: ${line}`);
      }
    }
  }

  if (currentMsg) {
    messages.push(currentMsg);
  }

  const participants = Array.from(participantsSet);
  const isGroup = participants.length > 2 || chatTitle.toLowerCase().includes("group");

  // Determine likely self candidate (the one named "You" or the top sender)
  let detectedSelfNameCandidate = "";
  if (participants.includes("You")) {
    detectedSelfNameCandidate = "You";
  } else if (participants.length > 0) {
    detectedSelfNameCandidate = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || participants[0];
  }

  const firstMessageAt = messages[0]?.timestamp || new Date().toISOString();
  const lastMessageAt = messages[messages.length - 1]?.timestamp || new Date().toISOString();

  const warnings: string[] = [];
  if (unparsedLines.length > 0) {
    warnings.push(`${unparsedLines.length} lines could not be attributed to a timestamp header.`);
  }
  if (participants.length === 0) {
    warnings.push("No distinct participants found; this export may only contain system events.");
  }

  const report: ImportReport = {
    messagesParsed: messages.length,
    participantsFound: participants,
    dateRange: { start: firstMessageAt, end: lastMessageAt },
    systemMessagesSkipped: systemMessagesCount,
    mediaCount,
    unparsedLinesCount: unparsedLines.length,
    unparsedLinesSample: unparsedLines.slice(0, 5),
    warnings,
  };

  return {
    chatId,
    title: chatTitle,
    platform: "whatsapp",
    isGroup,
    participants,
    messages,
    firstMessageAt,
    lastMessageAt,
    detectedSelfNameCandidate,
    report,
  };
}
