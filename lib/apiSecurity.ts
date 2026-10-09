import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limiting map keyed by client IP
const ipRateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_MAX_REQUESTS_PER_MIN = 35; // For server-provided key or heuristics
const BYOK_MAX_REQUESTS_PER_MIN = 100; // More generous for users with their own keys
const MAX_PAYLOAD_CHAR_LENGTH = 100_000; // 100k characters max

/**
 * Periodically cleans up expired rate limit entries to prevent memory leaks.
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [ip, record] of ipRateLimitMap.entries()) {
    if (now > record.resetTime) {
      ipRateLimitMap.delete(ip);
    }
  }
}

/**
 * Validates request payload size and enforces rate limiting on public AI proxy routes.
 * Returns null if allowed, or NextResponse with error if rejected.
 */
export function checkApiRateLimitAndPayload(
  req: Request,
  rawBodyString?: string,
  hasCustomKey: boolean = false
): NextResponse | null {
  // 1. Payload length guard
  if (rawBodyString && rawBodyString.length > MAX_PAYLOAD_CHAR_LENGTH) {
    return NextResponse.json(
      { error: `Payload too large. Maximum allowed size is ${MAX_PAYLOAD_CHAR_LENGTH} characters.` },
      { status: 413 }
    );
  }

  // 2. Identify client IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

  // 3. Rate limit check
  const now = Date.now();
  if (Math.random() < 0.05) {
    cleanupExpiredRecords();
  }

  const record = ipRateLimitMap.get(ip);
  const maxAllowed = hasCustomKey ? BYOK_MAX_REQUESTS_PER_MIN : DEFAULT_MAX_REQUESTS_PER_MIN;

  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return null;
  }

  if (record.count >= maxAllowed) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait a moment before trying again, or configure your own API key in AI Settings.",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }

  record.count += 1;
  return null;
}
