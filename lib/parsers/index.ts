import { parseWhatsAppExport, type ParsedChatResult } from "./whatsapp";
import { parseTelegramExport } from "./telegram";
import { parseDiscordExport } from "./discord";
import { parseWhatsAppZip } from "./zip";

export type { ParsedChatResult };
export { parseWhatsAppExport, parseTelegramExport, parseDiscordExport, parseWhatsAppZip };

/**
 * Automatically detects file format and parses chat export into unified ParsedChatResult.
 */
export function parseChatFile(content: string, fileName: string): ParsedChatResult {
  const trimmed = content.trim();

  // 1. JSON-based exports (Telegram or Discord)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.guild || (parsed.channel && Array.isArray(parsed.messages))) {
        return parseDiscordExport(trimmed, fileName);
      }
      if (parsed.messages && Array.isArray(parsed.messages) && (parsed.type || parsed.id)) {
        return parseTelegramExport(trimmed, fileName);
      }
    } catch {
      // Fallback to text parser if JSON parse fails
    }
  }

  // 2. Default to WhatsApp plain text parser
  return parseWhatsAppExport(content, fileName);
}
