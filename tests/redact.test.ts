import { describe, it, expect } from "vitest";
import { redactMessages, unredactText } from "../lib/redact";
import type { Message } from "@/types";

describe("Redaction Engine (lib/redact.ts)", () => {
  it("Test 1: Replaces senders and in-text names/first-names with pseudo-identities (Person A/B)", () => {
    const messages: Message[] = [
      {
        id: "1",
        chatId: "c1",
        sender: "Rohan Sharma",
        timestamp: "2024-03-12T10:00:00Z",
        text: "Hey, did Rohan tell you about the investor pitch?",
        isSystem: false,
        isMedia: false,
      },
      {
        id: "2",
        chatId: "c1",
        sender: "You",
        timestamp: "2024-03-12T10:05:00Z",
        text: "Yes Rohan Sharma, I got it!",
        isSystem: false,
        isMedia: false,
      },
    ];

    const result = redactMessages(messages, "You", ["You", "Rohan Sharma"]);
    expect(result.nameMapping["You"]).toBe("Person A (You)");
    expect(result.nameMapping["Rohan Sharma"]).toBe("Person B");
    expect(result.nameMapping["Rohan"]).toBe("Person B");

    expect(result.redactedMessages[0].sender).toBe("Person B");
    expect(result.redactedMessages[0].text).toContain("Person B");
    expect(result.redactedMessages[0].text).not.toContain("Rohan");
    expect(result.redactedMessages[1].text).toContain("Person B");
    expect(result.redactedMessages[1].text).not.toContain("Rohan Sharma");

    expect(result.stats.namesMaskedCount).toBeGreaterThanOrEqual(2);
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

  it("Test 3: Masks Indian PII formats: UPI ID, Aadhaar, PAN, Card Numbers, OTP, and PIN codes", () => {
    const messages: Message[] = [
      {
        id: "1",
        chatId: "c1",
        sender: "Aman",
        timestamp: "2024-03-12T10:00:00Z",
        text: "Pay me at aman.gupta@okhdfcbank or merchant@paytm. My PAN is ABCDE1234F and Aadhaar is 5482 9102 3847.",
        isSystem: false,
        isMedia: false,
      },
      {
        id: "2",
        chatId: "c1",
        sender: "Aman",
        timestamp: "2024-03-12T10:01:00Z",
        text: "Card: 4532-7590-1234-5678. Your OTP is 492019 for login. Address: HSR Layout Bangalore pin 560102.",
        isSystem: false,
        isMedia: false,
      },
    ];

    const result = redactMessages(messages, "You", ["You", "Aman"]);
    const t1 = result.redactedMessages[0].text;
    const t2 = result.redactedMessages[1].text;

    // UPI
    expect(t1).toContain("[UPI: masked]");
    expect(t1).not.toContain("aman.gupta@okhdfcbank");
    expect(t1).not.toContain("merchant@paytm");

    // PAN
    expect(t1).toContain("[PAN: masked]");
    expect(t1).not.toContain("ABCDE1234F");

    // Aadhaar
    expect(t1).toContain("[AADHAAR: masked]");
    expect(t1).not.toContain("5482 9102 3847");

    // Card
    expect(t2).toContain("[CARD: masked]");
    expect(t2).not.toContain("4532-7590-1234-5678");

    // OTP
    expect(t2).toContain("[OTP: masked]");
    expect(t2).not.toContain("492019");

    // PIN code
    expect(t2).toContain("[PINCODE: masked]");
    expect(t2).not.toContain("560102");

    expect(result.stats.upiMaskedCount).toBeGreaterThanOrEqual(1);
    expect(result.stats.panMaskedCount).toBe(1);
    expect(result.stats.aadhaarMaskedCount).toBe(1);
    expect(result.stats.cardsMaskedCount).toBe(1);
    expect(result.stats.otpMaskedCount).toBe(1);
    expect(result.stats.pinCodesMaskedCount).toBe(1);
  });

  it("Test 4: unredactText performs accurate round-trip restoration back to original names", () => {
    const reverseMap = {
      "Person A (You)": "You",
      "Person A": "You",
      "Person B": "Tanvi UI/UX",
      "Person C": "Rohan Sharma",
    };

    const serverAiOutput = "Person B mentioned that Person A should sync with Person C regarding deliverables.";
    const clientRestored = unredactText(serverAiOutput, reverseMap);

    expect(clientRestored).toBe("Tanvi UI/UX mentioned that You should sync with Rohan Sharma regarding deliverables.");
  });
});

