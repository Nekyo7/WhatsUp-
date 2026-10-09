import { describe, it, expect } from "vitest";
import { parseWhatsAppExport } from "../lib/parsers/whatsapp";
import { analyzeChat } from "../lib/analytics";
import { generateLocalBriefing, generateLocalReplyDrafts, translateHinglishLocal, generateLocalWrappedCaption } from "../lib/localAi";
import { detectAIProvider } from "../lib/llm";

describe("Group Chat & Local AI Intelligence Tests", () => {
  const sampleGroupChat = `[10/05/26, 09:00:15 AM] Kabir: Hey team, we need to finalize the hackathon project idea today!
[10/05/26, 09:01:20 AM] Priya: I vote for the local-first AI guilt ledger.
[10/05/26, 09:02:10 AM] Vikram: Agreed! That problem is huge.
[10/05/26, 09:05:00 AM] You: Ha bhai suree, mai backend and IndexedDB schema bhej dunga kal tak.
[10/05/26, 09:06:12 AM] Kabir: Awesome! Who is doing the UI mockups?
[10/05/26, 09:07:00 AM] Priya: Me in hu for UI/UX in Figma.`;

  it("Test 1: Parses group chats, detects all members, and flags isGroup as true", () => {
    const parsed = parseWhatsAppExport(sampleGroupChat, "Hackathon Team.txt");
    expect(parsed.isGroup).toBe(true);
    expect(parsed.participants).toContain("Kabir");
    expect(parsed.participants).toContain("Priya");
    expect(parsed.participants).toContain("Vikram");
    expect(parsed.participants).toContain("You");
    expect(parsed.messages).toHaveLength(6);
  });

  it("Test 2: Computes per-member statistics in group chats accurately", () => {
    const parsed = parseWhatsAppExport(sampleGroupChat, "Hackathon Team.txt");
    const analysis = analyzeChat(parsed.chatId, parsed.messages, "You", 0.5);

    expect(analysis.stats.memberStats).toBeDefined();
    expect(analysis.stats.memberStats?.length).toBe(4);

    const priyaStat = analysis.stats.memberStats?.find((m) => m.name === "Priya");
    expect(priyaStat?.messageCount).toBe(2);
    expect(priyaStat?.messageShare).toBeGreaterThan(0.2);

    const kabirStat = analysis.stats.memberStats?.find((m) => m.name === "Kabir");
    expect(kabirStat?.initiatorCount).toBe(1);
  });

  it("Test 3: Generates dynamic local AI briefings directly from real messages", () => {
    const parsed = parseWhatsAppExport(sampleGroupChat, "Hackathon Team.txt");
    const briefing = generateLocalBriefing({
      chatId: parsed.chatId,
      chatTitle: "Hackathon Team",
      messages: parsed.messages,
      timeBudget: "2min",
      isGroup: true,
    });

    expect(briefing.tldr).toHaveLength(3);
    expect(briefing.topics.length).toBeGreaterThan(0);
    expect(briefing.actionItems.length).toBeGreaterThan(0);
    // Should reference real conversation details
    const allText = JSON.stringify(briefing);
    expect(allText).toMatch(/Kabir|Priya|Hackathon/i);
  });

  it("Test 4: Generates personalized contextual reply drafts referencing actual questions", () => {
    const lastContext = `[10/05/26, 09:06:12 AM] Kabir: Did you finish the pitch deck? Kab bhej raha hai?`;
    const drafts = generateLocalReplyDrafts("Kabir", lastContext);

    expect(drafts.apologetic).toContain("Kabir");
    expect(drafts.casual).toContain("Kabir");
    expect(drafts.short).toBeDefined();
  });

  it("Test 5: Translates colloquial Hinglish idioms accurately without API keys", () => {
    const sample = "Bhai kal pakka bhej dunga tension mat le";
    const res = translateHinglishLocal(sample);
    expect(res.translatedText.toLowerCase()).toContain("bro");
    expect(res.translatedText.toLowerCase()).toContain("tomorrow");
  });

  it("Test 6: Correctly detects AI provider from key format", () => {
    expect(detectAIProvider("AIzaSyD...key")).toBe("gemini");
    expect(detectAIProvider("sk-ant-api03-...")).toBe("anthropic");
    expect(detectAIProvider("sk-proj-...")).toBe("openai");
    expect(detectAIProvider("")).toBe("local");
  });

  it("Test 7: Generates dynamic Wrapped roast captions based on actual score", () => {
    const highDebtRoast = generateLocalWrappedCaption({
      topPersonName: "Udit",
      totalTalkHours: 18.5,
      longestSilenceDays: 26,
      replyDebtScore: 75,
    });
    expect(highDebtRoast.caption).toContain("Udit");
    expect(highDebtRoast.caption).toContain("26");
    expect(highDebtRoast.vibeTag).toContain("High Guilt");

    const cleanRoast = generateLocalWrappedCaption({
      topPersonName: "Mom",
      totalTalkHours: 4.2,
      longestSilenceDays: 1,
      replyDebtScore: 8,
    });
    expect(cleanRoast.vibeTag).toContain("Wholesome");
  });
});
