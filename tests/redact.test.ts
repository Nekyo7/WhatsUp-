import { describe, it, expect } from "vitest";
import { redactMessages, unredactText } from "../lib/redact";
import type { Message } from "@/types";

describe("Redaction Engine (lib/redact.ts)", () => {
  it("Test 1: Replaces senders and in-text names with pseudo-identities (Person A/B)", () => {
    const messages: Message[] = [
      {
        id: "1",
        chatId: "c1",
        sender: "Rohan Sharma",
        timestamp: "2024-03-12T10:00:00Z",
        text: "Hey, did Rohan Sharma tell you about the investor pitch?",
        isSystem: false,
        isMedia: false,
      },
      {
        id: "2",
        chatId: "c1",
        sender: "You",
        timestamp: "2024-03-12T10:05:00Z",
        text: "Yes Rohan, I got it!",
        isSystem: false,
        isMedia: false,
      },
    ];

    const result = redactMessages(messages, "You", ["You", "Rohan Sharma"]);
    expect(result.nameMapping["You"]).toBe("Person A (You)");
    expect(result.nameMapping["Rohan Sharma"]).toBe("Person B");

    expect(result.redactedMessages[0].sender).toBe("Person B");
    expect(result.redactedMessages[0].text).toContain("Person B");
    expect(result.redactedMessages[0].text).not.toContain("Rohan Sharma");

    expect(result.stats.namesMaskedCount).toBeGreaterThan(0);
  });

  it("Test 2: Masks emails, phone numbers, and URLs securely", () => {
    const messages: Message[] = [
      {
        id: "1",
        chatId: "c1",
        sender: "Sarah Connor",
        timestamp: "2024-03-12T10:00:00Z",
        text: "Email me at sarah.connor@cyberdyne.org or call +1 555-019-2834. Check https://docs.cyberdyne.org/v2/spec.",
        isSystem: false,
        isMedia: false,
      },
    ];

    const result = redactMessages(messages, "You", ["You", "Sarah Connor"]);
    const text = result.redactedMessages[0].text;

    expect(text).toContain("[EMAIL: hidden]");
    expect(text).not.toContain("sarah.connor@cyberdyne.org");

    expect(text).toContain("[PHONE: masked]");
    expect(text).not.toContain("555-019-2834");

    expect(text).toContain("[URL: docs.cyberdyne.org]");
    expect(text).not.toContain("https://docs.cyberdyne.org/v2/spec");

    expect(result.stats.emailsMaskedCount).toBe(1);
    expect(result.stats.phonesMaskedCount).toBe(1);
    expect(result.stats.urlsMaskedCount).toBe(1);
  });

  it("Test 3: unredactText reverses Person A/B tokens back to real names client-side", () => {
    const reverseMap = {
      "Person A (You)": "You",
      "Person A": "You",
      "Person B": "Tanvi UI/UX",
    };

    const serverAiOutput = "Person B mentioned that Person A needs to approve the design sprint tokens.";
    const clientRestored = unredactText(serverAiOutput, reverseMap);

    expect(clientRestored).toBe("Tanvi UI/UX mentioned that You needs to approve the design sprint tokens.");
  });
});
