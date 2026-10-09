import { describe, it, expect } from "vitest";
import { redactMessages } from "../lib/redact";
import { parseWhatsAppZip } from "../lib/parsers/zip";
import JSZip from "jszip";

describe("Security Hardening Tests", () => {
  it("Test 1: PII Redaction masks UPI IDs, PAN cards, phone numbers, and names", () => {
    const rawMsg = {
      id: "sec_1",
      chatId: "c1",
      sender: "Rohan",
      timestamp: "2024-03-20T10:00:00Z",
      text: "Pay me at rohan@okaxis or call +91 98765 43210. My PAN is ABCDE1234F.",
      isSystem: false,
      isMedia: false,
    };

    const res = redactMessages([rawMsg], "You", ["Rohan", "You"]);
    const redactedText = res.redactedMessages[0].text;

    expect(redactedText).not.toContain("rohan@okaxis");
    expect(redactedText).not.toContain("+91 98765 43210");
    expect(redactedText).not.toContain("ABCDE1234F");
    expect(redactedText).toContain("[UPI]");
    expect(redactedText).toContain("[PHONE]");
    expect(redactedText).toContain("[PAN]");
  });

  it("Test 2: Rejects zip archives with directory traversal attempts (../)", async () => {
    const zip = new JSZip();
    zip.file("../evil.txt", "malicious content");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(parseWhatsAppZip(zipBuffer, "exploit.zip")).rejects.toThrow(/Suspicious path/);
  });

  it("Test 3: Rejects zip archives exceeding max file count threshold (zip bomb protection)", async () => {
    const zip = new JSZip();
    for (let i = 0; i < 505; i++) {
      zip.file(`file_${i}.txt`, "sample");
    }
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(parseWhatsAppZip(zipBuffer, "bomb.zip")).rejects.toThrow(/too many files/);
  });

  it("Test 4: Successfully parses valid safe WhatsApp zip archive and extracts chat", async () => {
    const zip = new JSZip();
    const chatText = `10/01/2024, 10:00 - Kabir: Hey Kabir here!\n10/01/2024, 10:05 - You: Hey Kabir!`;
    zip.file("_chat.txt", chatText);
    zip.file("photo1.jpg", "fake-image-bytes");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const result = await parseWhatsAppZip(zipBuffer, "WhatsApp Chat - Kabir.zip");
    expect(result.messages).toHaveLength(2);
    expect(result.report?.mediaCount).toBe(1);
    expect(result.participants).toContain("Kabir");
  });
});
