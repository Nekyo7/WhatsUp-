import { describe, it, expect } from "vitest";
import { calculateSessionsAndTalkTime } from "../lib/analytics/sessions";
import { calculateReplyTimes } from "../lib/analytics/replies";
import { classifyGhostStatus } from "../lib/analytics/ghosts";
import { calculateReplyDebt } from "../lib/analytics/debt";
import { extractPromises } from "../lib/analytics/promises";
import type { Message, Chat, GhostEntry } from "@/types";

describe("Analytics Unit Tests", () => {
  const baseTime = new Date("2024-03-20T12:00:00Z");

  it("Test 1: Sessions and talk time breaks on 30-minute gaps", () => {
    const messages: Message[] = [
      { id: "1", chatId: "c1", sender: "You", timestamp: "2024-03-20T10:00:00Z", text: "Hi", isSystem: false, isMedia: false },
      { id: "2", chatId: "c1", sender: "Aman", timestamp: "2024-03-20T10:05:00Z", text: "Hey", isSystem: false, isMedia: false },
      // 40 min gap -> new session
      { id: "3", chatId: "c1", sender: "Aman", timestamp: "2024-03-20T10:45:00Z", text: "Are you free?", isSystem: false, isMedia: false },
      { id: "4", chatId: "c1", sender: "You", timestamp: "2024-03-20T10:50:00Z", text: "Yes", isSystem: false, isMedia: false },
    ];

    const result = calculateSessionsAndTalkTime(messages, "You");
    expect(result.sessions).toHaveLength(2);
    expect(result.initiatorCounts["You"]).toBe(1);
    expect(result.initiatorCounts["Aman"]).toBe(1);
    expect(result.initiatorShareYou).toBe(0.5);
    expect(result.estimatedTalkTimeMinutes).toBeGreaterThan(0);
  });

  it("Test 2: Reply times accurately measures turn latency and excludes >24h gaps", () => {
    const messages: Message[] = [
      { id: "1", chatId: "c1", sender: "Aman", timestamp: "2024-03-20T10:00:00Z", text: "Question", isSystem: false, isMedia: false },
      // Replied 2 mins later (120s)
      { id: "2", chatId: "c1", sender: "You", timestamp: "2024-03-20T10:02:00Z", text: "Answer", isSystem: false, isMedia: false },
      // Aman replied 4 mins later (240s)
      { id: "3", chatId: "c1", sender: "Aman", timestamp: "2024-03-20T10:06:00Z", text: "Thanks", isSystem: false, isMedia: false },
      // 48 hours later (excluded from reply time)
      { id: "4", chatId: "c1", sender: "You", timestamp: "2024-03-22T10:06:00Z", text: "Long gap", isSystem: false, isMedia: false },
    ];

    const result = calculateReplyTimes(messages, "You");
    expect(result.medianReplyTimeYouSecs).toBe(120);
    expect(result.medianReplyTimeThemSecs).toBe(240);
  });

  it("Test 3: Classifies you_ghosted with boosted score for questions", () => {
    const messages: Message[] = [
      { id: "1", chatId: "c1", sender: "You", timestamp: "2024-03-10T10:00:00Z", text: "Hey", isSystem: false, isMedia: false },
      { id: "2", chatId: "c1", sender: "Rohan", timestamp: "2024-03-12T10:00:00Z", text: "Bhai kab aayega?", isSystem: false, isMedia: false },
    ];

    // Reference time is 2024-03-20 (8 days silent from Rohan's question)
    const ghost = classifyGhostStatus("c1", messages, "You", 0.7, baseTime);
    expect(ghost).not.toBeNull();
    expect(ghost?.type).toBe("you_ghosted");
    expect(ghost?.score).toBeGreaterThanOrEqual(75);
    expect(ghost?.reason).toContain("direct pending question");
  });

  it("Test 4: Classifies they_ghosted, revivable, and fading", () => {
    // They ghosted
    const theyGhostedMsgs: Message[] = [
      { id: "1", chatId: "c2", sender: "You", timestamp: "2024-03-14T10:00:00Z", text: "Can you send the PDF?", isSystem: false, isMedia: false },
    ];
    const resThey = classifyGhostStatus("c2", theyGhostedMsgs, "You", 0.5, baseTime);
    expect(resThey?.type).toBe("they_ghosted");

    // Revivable (silent > 60 days for a high volume chat)
    const revivableMsgs: Message[] = Array.from({ length: 110 }).map((_, i) => ({
      id: String(i),
      chatId: "c3",
      sender: i % 2 === 0 ? "You" : "Bestie",
      timestamp: "2023-12-01T10:00:00Z",
      text: "Old talk",
      isSystem: false,
      isMedia: false,
    }));
    const resRevivable = classifyGhostStatus("c3", revivableMsgs, "You", 0.95, baseTime);
    expect(resRevivable?.type).toBe("revivable");
  });

  it("Test 5: Calculates Reply Debt score (0-100) and structured breakdown", () => {
    const ghosts: GhostEntry[] = [
      {
        chatId: "c1",
        type: "you_ghosted",
        score: 85,
        reason: "Left with question",
        daysSilent: 9,
        lastMessageText: "Bhai reply de?",
        lastMessageTimestamp: "2024-03-11T10:00:00Z",
      },
      {
        chatId: "c2",
        type: "you_ghosted",
        score: 70,
        reason: "Unanswered",
        daysSilent: 4,
        lastMessageText: "Ping",
        lastMessageTimestamp: "2024-03-16T10:00:00Z",
      },
    ];

    const chats: Chat[] = [
      { id: "c1", title: "Rohan", platform: "whatsapp", isGroup: false, participants: ["You", "Rohan"], messageCount: 120, firstMessageAt: "", lastMessageAt: "", selfName: "You" },
      { id: "c2", title: "Project Alpha", platform: "telegram", isGroup: true, participants: ["You", "Lead"], messageCount: 45, firstMessageAt: "", lastMessageAt: "", selfName: "You" },
    ];

    const debt = calculateReplyDebt(ghosts, chats);
    expect(debt.score).toBeGreaterThan(0);
    expect(debt.score).toBeLessThanOrEqual(100);
    expect(debt.peopleWaitingCount).toBe(2);
    expect(debt.chatsInDebt).toHaveLength(2);
  });

  it("Test 6: Extracts English and Hinglish promises, parses chrono due dates, and marks done/stale", () => {
    const messages: Message[] = [
      // 1. English promise with explicit due date
      { id: "m1", chatId: "c1", sender: "You", timestamp: "2024-03-15T10:00:00Z", text: "I'll send the report by tomorrow 5pm", isSystem: false, isMedia: false },
      // 2. Hinglish promise later completed
      { id: "m2", chatId: "c1", sender: "You", timestamp: "2024-03-16T10:00:00Z", text: "main kal bhej dunga", isSystem: false, isMedia: false },
      { id: "m3", chatId: "c1", sender: "You", timestamp: "2024-03-17T10:00:00Z", text: "Bhai bhej diya check kar", isSystem: false, isMedia: false },
    ];

    const promises = extractPromises(messages, "You", baseTime);
    expect(promises).toHaveLength(2);

    // m1 promise
    expect(promises[0].text).toContain("I'll send the report");
    expect(promises[0].dueAt).not.toBeNull();

    // m2 promise should be marked "done" due to m3 completion cue
    expect(promises[1].status).toBe("done");
  });
});
