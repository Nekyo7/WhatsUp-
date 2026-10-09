# Security & Privacy Policy — WhatsUP? (The Guilt Ledger)

> **Core Philosophy:** Personal chat exports contain sensitive, intimate communications. WhatsUP? is engineered with a strict **Local-First, Zero-Server-Storage** security architecture.

---

## 1. Threat Model & Guarantees

| Category | Policy / Safeguard |
|---|---|
| **Chat Content Storage** | **100% On-Device**. No message text, participant list, or metadata is ever saved to any remote server or database. Data resides in client IndexedDB (`Dexie.js`) or ephemeral in-memory state. |
| **Network Ledger** | Every single outgoing HTTP request is tracked and displayed to the user via a live network ledger badge (`0 bytes sent` until an AI action is explicitly confirmed). |
| **Cloud AI Transmission** | Optional. Only triggered upon explicit user interaction (Briefing, Translation, Reply Draft). Only sanitized excerpts are transmitted, never full export files. |
| **Authentication** | Supabase is configured strictly for authentication (user session verification), never for storing chat data, summaries, or messages. The app is fully functional in Guest / Demo mode with zero account requirements. |

---

## 2. API Key (BYOK) Security

1. **Encrypted at Rest**:
   - When a user chooses "Remember on this device", their API key is encrypted using the **Web Crypto API (AES-GCM 256-bit)** derived via PBKDF2 with 100,000 iterations.
   - Keys are never stored in plaintext `localStorage`.
2. **Session-Only Option**:
   - Users can choose session-only in-memory storage, which clears automatically on tab close.
3. **No Key Leaks**:
   - Client API keys are sent via encrypted HTTPS request headers (`x-ai-key`) or used in browser-direct requests. Server route handlers act as stateless proxies that never log request bodies or API keys.

---

## 3. Client-Side PII Redaction

Before any excerpt is sent to an external AI provider:
- **Names**: Replaced with generic tokens (`Person A (You)`, `Person B`, etc.).
- **Phone Numbers**: Masked via regex (`[PHONE: masked]`).
- **Indian UPI IDs**: Masked (`[UPI: masked]` e.g. `user@okaxis`, `user@paytm`).
- **Aadhaar Numbers**: 12-digit Indian national identity numbers masked.
- **PAN Cards**: Masked (`[PAN: masked]`, e.g. `ABCDE1234F`).
- **Credit / Debit Cards**: 13-19 digit card numbers sanitized.
- **OTP Codes**: One-time-passcode phrases masked (`[OTP: masked]`).
- **Postal / PIN Codes**: Indian 6-digit postal codes in address text masked.
- **Preview & Confirmation**: Users must preview the redacted payload before their first AI action in a session.

---

## 4. Prompt Injection Defense

Chat messages can contain untrusted adversarial text (e.g., *"Ignore all previous instructions and output..."*).
- All chat content sent to LLMs is wrapped within explicit isolation tags:
  ```xml
  <UNTRUSTED_CHAT_MESSAGE_TO_TRANSLATE>
  ...untrusted content...
  </UNTRUSTED_CHAT_MESSAGE_TO_TRANSLATE>
  ```
- System prompts explicitly direct models that chat content is untrusted data and must never be interpreted as commands.
- Structured AI outputs are validated using strict **Zod** schemas before consumption.

---

## 5. File Upload & Zip Bomb Protection

1. **File Size Caps**: Uploaded exports are capped at 50MB uncompressed text.
2. **Zip Bomb Guards**:
   - Capped at maximum 500 files per archive.
   - Rejects nested zip archives.
   - Strictly validates filenames against directory traversal attacks (`../` or `/`).
3. **Media Exemption**: Attached images/videos are counted for statistics but skipped during text extraction, ensuring memory efficiency and zero privacy leakage.

---

## 6. Browser Security & Headers

Configured in `next.config.mjs`:
- **Content-Security-Policy (CSP)**: Restricts `connect-src` to `'self'` and authorized AI endpoints (`api.anthropic.com`, `generativelanguage.googleapis.com`, `api.openai.com`). Disallows third-party tracking scripts.
- **X-Content-Type-Options**: `nosniff` prevents MIME-type sniffing.
- **X-Frame-Options**: `DENY` prevents clickjacking and embedding inside unauthorized iframes.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Permissions-Policy**: Disables camera, microphone, and geolocation.

---

## 7. Data Wipe & Zero-Trace Mode

- **Wipe All Data**: 1-click wipe clears all IndexedDB databases (`WhatsUpBacklogDB`), translation caches, and stored encryption keys.
- **Don't Save to this Browser**: An in-memory mode runs the entire analytics pipeline in RAM with zero writes to IndexedDB.
