import { describe, it, expect } from "vitest";
import { extractPromises, resolveHinglishDueDate } from "../lib/analytics/promises";
import type { Message } from "@/types";

describe("Hinglish & English Promise Detection Suite", () => {
  const baseTime = new Date("2024-04-10T12:00:00Z");

  const createMsg = (id: string, text: string, sender = "You", timestamp = "2024-04-10T10:00:00Z"): Message => ({
    id,
    chatId: "chat_1",
    sender,
    timestamp,
    text,
    isSystem: false,
    isMedia: false,
  });

  it("Test 1: Positive Hinglish promise - 'main kal bhej dunga' resolves due date to tomorrow", () => {
    const msg = createMsg("1", "main kal bhej dunga");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].dueAt).not.toBeNull();
    const dueDate = new Date(promises[0].dueAt!);
    expect(dueDate.getUTCDate()).toBe(11); // +1 day (tomorrow)
    expect(promises[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("Test 2: Positive Hinglish promise - 'parso de dunga' resolves due date to 2 days later", () => {
    const msg = createMsg("2", "bhai tension mat le parso de dunga");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].dueAt).not.toBeNull();
    const dueDate = new Date(promises[0].dueAt!);
    expect(dueDate.getUTCDate()).toBe(12); // +2 days (parso)
  });

  it("Test 3: Positive Hinglish promise - 'sham ko bhejta hu'", () => {
    const msg = createMsg("3", "haan bhai sham ko bhejta hu pakka");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("Test 4: Past Hinglish phrase - 'kal bheja tha' leaves dueAt null (not a future promise)", () => {
    const msg = createMsg("4", "maine kal bheja tha mail check kar");
    const res = resolveHinglishDueDate(msg.text, new Date(msg.timestamp));
    expect(res.dueAt).toBeNull();
  });

  it("Test 5: Past Hinglish phrase - 'diya tha kal' is not a future commitment deadline", () => {
    const res = resolveHinglishDueDate("mene to kal de diya tha bhai", new Date("2024-04-10T10:00:00Z"));
    expect(res.dueAt).toBeNull();
  });

  it("Test 6: English explicit promise - 'I will send the report by tomorrow 5pm'", () => {
    const msg = createMsg("6", "I will send the report by tomorrow 5pm");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].dueAt).not.toBeNull();
    expect(promises[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("Test 7: English promise without explicit deadline - 'I'll review the pull request tonight'", () => {
    const msg = createMsg("7", "I'll review the pull request tonight");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].dueAt).not.toBeNull();
  });

  it("Test 8: English commitment - 'give me till Friday'", () => {
    const msg = createMsg("8", "give me till Friday to finish this");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].dueAt).not.toBeNull();
  });

  it("Test 9: Negative rejection - 'let me know if you are free' (Request, not a promise)", () => {
    const msg = createMsg("9", "let me know when you reach office");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 10: Negative rejection - 'let me see if I can come' (Non-committal)", () => {
    const msg = createMsg("10", "let me see if I have time today");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 11: Negative rejection - 'let me check if the server is running' (Conditional check)", () => {
    const msg = createMsg("11", "let me check if the build succeeded");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 12: Negative rejection - 'I'll be there' (Pure attendance/status)", () => {
    const msg = createMsg("12", "I'll be there in 5 mins");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 13: Negative rejection - Question 'Will you send the notes?'", () => {
    const msg = createMsg("13", "Will you send the notes tomorrow?");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 14: Negative rejection - Hinglish question 'kya tu kal aayega?'", () => {
    const msg = createMsg("14", "kya tu kal bhejega?");
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 15: Negative rejection - Quoted or Forwarded message", () => {
    const msg1 = createMsg("15a", "> I will send the files tomorrow");
    const msg2 = createMsg("15b", "Forwarded message: main kal bhej dunga");
    const promises = extractPromises([msg1, msg2], "You", baseTime);
    expect(promises).toHaveLength(0);
  });

  it("Test 16: Detects promises made BY OTHERS to you ('they_owe_me')", () => {
    const msg: Message = {
      id: "16",
      chatId: "c1",
      sender: "Rohan",
      timestamp: baseTime.toISOString(),
      text: "I'll send the updated pitch deck by tomorrow morning",
      isSystem: false,
      isMedia: false,
    };
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].direction).toBe("they_owe_me");
    expect(promises[0].promiser).toBe("Rohan");
    expect(promises[0].promisee).toBe("You");
  });

  it("Test 17: Tracks overdue resolution when due date has passed without completion", () => {
    const msg: Message = {
      id: "17",
      chatId: "c1",
      sender: "You",
      timestamp: new Date("2024-03-10T10:00:00Z").toISOString(),
      text: "I will finish the design by Friday",
      isSystem: false,
      isMedia: false,
    };
    // Reference time 10 days later (March 20)
    const promises = extractPromises([msg], "You", baseTime);
    expect(promises).toHaveLength(1);
    expect(promises[0].resolution).toBe("overdue");
    expect(promises[0].evidence).toContain("Due date passed");
  });

  it("Test 18: Respects user manual overrides (kept, dismissed)", () => {
    const msg: Message = {
      id: "18",
      chatId: "c1",
      sender: "You",
      timestamp: baseTime.toISOString(),
      text: "I'll transfer the money tonight",
      isSystem: false,
      isMedia: false,
    };
    const overrides = { "promise_18": "kept" as const };
    const promises = extractPromises([msg], "You", baseTime, overrides);
    expect(promises).toHaveLength(1);
    expect(promises[0].status).toBe("done");
    expect(promises[0].resolution).toBe("kept");
    expect(promises[0].evidence).toBe("Marked as kept by user");
  });
});

