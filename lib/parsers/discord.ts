import type { Message } from "@/types";
import { detectLanguage, type ParsedChatResult } from "./whatsapp";

interface DiscordRawMessage {
  id: string;
  type?: string;
  timestamp: string;
  author?: {
    id: string;
    name: string;
    nickname?: string;
    isBot?: boolean;
  };
  content: string;
  attachments?: { id: string; url: string; fileName: string }[];
}

interface DiscordRawExport {
  guild?: { id: string; name: string };
  channel?: { id: string; name: string; type?: string };
  messages: DiscordRawMessage[];
}

export function parseDiscordExport(jsonContent: string, fileName: string): ParsedChatResult {
  const data = JSON.parse(jsonContent) as DiscordRawExport;
  const channelName = data.channel?.name || fileName.replace(/\.json$/i, "");
  const guildName = data.guild?.name ? `${data.guild.name} / ` : "";
  const chatTitle = `${guildName}#${channelName}`.trim();
  const chatId = "dc_" + (data.channel?.id || Math.random().toString(36).substring(2, 9));

  const messages: Message[] = [];
  const participantsSet = new Set<string>();
  const senderCounts: Record<string, number> = {};

  let msgIdx = 0;

  for (const rawMsg of data.messages || []) {
    const sender = rawMsg.author?.nickname || rawMsg.author?.name || "System";
    const isBot = Boolean(rawMsg.author?.isBot);
    const isSystem = rawMsg.type !== "Default" && rawMsg.type !== "0" && !rawMsg.author;
    const content = rawMsg.content || "";
    const hasAttachments = Boolean(rawMsg.attachments && rawMsg.attachments.length > 0);

    let isoTimestamp: string;
    try {
      isoTimestamp = new Date(rawMsg.timestamp).toISOString();
    } catch {
      isoTimestamp = new Date().toISOString();
    }

    if (!isSystem && !isBot && sender !== "System") {
      participantsSet.add(sender);
      senderCounts[sender] = (senderCounts[sender] || 0) + 1;
    }

    messages.push({
      id: `${chatId}_msg_${rawMsg.id || ++msgIdx}`,
      chatId,
      sender: isSystem ? "System" : sender,
      timestamp: isoTimestamp,
      text: content || (hasAttachments ? `<Attachment: ${rawMsg.attachments?.[0]?.fileName || "file"}>` : ""),
      isSystem,
      isMedia: hasAttachments,
      lang: detectLanguage(content),
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
    platform: "discord",
    isGroup: true,
    participants,
    messages,
    firstMessageAt,
    lastMessageAt,
    detectedSelfNameCandidate,
  };
}
