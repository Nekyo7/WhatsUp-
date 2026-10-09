import type { Message } from "@/types";

export interface RedactionResult {
  redactedMessages: {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
  }[];
  redactedExcerptText: string;
  nameMapping: Record<string, string>; // e.g. "Rohan Sharma" -> "Person B", "Rohan" -> "Person B"
  reverseNameMapping: Record<string, string>; // e.g. "Person B" -> "Rohan Sharma"
  stats: {
    namesMaskedCount: number;
    phonesMaskedCount: number;
    emailsMaskedCount: number;
    urlsMaskedCount: number;
    upiMaskedCount: number;
    aadhaarMaskedCount: number;
    panMaskedCount: number;
    cardsMaskedCount: number;
    otpMaskedCount: number;
    pinCodesMaskedCount: number;
  };
}

// Regex patterns for PII detection
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,60}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|ibl|axl|upi|apl|fbl|idfcbank|icici|kotak|postbank|airtel|sbi|hdfcbank|federal|barodampay|waaxis|waicici|wahdfc|wasbi)\b/gi;
const AADHAAR_REGEX = /\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
const CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{1,4}\b|\b(?:\d{4}[-\s]?){4}\d{1,3}\b|\b\d{13,19}\b/g;
const PINCODE_IN_CONTEXT_REGEX = /\b(?:pin|pincode|pin code|postal code|delhi|mumbai|bangalore|bengaluru|kolkata|chennai|hyderabad|pune|noida|gurgaon|jaipur|lucknow|ahmedabad|kerala|address)\s*[-:,]?\s*([1-9][0-9]{5})\b/gi;
const OTP_REGEX = /\b(?:otp|one time password|verification code|login code|mpin|secret code)\s*(?:is|:|-|=)?\s*([0-9]{4,8})\b|\b(?:use|enter)\s+([0-9]{4,8})\s+(?:as|for|to verify|to login)\b/gi;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}\b/g;
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Redacts contact names (in headers & text bodies), participant first names/nicknames,
 * UPI IDs, Aadhaar numbers, PAN cards, Card numbers, OTPs, PIN codes, emails, phones, and URLs.
 * Redaction is best-effort and local-only.
 */
export function redactMessages(
  messages: Message[],
  selfName: string,
  allParticipants: string[] = []
): RedactionResult {
  // 1. Build consistent pseudo-anonymous name mappings
  const nameMapping: Record<string, string> = {};
  const reverseNameMapping: Record<string, string> = {};

  // Self is always Person A (You)
  nameMapping[selfName] = "Person A (You)";
  reverseNameMapping["Person A (You)"] = selfName;
  reverseNameMapping["Person A"] = selfName;

  let personIndex = 1; // 1 -> B, 2 -> C, ...
  const getNextPersonCode = () => {
    const char = String.fromCharCode(65 + personIndex);
    personIndex++;
    return `Person ${char}`;
  };

  // Collect all unique senders from the batch + known participants
  const uniqueNames = new Set<string>();
  allParticipants.forEach((p) => uniqueNames.add(p));
  messages.forEach((m) => {
    if (m.sender && m.sender !== selfName) {
      uniqueNames.add(m.sender);
    }
  });

  uniqueNames.forEach((name) => {
    if (name && !nameMapping[name]) {
      const code = getNextPersonCode();
      nameMapping[name] = code;
      reverseNameMapping[code] = name;
    }
  });

  // Map participant first names and nicknames to their respective code
  Object.keys(nameMapping).forEach((fullName) => {
    const code = nameMapping[fullName];
    const parts = fullName.split(" ").filter((p) => p.trim().length > 1);
    if (parts.length > 1) {
      const firstName = parts[0];
      if (!nameMapping[firstName]) {
        nameMapping[firstName] = code;
      }
    }
  });

  // Sort names by length descending to prevent sub-string collision replacements
  const sortedNames = Object.keys(nameMapping).sort((a, b) => b.length - a.length);

  let namesMaskedCount = 0;
  let phonesMaskedCount = 0;
  let emailsMaskedCount = 0;
  let urlsMaskedCount = 0;
  let upiMaskedCount = 0;
  let aadhaarMaskedCount = 0;
  let panMaskedCount = 0;
  let cardsMaskedCount = 0;
  let otpMaskedCount = 0;
  let pinCodesMaskedCount = 0;

  // 2. Redact text per message
  const redactedMessages = messages.map((msg) => {
    let text = msg.text || "";

    // 1. Mask URLs first so internal tokens aren't broken
    text = text.replace(URL_REGEX, (url) => {
      urlsMaskedCount++;
      try {
        const parsed = new URL(url);
        return `[URL: ${parsed.hostname}]`;
      } catch {
        return "[URL: external-link]";
      }
    });

    // 2. Mask Emails
    text = text.replace(EMAIL_REGEX, () => {
      emailsMaskedCount++;
      return "[EMAIL: hidden]";
    });

    // 3. Mask UPI IDs (name@bank)
    text = text.replace(UPI_REGEX, () => {
      upiMaskedCount++;
      return "[UPI: masked]";
    });

    // 4. Mask PAN Cards (5 letters, 4 digits, 1 letter)
    text = text.replace(PAN_REGEX, () => {
      panMaskedCount++;
      return "[PAN: masked]";
    });

    // 5. Mask Aadhaar numbers (12 digits, grouped or continuous)
    text = text.replace(AADHAAR_REGEX, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length === 12) {
        aadhaarMaskedCount++;
        return "[AADHAAR: masked]";
      }
      return match;
    });

    // 6. Mask Credit/Debit Card numbers (13 to 19 digits)
    text = text.replace(CARD_REGEX, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length >= 13 && digits.length <= 19) {
        cardsMaskedCount++;
        return "[CARD: masked]";
      }
      return match;
    });

    // 7. Mask Indian PIN codes in address-like text before general number/OTP masks
    text = text.replace(PINCODE_IN_CONTEXT_REGEX, (match, pincode) => {
      if (pincode && pincode.length === 6) {
        pinCodesMaskedCount++;
        return match.replace(pincode, "[PINCODE: masked]");
      }
      return match;
    });

    // 8. Mask OTP phrases
    text = text.replace(OTP_REGEX, (match, p1, p2) => {
      otpMaskedCount++;
      const otpCode = p1 || p2 || match;
      return match.replace(otpCode, "[OTP: masked]");
    });

    // Mask Phone numbers (validating length 7-15 digits)
    text = text.replace(PHONE_REGEX, (match) => {
      const digitsOnly = match.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        phonesMaskedCount++;
        return "[PHONE: masked]";
      }
      return match;
    });

    // Mask contact names and first names appearing within the message body
    for (const rawName of sortedNames) {
      if (!rawName || rawName.trim().length < 2) continue;
      const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nameRegex = new RegExp(`\\b${escaped}\\b`, "gi");
      if (nameRegex.test(text)) {
        namesMaskedCount++;
        text = text.replace(nameRegex, nameMapping[rawName]);
      }
    }

    const maskedSender = nameMapping[msg.sender] || msg.sender;

    return {
      id: msg.id,
      sender: maskedSender,
      text,
      timestamp: msg.timestamp,
    };
  });

  // Construct formatted excerpt string
  const excerptLines = redactedMessages.map(
    (m) => `[${new Date(m.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}] ${m.sender}: ${m.text}`
  );

  return {
    redactedMessages,
    redactedExcerptText: excerptLines.join("\n"),
    nameMapping,
    reverseNameMapping,
    stats: {
      namesMaskedCount,
      phonesMaskedCount,
      emailsMaskedCount,
      urlsMaskedCount,
      upiMaskedCount,
      aadhaarMaskedCount,
      panMaskedCount,
      cardsMaskedCount,
      otpMaskedCount,
      pinCodesMaskedCount,
    },
  };
}

/**
 * Replaces "Person A", "Person B", etc. back to real contact names client-side for user display.
 */
export function unredactText(text: string, reverseNameMapping: Record<string, string>): string {
  if (!text || !reverseNameMapping) return text;
  let unredacted = text;

  // Sort keys descending so "Person A (You)" is replaced before "Person A"
  const keys = Object.keys(reverseNameMapping).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const realName = reverseNameMapping[key];
    if (realName) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      unredacted = unredacted.replace(new RegExp(escaped, "g"), realName);
    }
  }

  return unredacted;
}

