import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseWhatsAppExport } from "../lib/parsers/whatsapp";

describe("Stage 0: Synthetic Fixtures & Expected Facts Assertions", () => {
  const fixturesDir = path.resolve(__dirname, "../fixtures");

  it("1: Parses 1-on-1 Chat (~500 messages, 6 months) with exact expected facts", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "chat_1on1_500.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "chat_1on1_500.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "Arnav & Priya.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.participants).toEqual(expect.arrayContaining(meta.participants));
    expect(result.isGroup).toBe(false);

    // Verify per-person message counts
    const arnavCount = nonSystem.filter((m) => m.sender === "Arnav").length;
    const priyaCount = nonSystem.filter((m) => m.sender === "Priya").length;
    expect(arnavCount).toBe(meta.perPersonCounts.Arnav);
    expect(priyaCount).toBe(meta.perPersonCounts.Priya);

    expect(result.report?.systemMessagesSkipped).toBe(meta.systemMessages);
    expect(result.report?.unparsedLinesCount).toBe(0);
  });

  it("2: Parses Group Chat (~2,000 messages, 8 people) with exact expected facts", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "group_chat_2000.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "group_chat_2000.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "HackNation Core 2024.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.participants.length).toBe(meta.participants.length);
    expect(result.isGroup).toBe(true);

    // Verify each person's exact count
    for (const person of meta.participants) {
      const count = nonSystem.filter((m) => m.sender === person).length;
      expect(count).toBe(meta.perPersonCounts[person]);
    }

    expect(result.report?.systemMessagesSkipped).toBe(meta.systemMessages);
    expect(result.report?.unparsedLinesCount).toBe(0);
  });

  it("3: Parses Hinglish Chat correctly with exact expected facts", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "hinglish_chat.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "hinglish_chat.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "Kabir.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.participants).toEqual(expect.arrayContaining(meta.participants));

    const kabirCount = nonSystem.filter((m) => m.sender === "Kabir").length;
    const youCount = nonSystem.filter((m) => m.sender === "You").length;
    expect(kabirCount).toBe(meta.perPersonCounts.Kabir);
    expect(youCount).toBe(meta.perPersonCounts.You);
  });

  it("4: Parses Media, System, Deleted & Multi-line Chat with accurate event typing", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "media_system_chat.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "media_system_chat.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "Ops & Release.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.report?.systemMessagesSkipped).toBe(meta.systemMessages);

    // Verify multi-line message was preserved
    const multiLineMsg = nonSystem.find((m) => m.text.includes("Step 1: Run database migrations"));
    expect(multiLineMsg).toBeDefined();
    expect(multiLineMsg?.text).toContain("Step 2: Deploy Next.js web worker");
    expect(multiLineMsg?.text).toContain("Step 3: Verify analytics dashboard");
  });

  it("5: Parses iOS Format Chat with narrow no-break space and 12-hour AM/PM", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "ios_format_chat.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "ios_format_chat.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "Rohan Sharma.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.participants).toEqual(expect.arrayContaining(meta.participants));
    expect(result.report?.unparsedLinesCount).toBe(0);
  });

  it("6: Parses Android Format Chat with 24-hour dash format", () => {
    const raw = fs.readFileSync(path.join(fixturesDir, "android_format_chat.txt"), "utf-8");
    const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, "android_format_chat.json"), "utf-8"));

    const result = parseWhatsAppExport(raw, "Ananya.txt");
    const nonSystem = result.messages.filter((m) => !m.isSystem);

    expect(nonSystem.length).toBe(meta.totalMessages);
    expect(result.participants).toEqual(expect.arrayContaining(meta.participants));
    expect(result.report?.unparsedLinesCount).toBe(0);
  });
});
