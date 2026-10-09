import type { Message } from "@/types";
import { detectLanguage, type ParsedChatResult } from "./whatsapp";

interface TelegramTextEntity {
  type: string;
  text: string;
}

interface TelegramRawMessage {
  id: number;
  type: string;
  date: string;
  date_unixtime?: string;
  from?: string;
  from_id?: string;
  actor?: string;
  action?: string;
  text: string | (string | TelegramTextEntity)[];
  media_type?: string;
  photo?: string;
  file?: string;
}

interface TelegramRawExport {
  name: string;
  type: string;
  id: number;
  messages: TelegramRawMessage[];
}

function extractTelegramText(textField: string | (string | TelegramTextEntity)[]): string {
  if (typeof textField === "string") return textField;
  if (Array.isArray(textField)) {
    return textField
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.text) return item.text;
        return "";
      })
      .join("");
  }
  return "";
}

export function parseTelegramExport(jsonContent: string, fileName: string): ParsedChatResult {
  const data = JSON.parse(jsonContent) as TelegramRawExport;
  const chatId = "tg_" + (data.id ? String(Math.abs(data.id)) : Math.random().toString(36).substring(2, 9));
  const chatTitle = data.name || fileName.replace(/\.json$/i, "");
  const isGroup = data.type !== "personal_chat" && data.type !== "saved_messages";

  const messages: Message[] = [];
  const participantsSet = new Set<string>();
  const senderCounts: Record<string, number> = {};

  let msgIdx = 0;

  for (const rawMsg of data.messages || []) {
    const rawSender = rawMsg.from || rawMsg.actor || "System";
    const isSystem = rawMsg.type === "service" || rawMsg.action !== undefined || !rawMsg.from;
    const text = extractTelegramText(rawMsg.text);
    const isMedia = Boolean(rawMsg.media_type || rawMsg.photo || rawMsg.file);

    let isoTimestamp: string;
    try {
      isoTimestamp = new Date(rawMsg.date).toISOString();
    } catch {
      isoTimestamp = new Date().toISOString();
    }

    if (!isSystem && rawSender !== "System") {
      participantsSet.add(rawSender);
      senderCounts[rawSender] = (senderCounts[rawSender] || 0) + 1;
    }

    messages.push({
      id: `${chatId}_msg_${rawMsg.id || ++msgIdx}`,
      chatId,
      sender: isSystem ? "System" : rawSender,
      timestamp: isoTimestamp,
      text: text || (isMedia ? `<Media: ${rawMsg.media_type || "file"}>` : ""),
      isSystem,
      isMedia,
      lang: detectLanguage(text),
    });
  }

  const participants = Array.from(participantsSet);
  let detectedSelfNameCandidate = "";
  if (participants.length > 0) {
    detectedSelfNameCandidate = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || participants[0];
  }

  const firstMessageAt = messages[0]?.timestamp || new Date().toISOString();
  const lastMessageAt = messages[messages.length - 1]?.timestamp || new Date().toISOString();

  return {
    chatId,
    title: chatTitle,
    platform: "telegram",
    isGroup,
    participants,
    messages,
    firstMessageAt,
    lastMessageAt,
    detectedSelfNameCandidate,
  };
}
