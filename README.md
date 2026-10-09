# 🚀 WhatsUP? — The Chat Guilt Ledger & Unread Command Center

> *"Other apps summarize your chats. We tell you who you've been letting down."*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB%20(Dexie)-green?style=for-the-badge)](https://dexie.org/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local--First-purple?style=for-the-badge)](https://github.com/Nekyo7/WhatsUp-)
[![Vitest](https://img.shields.io/badge/Tests-23%2F23%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)

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

## ✨ Core Features (100% Real, Dynamic & Slop-Free)

### 1. 🚨 Reply Debt Index (0 - 100 Gauge)
- Dynamically scores your conversational debt based on:
  - Number of people currently waiting on your reply
  - Cumulative unanswered days
  - Urgency of unanswered direct questions
  - Open unfulfilled commitments from the Promise Ledger
- Itemized collapsible breakdown of each conversation in debt.

### 2. 👻 4-Lane Ghost Radar
Categorizes every contact into actionable relationship triage lanes:
- **You Ghosted**: They reached out; you left them on read with an unanswered turn or question.
- **They Ghosted**: Your message went unanswered.
- **Fading**: Conversational velocity dropped >65% compared to its historical peak.
- **Revivable**: Formerly close friend dormant for >14 days.
- **In-Sync / Health Overview**: Direct visibility into healthy, active relationships with zero debt.

### 3. 📝 Promise Ledger & Deadline Tracker
- Automated detection of commitments in **English and colloquial Hinglish** ("I will finish the deck", "kal bhej dunga", "dekh ke batata hu", "thodi der me bhejta hu").
- Extracts deadlines relative to message timestamps using **chrono-node**.
- Tracks **Open**, **Fulfilled**, and **Stale (>14d)** commitments with 1-click status toggles.

### 4. 👥 People & Group Chat Leaderboard
- Works seamlessly for **1-on-1 chats and multi-member Group Chats**.
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
│  [IndexedDB (Dexie.js)] ─── Zero Server Storage!       │
│        │                                               │
│        ▼                                               │
│  [Client-Side PII Redactor]                            │
│  Masks names ("Person A"), emails, phones, URLs        │
└────────┬───────────────────────────────────────────────┘
         │ (Only redacted text sent for optional AI)
         ▼
┌────────────────────────────────────────────────────────┐
│                   AI INFERENCE LAYER                   │
│                                                        │
│  ├── Google Gemini API (Gemini 1.5/2.5 Flash)          │
│  ├── Anthropic Claude (Claude 3.5 Haiku)               │
│  ├── OpenAI API (GPT-4o-mini)                          │
│  └── Local Real-Time NLP Synthesizer (Zero API Key)   │
└────────────────────────────────────────────────────────┘
```

1. **Zero Raw Chat Persistence on Server**: 100% of messages and analysis live inside browser IndexedDB.
2. **Strict Client-Side Redaction**: Before sending text to an AI provider, names are anonymized (`Person A (You)`, `Person B`). Unredaction happens on the client.
3. **Transparent Network Ledger**: On-screen badge displays real-time network usage and outbound byte counters.
4. **Universal Multi-Provider AI + Local Fallback**:
   - Google Gemini
   - Anthropic Claude
   - OpenAI
   - **Bring Your Own Key (BYOK)** directly in the UI settings
   - **Local Real-Time NLP Engine**: If no API key is provided, the built-in extractive NLP engine analyzes the actual chat locally!

---

## 🛠️ Supported Chat Export Formats

| Platform | Format | How to Export |
|---|---|---|
| **WhatsApp** | `.txt` | Chat Settings ➔ Export Chat ➔ Without Media |
| **Telegram** | `.json` | Telegram Desktop ➔ Chat Settings ➔ Export Chat History ➔ JSON format |
| **Discord** | `.json` | Exported channel JSON logs (e.g. DiscordChatExporter) |

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
