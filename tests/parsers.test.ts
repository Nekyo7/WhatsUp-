import { describe, it, expect } from "vitest";
import { parseWhatsAppExport, detectLanguage } from "../lib/parsers/whatsapp";
import { parseTelegramExport } from "../lib/parsers/telegram";
import { parseDiscordExport } from "../lib/parsers/discord";
import { parseChatFile } from "../lib/parsers";

describe("WhatsApp Parser Edge Cases", () => {
  it("Test 1: handles 12-hour AM/PM formats with brackets and dashes correctly", () => {
    const raw = `[14/03/24, 09:15:30 AM] Rohan Sharma: Morning! Are we meeting today?
[14/03/24, 02:45:10 PM] Ananya: Yes, let's catch up at 3pm.`;

    const result = parseWhatsAppExport(raw, "Rohan & Ananya.txt");
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].sender).toBe("Rohan Sharma");
    expect(result.messages[0].text).toBe("Morning! Are we meeting today?");
    expect(new Date(result.messages[0].timestamp).getUTCHours()).toBe(9);
    expect(new Date(result.messages[1].timestamp).getUTCHours()).toBe(14);
  });

  it("Test 2: handles 24-hour time format without brackets", () => {
    const raw = `15/04/2024, 21:30 - Vikram: Bhai PPT bhej di kya tune?
15/04/2024, 21:35 - You: Haan bhai abhi mail kar raha hu.`;

    const result = parseWhatsAppExport(raw, "Vikram.txt");
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].sender).toBe("Vikram");
    expect(result.messages[1].sender).toBe("You");
    expect(new Date(result.messages[0].timestamp).getUTCHours()).toBe(21);
  });

  it("Test 3: auto-detects DD/MM/YY vs MM/DD/YY based on values > 12", () => {
    // 25 is day, so DD/MM/YY format
    const rawDMY = `25/08/2024, 10:00 - Kabir: Hey Kabir here!
26/08/2024, 10:05 - Priya: Got it.`;
    const resDMY = parseWhatsAppExport(rawDMY, "Kabir.txt");
    const dmyDate = new Date(resDMY.messages[0].timestamp);
    expect(dmyDate.getUTCDate()).toBe(25);
    expect(dmyDate.getUTCMonth()).toBe(7); // August is month 7 (0-indexed)

    // 08/25/2024 (MDY format)
    const rawMDY = `08/25/2024, 10:00 - Sarah: Hey Sarah here!
08/26/2024, 10:05 - Alex: Cool!`;
    const resMDY = parseWhatsAppExport(rawMDY, "Sarah.txt");
    const mdyDate = new Date(resMDY.messages[0].timestamp);
    expect(mdyDate.getUTCDate()).toBe(25);
    expect(mdyDate.getUTCMonth()).toBe(7);
  });

  it("Test 4: handles multi-line messages and code blocks without breaking message boundaries", () => {
    const raw = `10/01/2024, 14:00 - Dev: Here is the deployment plan:
Step 1: Run migrations
Step 2: Deploy Next.js worker
Step 3: Monitor logs
10/01/2024, 14:02 - Lead: Approved!`;

    const result = parseWhatsAppExport(raw, "DevChat.txt");
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toContain("Step 1: Run migrations");
    expect(result.messages[0].text).toContain("Step 3: Monitor logs");
    expect(result.messages[1].text).toBe("Approved!");
  });

  it("Test 5: correctly identifies system notifications, encryption notices, group actions, and omitted media", () => {
    const raw = `10/01/2024, 14:00 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
10/01/2024, 14:01 - Rohit created group "Project X"
10/01/2024, 14:02 - Rohit added Priya
10/01/2024, 14:05 - Priya: <Media omitted>
10/01/2024, 14:06 - Priya: This message was deleted`;

    const result = parseWhatsAppExport(raw, "Project X.txt");
    expect(result.messages[0].isSystem).toBe(true);
    expect(result.messages[1].isSystem).toBe(true);
    expect(result.messages[2].isSystem).toBe(true);
    expect(result.messages[3].isSystem).toBe(false);
    expect(result.messages[3].isMedia).toBe(true);
    expect(result.messages[4].isMedia).toBe(true);
  });

  it("Test 6: detects Hinglish and Hindi language accurately", () => {
    expect(detectLanguage("Bhai kal pakka bhej dunga tension mat le")).toBe("hinglish");
    expect(detectLanguage("Are yaar kya bol raha hai, theek hai")).toBe("hinglish");
    expect(detectLanguage("नमस्ते, आप कैसे हैं?")).toBe("hi");
    expect(detectLanguage("Let's review the document by tomorrow afternoon.")).toBe("en");
  });

  it("Test 7: parses Telegram and Discord exports seamlessly via unified router", () => {
    const tgJson = JSON.stringify({
      name: "Telegram Group",
      type: "private_group",
      id: 999,
      messages: [
        { id: 1, type: "message", date: "2024-03-01T12:00:00", from: "Amit", text: "TG message" },
      ],
    });
    const parsedTg = parseChatFile(tgJson, "export.json");
    expect(parsedTg.platform).toBe("telegram");
    expect(parsedTg.messages[0].text).toBe("TG message");

    const dcJson = JSON.stringify({
      guild: { name: "Gaming Guild" },
      channel: { name: "general" },
      messages: [
        { id: "101", timestamp: "2024-03-01T12:00:00Z", author: { name: "Gamer1" }, content: "Discord GG" },
      ],
    });
    const parsedDc = parseChatFile(dcJson, "discord.json");
    expect(parsedDc.platform).toBe("discord");
    expect(parsedDc.messages[0].text).toBe("Discord GG");
  });

  it("Test 8: handles Unicode spaces, narrow no-break spaces (\\u202F), and ISO/dot dates", () => {
    const rawUnicode = `15.04.2024, 11.30\u202Fpm - ~Kunal (+91 98765 43210): Bhai kal pakka bhej dunga
2024-04-16, 09:15 - ~Kunal (+91 98765 43210): Sent the file!`;
    const res = parseWhatsAppExport(rawUnicode, "Kunal.txt");
    expect(res.messages).toHaveLength(2);
    expect(new Date(res.messages[0].timestamp).getUTCHours()).toBe(23); // 11:30 PM is 23:30 UTC
    expect(res.messages[0].sender).toContain("Kunal");
    expect(new Date(res.messages[1].timestamp).getUTCDate()).toBe(16);
  });

  it("Test 9: parses 1:1 chat fixture with exact message count and participants", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "fixtures/chat_1on1.txt"), "utf-8");
    const result = parseWhatsAppExport(content, "Priya Sharma.txt");

    expect(result.messages.length).toBe(8);
    expect(result.participants).toContain("Priya Sharma");
    expect(result.participants).toContain("You");
    expect(result.report).toBeDefined();
    expect(result.report?.messagesParsed).toBe(8);
    expect(result.report?.unparsedLinesCount).toBe(0);
  });

  it("Test 10: parses group chat fixture with system events filtered and multiple participants", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "fixtures/group_chat.txt"), "utf-8");
    const result = parseWhatsAppExport(content, "Hackathon Core.txt");

    expect(result.isGroup).toBe(true);
    expect(result.participants.length).toBeGreaterThanOrEqual(4);
    expect(result.participants).toContain("Aryan");
    expect(result.participants).toContain("Rohan");
    expect(result.participants).toContain("Tanya");
    expect(result.participants).toContain("You");
    expect(result.report?.systemMessagesSkipped).toBeGreaterThanOrEqual(3);
  });

  it("Test 11: parses Hinglish fixture and correctly classifies language tokens", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "fixtures/hinglish_chat.txt"), "utf-8");
    const result = parseWhatsAppExport(content, "Kabir.txt");

    expect(result.messages.length).toBe(8);
    const hinglishMsgs = result.messages.filter((m) => m.lang === "hinglish");
    expect(hinglishMsgs.length).toBeGreaterThanOrEqual(4);
  });

  it("Test 12: parses media & system chat fixture identifying deleted messages and calls", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "fixtures/media_system_chat.txt"), "utf-8");
    const result = parseWhatsAppExport(content, "Roadtrip 2024.txt");

    expect(result.report?.mediaCount).toBeGreaterThanOrEqual(2);
    expect(result.report?.systemMessagesSkipped).toBeGreaterThanOrEqual(3);
  });
});

