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

- [x] **Universal Chat Parsers**: WhatsApp (.txt) with unicode normalization (`\u202F`, `\u200E`), ISO/dot date formats, Telegram (.json), Discord (.json).
- [x] **Identity Selector & Live Global Switcher**: Select who "You" are during chat ingestion or switch identity on the fly across all imported chats with live real-time recalculation of all analytics.
- [x] **Local Analytics Engine**: Talk time, median reply time, sessions, 24x7 heatmap.
- [x] **Ghost Radar Metric Standardization (Step 2)**: Precise thresholds for `you_ghosted` (>3d unanswered, question/volume weighted, ≤8 participants limit), `they_ghosted` (>3d unanswered), `fading` (<25% of peak 30d average), `revivable` (>60d silence on top 20% volume chats), separate In-Sync overview, and persistent UI notice.
- [x] **Hinglish Promise Detection & Tense Disambiguation (Step 3)**: Disambiguates "kal"/"parso" into tomorrow (+24h) or parso (+48h) via future verb tense resolution (`dunga`, `bhejunga`, `karunga`), flags past references (`bheja`, `kiya`, `tha`) as non-due-dates (`dueAt: null`), adds negative filter patterns (`let me know`, `let me see if`, `I'll be there`, questions, forwards/quotes), and outputs confidence scores with 15 labeled tests.
- [x] **PII Redaction Hardening (Step 4)**: Extended client-side sanitization to mask Indian UPI IDs (`name@bank`), 12-digit Aadhaar numbers, PAN cards (`[A-Z]{5}[0-9]{4}[A-Z]{1}`), 13-19 digit card numbers, OTP phrases ("OTP is 123456"), Indian 6-digit PIN codes in address text, participant first names and nicknames, with full round-trip unredaction and explicit "Redaction is best-effort" preview requirements.
- [x] **Privacy, CSP & No-Persist Mode (Step 5)**: Replaced all marketing overclaims with honest privacy guarantees ("Analytics run 100% locally. AI is optional and sends only redacted excerpts, which you see first."), added restrictive Content-Security-Policy headers in `next.config.mjs`, built "Don't save to this browser" in-memory mode, rendered all AI outputs as safe plain text, and added the Limitations & Threat Model documentation.
- [x] **Standout Feature: Amends Mode (Step 9)**: Interactive 1-by-1 guilt payoff flow stepping through top debts, generating 3 context-aware reply drafts (Apologetic, Casual, Short), one-click copy, and "Mark Paid & Clear Score" with confetti celebration and live gauge drops.
- [x] **Standout Feature: Debt Aging Matrix & Compounding Interest (Step 10)**: Accounts-receivable aging report (0-3d Fresh, 3-7d At-Risk, 7-30d Critical, 30+d Defaulted) with dynamic penalty compounding (`Base × 1.05^days`).
- [x] **Hinglish Promise Benchmark Suite (Step 10)**: 50 hand-labeled samples with `npm run eval:promises` script and automated Vitest evaluation suite.
- [x] **Multi-Provider AI Backend & BYOK**: Google Gemini + Anthropic Claude + OpenAI-compatible + Local NLP Synthesizer.
- [x] **Guilt Wrapped '26**: Dynamic end-of-year style recap cards with shareable summaries.
- [x] **Production Build Validation**: Next.js 14 production build verified and passing cleanly with zero build errors.

---

## 6. Verification Status

- **Unit & Benchmark Tests**: 41/41 tests passing across 6 test suites (`parsers.test.ts`, `analytics.test.ts`, `promisesHinglish.test.ts`, `promisesEval.test.ts`, `redact.test.ts`, `groupAndLocalAi.test.ts`).
- **Production Build & Type Check**: `npx tsc --noEmit`, `npm run build`, and `npx vitest run` pass cleanly.
