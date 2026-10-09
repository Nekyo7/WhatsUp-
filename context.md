# WhatsUP? — Context, Architecture & Technical Decisions

> **Hackathon Ledger & State of the Project**  
> *Last Updated: October 9, 2026*  
> *Repository: WhatsUp- (Guilt Ledger)*

---

## 1. Project Overview & Philosophy

### Problem Statement
Modern messaging users (WhatsApp, Telegram, Discord) suffer from **"Conversational Debt"** — hundreds of unread messages, forgotten promises ("bhai kal bhej dunga"), unanswered questions, and guilt from leaving close friends on read. Existing chat summarizers provide generic text dumps without addressing the human psychological burden of conversational backlog.

### The Solution: WhatsUP? (The Guilt Ledger)
WhatsUP? is a local-first conversational intelligence dashboard that audits exported chats:
1. **Zero-Server Storage / Local-First**: 100% of chat parsing, tokenization, and analytics run inside browser IndexedDB (Dexie.js).
2. **Client-Side PII Redaction**: Before any cloud AI analysis, names are masked (e.g. `Person A (You)`, `Person B`), phone numbers/emails/URLs sanitized. Names are unredacted only on the client.
3. **No Hardcoding / Real Analysis**: All metrics, Ghost Radar lanes, Promise Ledger items, and AI briefings are dynamically computed from uploaded chat exports (1-on-1 and Group chats).
4. **Universal Multi-Provider AI (BYOK)**: Supports Google Gemini, Anthropic Claude, OpenAI, and a built-in Local Real-Time NLP Synthesizer that works with zero API keys.

---

## 2. Technical Stack & Architecture

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript 5.8 |
| **Styling** | TailwindCSS, Lucide Icons, Canvas-Confetti, Recharts |
| **Local Storage** | Dexie.js (IndexedDB wrapper for local-first persistence) |
| **Date & NLP Parsing** | Chrono-node, custom multilingual/Hinglish tokenizers |
| **AI / LLM Integration** | Google Gemini API (`@google/genai` / REST), Anthropic Claude API, OpenAI API, Local Heuristic NLP Synthesizer |
| **Testing** | Vitest 3.x, TypeScript strict typing |

---

## 3. Data Pipeline & Processing Flow

```
[User Chat Export (.txt / .json)]
             │
             ▼
  [Unified Parser Engine]
  ├── WhatsApp TXT (12h/24h, DMY/MDY auto-detection, multi-line, group notices)
  ├── Telegram JSON (Groups, supergroups, direct messages)
  └── Discord JSON (Channels, guilds, author tags)
             │
             ▼
  [Local Analytics Pipeline]
  ├── Sessions & Talk Time Estimation (30-min gap clustering)
  ├── Turn-by-Turn Median Reply Latencies (<24h window)
  ├── Ghost Radar (You Ghosted, They Ghosted, Fading, Revivable, In-Sync)
  ├── Promise Ledger (Hinglish/English regex + chrono-node deadlines)
  ├── 24x7 Activity Heatmap (7 days x 24 hours grid)
  └── Group Chat Dynamics (Member breakdowns & talk shares)
             │
             ▼
  [Client Dexie.js (IndexedDB)] ──> [Zero-Server Local Cache]
             │
             ▼
  [Cloud / Local AI Synthesis Engine]
  ├── PII Redaction Masking (Client)
  ├── Multi-Provider AI (Gemini / Anthropic / OpenAI / Local NLP)
  └── Unredaction & Structured Rendering (TL;DR, Decisions, Action Items)
```

---

## 4. Key Architectural Decisions

1. **Local-First by Default**: Chat logs contain private personal discussions. The server never persists raw chat messages. Everything is stored in IndexedDB on the user's browser.
2. **Transparent Network Ledger**: Users can inspect exact network usage (API calls, bytes transmitted) via an on-screen badge.
3. **Dynamic Multi-Provider AI**: The system seamlessly connects to Gemini, Claude, or OpenAI via server environment variables OR client-side custom API keys (BYOK). If no API key is provided, an intelligent local extractive NLP engine parses topics and generates personalized reply drafts.
4. **Hinglish & Multilingual Awareness**: Tailored regex patterns and dictionary tokenizers detect Indian conversational idioms ("kal bhej dunga", "bhai", "dekh ke batata hu") for accurate promise tracking and response drafting.
5. **Group Chat Support**: Full first-class support for multi-participant chats with per-member metrics, group decisions, and team action items.

---

## 5. Development Progress & Milestones

- [x] **Universal Chat Parsers**: WhatsApp (.txt), Telegram (.json), Discord (.json).
- [x] **Local Analytics Engine**: Talk time, median reply time, sessions, 24x7 heatmap.
- [x] **Ghost Radar**: Real-time multi-lane classification (You Ghosted, They Ghosted, Fading, Revivable, In-Sync overview).
- [x] **Promise Ledger**: Automated commitment extraction with deadline parsing and smart status detection.
- [x] **Multi-Provider AI Backend**: Google Gemini + Anthropic Claude + OpenAI + Local NLP Synthesizer.
- [x] **BYOK (Bring Your Own Key) Interface**: Setting custom API keys directly in the browser UI.
- [x] **Group Chat Analytics**: Member talk shares, participant rosters, group decisions.
- [x] **Client-Side PII Redaction & Reverse Unredaction**: Zero PII leakage to third-party endpoints.
- [x] **Guilt Wrapped '26**: Dynamic end-of-year style recap cards with shareable summaries.
- [x] **Documentation & Repository Polish**: Clean code structure, comprehensive README, test suites (23/23 passing).
- [x] **Production Build Validation**: Next.js 14 production build verified and ready for Vercel/Node.js deployment.

---

## 6. Verification Status

- **Unit Tests**: 23/23 tests passing across 4 test suites (`parsers.test.ts`, `analytics.test.ts`, `redact.test.ts`, `groupAndLocalAi.test.ts`).
- **Production Build**: `npm run build` runs cleanly with zero TypeScript errors or webpack issues.
- **Tested Real Chat**: Verified with real 968-message WhatsApp export (`Chats/Udit/Udit/chat.txt`) — extracts 7 commitments, member talk times, active turn latencies, and real-time AI summaries.
