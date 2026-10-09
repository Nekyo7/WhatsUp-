# 🚀 WhatsUP? — The Chat Guilt Ledger & Unread Command Center

> *"Other apps summarize your chats. We tell you who you've been letting down."*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB%20%2F%20In--Memory-green?style=for-the-badge)](https://dexie.org/)
[![UI Style](https://img.shields.io/badge/Theme-Storybook%20RPG%20%26%20Classic-parchment?style=for-the-badge&color=8DA87B)](https://github.com/Nekyo7/WhatsUp-)
[![Vitest](https://img.shields.io/badge/Tests-41%2F41%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)

---

> **Privacy Guarantee:** Analytics run 100% locally. AI is optional and sends only redacted excerpts, which you see first.  
> **Aesthetic Experience:** Features a Cozy Fantasy RPG Storybook UI ("A playable storybook brought to life") and an analytical Classic Ledger View.


---

## 📌 Problem Statement

Every day, active messaging users across **WhatsApp**, **Telegram**, and **Discord** accumulate a heavy cognitive burden: **Conversational Debt**.
- Unanswered direct questions ("Bhai kal bhej raha hai kya?")
- Forgotten commitments ("main sham tak bhej dunga")
- Close friends drifting into silence
- Overwhelming group chat backlogs

Generic chat summarizers spit out dry summaries without addressing the **guilt and social friction** of conversational backlog.

**WhatsUP? (The Guilt Ledger)** audits your exported chat history to tell you exactly **who is waiting on you, what promises you broke, and what decisions need your immediate response.**

---

## ✨ Core Features

### 1. 🚨 Reply Debt Index (0 - 100 Gauge)
- Dynamically scores your conversational debt based on:
  - Number of people currently waiting on your reply
  - Cumulative unanswered days
  - Urgency of unanswered direct questions
  - Open unfulfilled commitments from the Promise Ledger
- Itemized collapsible breakdown of each conversation in debt.

### 2. 👻 Ghost Radar (4 Triage Lanes + In-Sync Overview)
Categorizes relationships with exact timestamp heuristics:
- **You Ghosted**: Their last message(s) unanswered for more than 3 days (weighted higher for direct questions and formerly active chats; skipped for group chats with >8 members).
- **They Ghosted**: Your last message unanswered for more than 3 days.
- **Fading**: Last-30-day weekly average below 25% of the chat's own peak 30-day average.
- **Revivable**: Top 20% chat by volume silent for over 60 days.
- **In-Sync Overview**: Separate overview of healthy conversations with active reciprocal turns.
- *Notice:* Ghosted = unanswered. Chat exports have no read receipts.

### 3. 📝 Promise Ledger & Deadline Tracker
- Automated detection of commitments in **English and colloquial Hinglish** ("I will finish the deck", "kal bhej dunga", "dekh ke batata hu", "thodi der me bhejta hu").
- Tense-aware resolution: future verb forms ("dunga", "karunga") resolve due dates to tomorrow; past forms ("bheja tha", "kiya tha") leave due dates null.
- Filters negative non-commitments ("let me know", "let me see if", "I'll be there").
- Extracts deadlines relative to message timestamps using **chrono-node**.
- Tracks **Open**, **Fulfilled**, and **Stale (>14d)** commitments with 1-click status toggles and confidence scores.

### 4. 👥 People & Group Chat Leaderboard
- Works for **1-on-1 chats and multi-member Group Chats**.
- Filter by All, 1-on-1, or Group conversations.
- Computes:
  - **Estimated Talk Time** (clustered by 30-min conversational session gaps)
  - **Median Reply Turnaround Time** (excluding >24h gaps)
  - **Conversation Initiation Share** (% of sessions started by you vs. others)
  - **Multi-Member Distribution Bars** for group chats.

### 5. 📊 24x7 Activity Heatmap
- 7 days × 24 hours interactive grid visualizing your conversational biorhythm and communication hotspots.

### 6. 🏆 Guilt Wrapped '26
- End-of-year style shareable recap card:
  - #1 Favorite Human & Total Talk Time Hours
  - Longest Ghost / Silence Streak
  - % of Promises Kept vs Broken
  - Real Most Active Chatting Hour
  - AI Guilt Verdict / Roast

### 7. ⚡ AI Briefings (15s Speed / 2min Standard / 10min Deep)
- Instant context catch-up on overwhelming chat threads.
- 3-Bullet Executive TL;DR, Key Topic Clusters, Decisions Reached, Action Items for You, and Tracked Deadlines.

### 8. 💬 Context-Aware Reply Drafter
- Generates 3 guilt-relief reply variations (**Apologetic**, **Casual**, **Short**) referencing the actual topic and specific questions in the chat.

### 9. 🌐 Real-Time Hinglish Translation
- Converts colloquial Hindi-English mixed slang into clear English with tone annotations.

---

## 🔒 Privacy-First Hybrid Architecture

```
┌────────────────────────────────────────────────────────┐
│                   USER BROWSER                         │
│                                                        │
│  [Upload .txt / .json]                                 │
│        │                                               │
│        ▼                                               │
│  [Parser Engine] (WhatsApp / Telegram / Discord)       │
│        │                                               │
│        ▼                                               │
│  [Local Analytics Engine]                              │
│  (Sessions, Reply Times, Heatmaps, Ghosts, Promises)   │
│        │                                               │
│        ▼                                               │
│  [IndexedDB or In-Memory Mode]                         │
│        │                                               │
│        ▼                                               │
│  [Client-Side PII Redactor]                            │
│  Masks names, nicknames, phones, emails, UPI IDs,      │
│  Aadhaar, PAN, Cards, OTPs, PIN codes, URLs            │
└────────┬───────────────────────────────────────────────┘
         │ (Only redacted text sent for optional AI)
         ▼
┌────────────────────────────────────────────────────────┐
│                   AI INFERENCE LAYER                   │
│                                                        │
│  ├── Google Gemini API (BYOK or Server Key)            │
│  ├── Anthropic Claude (BYOK or Server Key)             │
│  ├── OpenAI-compatible Endpoint (Custom Base URL)      │
│  └── Extractive Local Fallback (No LLM / Offline)      │
└────────────────────────────────────────────────────────┘
```

1. **Analytics Run 100% Locally**: Message parsing, turn latencies, talk time, ghost detection, and promise extraction never touch the network.
2. **Best-Effort Client-Side Redaction**: Before sending text to an AI provider, names/nicknames are anonymized (`Person A (You)`, `Person B`), and sensitive Indian & global identifiers (UPI, Aadhaar, PAN, Cards, OTPs, PIN codes, phones, emails, URLs) are masked. Unredaction happens strictly in the client.
3. **Transparent Network Ledger**: On-screen badge displays real-time network usage and outbound byte counters.
4. **No-Persist Mode**: "Don't save to this browser" toggle keeps all data in RAM only, bypassing IndexedDB entirely.
5. **Multi-Provider AI + Extractive Local Fallback**:
   - Google Gemini
   - Anthropic Claude
   - OpenAI-compatible endpoints (Ollama / Local / OpenAI)
   - **Bring Your Own Key (BYOK)** directly in browser settings
   - **Extractive Fallback (No LLM)**: If no API key is provided, the extractive engine extracts key points locally without any third-party requests.

---

## 🛡️ Limitations and Threat Model

- **Redaction Limits**: Redaction is best-effort. Deterministic regexes cover names, emails, phone numbers, URLs, UPI IDs, Aadhaar numbers, PAN cards, card numbers, OTPs, and Indian PIN codes. However, unstructured contextual clues (e.g., "meet me at the blue house behind St. Xavier's") or non-text media cannot be guaranteed sanitized. Always review the "What will be sent" preview payload.
- **Unencrypted Local Storage**: By default, data stored in IndexedDB is unencrypted on your local machine file system. If using a shared computer, enable **"Don't save to this browser"** mode or click **"Wipe all data"** before closing your session.
- **Server Keys vs Direct BYOK**: When using a server environment key, redacted excerpts are routed through Next.js API endpoints to reach the AI model provider. No message logs or request bodies are saved on the server. When using direct browser BYOK, requests travel straight from the browser to the model provider.
- **Extractive Local Mode is Not an LLM**: The built-in offline local fallback is a heuristic rule-based extractor (regex pattern matching for decisions, deadlines, and questions), not a generative neural language model.

---

## 🛠️ Supported Chat Export Formats

| Platform | Format | How to Export |
|---|---|---|
| **WhatsApp** | `.txt` | Chat Settings ➔ Export Chat ➔ Without Media |
| **Telegram** | `.json` | Telegram Desktop ➔ Chat Settings ➔ Export Chat History ➔ JSON format |
| **Discord** | `.json` | Exported channel JSON logs (e.g. DiscordChatExporter) |

---

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 18.x or 20.x+
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/Nekyo7/WhatsUp-.git
cd WhatsUp-
```

### 2. Install dependencies
```bash
npm install
```

### 3. (Optional) Configure Environment Variables
```bash
cp .env.example .env.local
```
Add your preferred API key (optional — app includes a full Local Real-Time NLP Engine and supports in-app BYOK):
```env
# Optional: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Tests
```bash
npm test
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## 🚢 Deployment Guide

WhatsUP? is optimized for one-click deployment on **Vercel**, **Netlify**, or **Docker/Node.js**.

### Deploy to Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set Framework Preset to **Next.js**.
4. (Optional) Add `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` under Environment Variables.
5. Click **Deploy**.

---

## 🧪 Test Suite Coverage

The project includes unit test suites verifying edge cases:
- `tests/parsers.test.ts`: WhatsApp DMY/MDY date format auto-detection, 12h/24h timestamps, multi-line continuations, Telegram & Discord JSON router.
- `tests/analytics.test.ts`: Session talk time clustering, reply turnaround latencies, ghost classification, reply debt calculation, promise extraction.
- `tests/redact.test.ts`: PII anonymization, phone/email/URL masking, client-side unredaction.
- `tests/groupAndLocalAi.test.ts`: Group chat multi-member statistics, dynamic local AI briefings, contextual reply drafting, Hinglish translation dictionary, BYOK provider detection.

---

## 👥 Hackathon Submission

- **Repository**: [https://github.com/Nekyo7/WhatsUp-](https://github.com/Nekyo7/WhatsUp-)
- **Live Demo**: Ready for local and cloud deployment
- **Context & Roadmap**: See [context.md](file:///d:/git/WhatsUp-/context.md) for architectural records and design decisions.

*Built with ❤️ for hackers, friends, and chronically unread communicators.*
