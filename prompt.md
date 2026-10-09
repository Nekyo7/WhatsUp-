# Prompt Log: WhatsUP? (The Guilt Ledger)

This file documents the prompts used with an AI assistant (Claude) to go from the hackathon problem statement to the final project idea and the consolidated build prompt, then to an audit of the built app and an upgrade prompt. Prompts are kept in the order they were written. The user's messages are reproduced verbatim, including typos.

## Contents

1. [Problem statement](#1-problem-statement)
2. [Prompt log](#2-prompt-log)
3. [Prompt-builder choices](#3-prompt-builder-choices)
4. [Final build prompt](#4-final-build-prompt)
5. [How the idea evolved](#5-how-the-idea-evolved)
6. [Upgrade prompt](#6-upgrade-prompt)

---

## 1. Problem statement

**Challenge:** The Unread Problem — "What Did I Miss?"

The challenge is to build a simple AI micro-app that helps users quickly understand and prioritize important information from overwhelming chat conversations.

The solution can focus on:

- Summarizing long and unread conversations
- Identifying important messages, decisions, and action items
- Prioritizing information based on urgency and relevance
- Highlighting mentions, deadlines, and tasks the user may have missed
- Using local-first processing, ensuring conversations, data, and summaries never leave the user's device

---

## 2. Prompt log

### Prompt 1: Turn the problem statement into a website idea

*(A photo of the problem statement slide was attached.)*

> Take this problem statement of hackathon and turn it into idea for website.
>
> Keep in mind im participating for a hackathon.

**Outcome:** A first concept called BACKLOG, a "what did I miss?" briefing that runs entirely in the browser. Key ideas: a hybrid of rule-based heuristics plus a small local AI model, triage lanes (needs you / decisions / FYI / noise), "jump to source message" to prove nothing is hallucinated, and a privacy badge that shows network activity.

### Prompt 2: Make it unique

> ok so everyone got the same problem statement so we gotta be unique, lets think smth

**Outcome:** Five differentiating angles were proposed: Promise Ledger (what *you* owe people), Time-Budget Briefing (15 sec / 2 min / 10 min), Case Board (detective-corkboard UI), Chat Radio (offline text-to-speech bulletin), and Vibe Weather (mood layer). The recommended direction was a mashup of Promise Ledger, the time-budget slider, and a case-board look.

### Prompt 3: Expand into a full chat command center

> Ok so it requires chat convo lets make an web app with ai integration like it takes chat automatically smth that wld be cool but idts thats viable so a website it is. i want my chats to be sorted properly. like summarize and bullet point, translation. time i talked with whom and everything like proper sorting way whom i ghosted how much i talked with someone and other stuff lets ideate more

**Outcome:** The concept became a "Chat Command Center" built on imported chat exports (automatic capture is not viable on the web). Features: People view (message counts, estimated talk time, initiators, reply times, heatmaps), Ghost Radar (you ghosted / they ghosted / fading / revivable), per-chat AI briefing, Hinglish-aware translation, Promise Ledger, Reply Debt score, Wrapped-style recap, reply drafts, and a privacy badge.

### Prompt 4: Combine everything into one prompt

> lets implement all of them and create one idea prompt

**Outcome:** The assistant asked how the prompt should be built (see section 3), then produced the consolidated build prompt in section 4.

### Prompt 5: Document the prompts for submission

> can u make a prompt.md file and write all prompt i gave to u in that in proper way i have to submit it in repo for a hackathon

**Outcome:** This file.

### Prompt 6: Combine the app spec with the hackathon roadmap into one build prompt

*(Two documents were attached: the BACKLOG app spec, and a hackathon-strategist roadmap prompt. Both are reproduced verbatim below.)*

> ok heres my idea:

**Attachment 1: the app idea (BACKLOG spec)**

```text
Build a web app called BACKLOG using Next.js (App Router), TypeScript, and Tailwind CSS.

WHAT IT IS
BACKLOG turns your exported chats into a command center: who you talk to and how much, who you've ghosted, what you promised and haven't done, and an AI briefing of what you missed. The pitch line: "Other apps summarize your chats. We tell you who you've been letting down."

WHO IT'S FOR
A college student or young professional with 20+ chats across WhatsApp, Telegram, and Discord who feels guilty about unanswered messages and doesn't have time to scroll back through them. Many of their chats are Hinglish (Hindi + English mixed).

HOW THE AI AND PRIVACY WORK (hybrid, and it must be honest)
- Everything numeric is computed locally in the browser, no network: parsing, message counts, session time, reply times, initiators, heatmaps, ghost detection, reply debt, promise candidates, deadlines.
- Only these features call an LLM API, through Next.js route handlers so the API key stays server-side: summaries and bullet points, translation, promise confirmation, reply drafts, and Wrapped captions.
- Before any API call, run a local redaction step: replace contact names with "Person A/B/C", mask phone numbers, emails, and URLs, and send only the excerpt needed (never the whole export). Show the user a "What will be sent" preview with a confirm button the first time.
- Keep a visible "Network ledger" badge in the app header: it counts API calls and bytes sent this session, and reads "0 bytes sent" until an AI feature is used.
- Include a "Wipe all data" button that clears IndexedDB.
- Put all LLM calls behind one file, lib/llm.ts, so the provider can be swapped. Default to the Anthropic API using ANTHROPIC_API_KEY, with the model name in an env var.

Before writing any code, think through the data model, the parsing edge cases, and the metric definitions below. Post a short plan (under 25 lines): folder structure, the TypeScript types, and the order you'll build in. Then build step by step, and stop after each step with one line saying what works.

STACK
- Next.js App Router, TypeScript (strict), Tailwind
- Dexie (IndexedDB) for local storage
- Web Workers for parsing and analytics so the UI never freezes
- chrono-node for deadline extraction
- recharts for charts
- Zod for validating every LLM JSON response
- No auth, no database server. Everything persists in the browser.

DATA MODEL (define as TypeScript types first)
- Message: id, chatId, sender, timestamp (ISO), text, isSystem, isMedia, lang (detected)
- Chat: id, title, platform, isGroup, participants[], messageCount, firstMessageAt, lastMessageAt
- Session: chatId, start, end, messageCount (a new session starts after a 30-minute gap)
- ChatStats: per chat, computed locally. Message share you/them, session count, estimated talk time, initiator share, median reply time for you and them, hour-by-weekday heatmap, last-message-from, days since last message.
- GhostEntry: chatId, type ("you_ghosted" | "they_ghosted" | "fading" | "revivable"), score, reason, daysSilent
- Promise: id, chatId, messageId, text, dueAt (nullable), status ("open" | "done" | "stale"), confidence
- Briefing: chatId, tldr[3], topics[{title, bullets[], sourceMessageIds[]}], decisions[], actionItems[], deadlines[], timeBudget variants (15s, 2min, 10min)

BUILD STEPS

Step 1 - Project structure
Scaffold folders and empty files: app/ routes, components/, lib/parsers, lib/analytics, lib/llm.ts, lib/redact.ts, lib/db.ts (Dexie), workers/, types/, public/demo/. Add a short README with setup steps.

Step 2 - Parsers (workers/parse.worker.ts)
- WhatsApp .txt: handle both 12-hour and 24-hour time, dd/mm/yy and mm/dd/yy (auto-detect from the file), multi-line messages, system lines ("Messages are end-to-end encrypted", "X added Y"), "<Media omitted>", and deleted messages.
- Telegram JSON export and Discord JSON export as secondary parsers behind the same Message type.
- Accept multiple files at once. Let the user set "I am: ___" per chat (or pick their name from the detected senders) and save it.
- Write unit tests for the WhatsApp parser with at least 6 tricky sample lines.

Step 3 - Local analytics (lib/analytics/*, pure functions, unit-tested)
- Sessions and talk time: sum session durations. Label it "estimated" in the UI.
- Reply time: time between a message from A and the next message from B, ignoring gaps over 24h as "no reply".
- Initiator: who sends the first message of each session.
- Ghost definitions (use these exactly):
  - you_ghosted: the last message(s) are from them, you haven't replied, more than 3 days have passed. Score it higher when they asked a direct question (contains "?" or a question word), and when the chat used to be active (high past volume).
  - they_ghosted: your last message went unanswered for more than 3 days.
  - fading: the average messages per week over the last 30 days is under 25% of the chat's own peak 30-day average.
  - revivable: a formerly close chat (top 20% by volume) silent for over 60 days.
  - No read receipts exist in exports, so "ghosted" means "unanswered". Say this plainly in the UI.
- Reply Debt score: a 0-100 number combining how many people are waiting on you, how long each has waited, and how important each chat is. Show the breakdown, not just the number.
- Promise candidates: find YOUR messages matching first-person commitment patterns ("I'll", "I will", "let me", "will do", "give me till", "main kar dunga", "kal bhej dunga", and similar Hinglish forms). Use chrono-node for due dates. Mark a promise "done" if you later sent an attachment or a message that contains a completion cue ("sent", "done", "bhej diya").
```

> and also how i want you to make a plan for this idea:

**Attachment 2: the hackathon-strategist roadmap prompt**

```text
You are a senior hackathon strategist who has coached solo builders to wins at dozens of time-boxed events. I'm entering a hackathon today and I need a complete start-to-finish roadmap that gives me the best realistic shot at winning.

MY SITUATION
- Format: solo, under 12 hours total
- Problem statement / theme: [PASTE IT HERE. If it isn't announced yet, write "not announced"]
- Judging criteria: [PASTE IF KNOWN, otherwise write "unknown"]
- My strongest skills and stack: [e.g. languages, frameworks, ML, hardware, game dev]
- Tools and APIs I can use: [e.g. Claude, free-tier APIs, cloud credits, any hardware on hand]
- Hours available from now until final submission: [NUMBER]
- Demo format: [live demo / video / pitch deck / unknown]
- Anything else the organizers specified: [rules, prizes, tracks, sponsor challenges]

BEFORE YOU WRITE ANYTHING
Think through the following carefully, and do not show your reasoning. Only deliver the final roadmap.
- What do judges at this kind of event actually reward? Weigh impact, originality, technical depth, polish, and demo quality against each other.
- What realistically fits in the time I have, as one person? Be strict. A working, polished core beats an ambitious half-finished build every time.
- Where do solo builders usually lose? Over-scoping, a broken demo, a weak pitch, no sleep or food planning, and debugging at the last minute.
- Which sponsor tracks or side prizes could I stack on top of the main prize without adding real work?
If the problem statement, judging criteria, or hours available are missing and they would change the plan, ask me at most 5 short questions first and wait for my answers. Otherwise, state your assumptions in one line and proceed.

BUILD THE ROADMAP IN THESE PHASES
Handle each phase as its own focused step, in this order:

Phase 1 — Decode the game: break down the problem statement and judging criteria into what a winning submission needs to prove.
Phase 2 — Pick the idea: generate 3 candidate ideas, score each from 1 to 5 on impact, originality, feasibility in my time limit, demo-ability, and fit with my skills. Pick one and explain why in 3 sentences or fewer.
Phase 3 — Lock the scope: define the one-sentence pitch, the MVP (must work flawlessly), the "wow moment" feature, and an explicit cut list of things I will NOT build.
Phase 4 — Timeline: an hour-by-hour plan covering the full time I have, with a hard checkpoint at each phase boundary and a "feature freeze" time. Include what to do if I'm running behind at each checkpoint.
Phase 5 — Tech plan: recommend the stack, which parts to use pre-built (APIs, libraries, templates, hosted services), and which parts I must write myself. Optimize for speed and reliability, not novelty.
Phase 6 — Demo and pitch: a 3-minute pitch structure (hook, problem, demo, impact, close), a demo script with exact click-through steps, a backup plan if the live demo fails (pre-recorded video, screenshots), and tips for the visual polish that judges notice.
Phase 7 — Judge Q&A: the 10 hardest questions I'm likely to get, with strong short answers.
Phase 8 — Risk and crisis playbook: the most likely ways this goes wrong (bugs, API limits, scope creep, running out of time, burnout) and the exact response for each.
Phase 9 — Solo survival: when to eat, take breaks, and stop working to protect focus, and when to do a final test.
Phase 10 — Submission checklist: everything to verify before submitting (repo, README, demo link, deck, screenshots, team info, submission form) with a buffer of at least 30 minutes before the deadline.

OUTPUT FORMAT
Follow this exact structure, using these section names in this order:
1. Assumptions and quick answers needed (2 to 4 lines)
2. Winning thesis (what judges will reward, in 5 bullet points)
3. Idea scorecard (table of 3 ideas with scores, then the pick)
4. Scope: MVP / wow feature / cut list
5. Hour-by-hour timeline (table with time, task, deliverable, checkpoint)
6. Tech plan
7. Demo and pitch script
8. Judge Q&A
9. Risk playbook (table: risk, warning sign, response)
10. Submission checklist (tickable list)

Use tables and short bullets. No long paragraphs. Every item must be actionable by a single person in the time shown.

RULES
- I want to win, and I want to win legitimately. Do not suggest rule-breaking, plagiarism, faking functionality, or misrepresenting what the project does. Strategy and polish are fair game. Deception is not.
- Do not pad the plan with generic advice like "stay positive" or "communicate well." Everything should be specific to this event and my situation.
- Never plan for more than I can finish. If something is risky, say so and give a safer alternative.
- Flag anything you are unsure about instead of guessing, especially hackathon rules, tool limits, or technical claims you can't verify.
- Keep the roadmap tight enough that I can scan it in under 5 minutes and follow it while I'm tired.

TONE
Write like a sharp mentor sitting next to me, not an AI assistant. Be direct, plain, and a little blunt where it helps. No filler phrases, no corporate buzzwords, no robotic transitions. Skip words like "leverage," "utilize," "seamless," "cutting-edge," and "it's important to note." Short punchy lines mixed with longer ones.

AFTER DELIVERING THE ROADMAP
End by telling me what to send you next. I'll come back mid-build with my current hour and progress, and I want you to adjust the plan, cut scope, or fix problems on the spot.
```

> now combine both use both and give me a prompt for generative ai to make a website

**Outcome:** The assistant merged the two documents into one build prompt. The BACKLOG spec had been cut off after Step 3, so Steps 4 to 10 were written to finish it (storage and demo data, dashboard, redaction and network ledger, LLM routes, Promise Ledger, reply drafts and Wrapped, polish and deploy). The roadmap's strategy phases were folded in as scope tiers (P0 must work, P1 the wow, P2 cut first), an explicit not-building list, a time budget per step, a feature freeze, a 6-click demo path, a design direction, and after-build deliverables (demo script, judge Q&A, submission checklist). The honest-AI rules were kept: redaction before any API call, a "What will be sent" preview, and a network ledger.

### Prompt 7: Audit the built app and plan the next steps

*(Two files from the built project were attached: `context.md` and `README.md`.)*

> Ok so these are the context and read me file and condition of my website.
>
> analyze this and tell me what are the problems and what should we fix, suggest stuff we should add and remove.
>
> also here are some of my plans:
> I want to use supabase but only for authentication, as we need privacy. I dont want chats of user in any way but still want authentication. Someone suggested using docker and stuff idk what to do suggest smth.
>
> also i need to add api key like gemini or smth that too idk how
>
> also we need a unique elements is there a way we can stand out or smth i think everyone is doing the same thing

**Outcome:** An audit of the project docs with a prioritized fix list:

- **Privacy:** check that no real chat export or API key was ever committed; reword the "100% Local-First" and "Zero PII leakage" claims, since AI mode sends redacted excerpts to a third party; extend redaction to Indian formats (UPI IDs, Aadhaar-style numbers, PAN, card numbers, OTPs).
- **Detection logic:** "kal" is ambiguous in Hinglish (yesterday or tomorrow), so resolve it from verb tense; filter false positives such as "let me know"; make the ghost thresholds in the README, tests, and original spec agree; define what ghosting means in large group chats.
- **Demo readiness:** add a live URL and a one-click demo dataset; move model names into env vars.
- **Cut or simplify:** hype wording, the separate OpenAI provider (replace with one OpenAI-compatible endpoint), the broken `file://` link, and the "AI" label on the extractive local fallback.
- **Supabase:** skip accounts if possible; otherwise use Supabase Auth only (anonymous sign-in, optional Google) to protect the AI route, with no chat tables.
- **Docker:** skip for the hackathon, and optionally add a short Dockerfile for self-hosting later.
- **API keys:** resolve in the order browser BYOK key, then server env key, then local fallback, and rate-limit any route that uses the server key.
- **Standing out:** Amends Mode (a guided "pay off your debts" flow), debt interest and an aging report, and a published precision and recall number for Hinglish promise detection.

### Prompt 8: Turn the audit into a prompt

> write me prompt for that

**Outcome:** The upgrade prompt in section 6, written for Cursor / Claude Code to run against the existing repo.

### Prompt 9: Update this log

*(This `prompt.md` was attached.)*

> Take this md file and add all the prompts i gave to u i have to submit for a hackathon. Do not delete the old ones

**Outcome:** Prompts 6 to 9, the upgrade prompt (section 6), and the later rows of the evolution table were added. Everything that was already in the file was left as it was.

### Prompt 10: Dynamic Analysis & End-to-End Chat Engine Fixes

> Ok so firstly i can see all of it is hardcoded. we dont want Hardcoded at ALL. It should be that i give Exported chat ai analyses and then everything happens. Also it looks like it aint working like i can give a chat and it will show nothing in ghost radar and everything is empty empty when i upload a chat.
>
> Do that and other changes
>
> Also, maintain a `context.md` file throughout the hackathon to keep track of the project's context, progress, technical decisions, and pending tasks.
>
> I want our GitHub repository to be clean, professional, and exceptionally well-maintained, with excellent repository health, since it will be evaluated by the judges. We'll also need a polished, comprehensive `README.md` before the final submission.
>
> Deployment will be evaluated as well, so ensure we plan for it early, get it working as soon as possible, and thoroughly test it to make sure it's reliable and demo-ready.
>
> Treat documentation, repository quality, and deployment as important evaluation criteria throughout

**Outcome:** Removed all mock data dependencies from core paths. Connected full end-to-end multi-provider LLM calling (Anthropic, Gemini, Groq, local extractive fallback), fixed sender normalization across real WhatsApp/Telegram/Discord exports, made Ghost Radar dynamically compute from real timestamps, and maintained active `context.md` and repository health.

### Prompt 11: Production Upgrade Specification (The Guilt Ledger)

> You are upgrading an existing, working hackathon project: WhatsUP? (The Guilt Ledger), a local-first chat-export dashboard (Next.js 14 App Router, TypeScript, Tailwind, Dexie, Recharts, chrono-node, Vitest). It already has: WhatsApp/Telegram/Discord parsers, local analytics, Ghost Radar, Reply Debt, Promise Ledger, group-chat stats, PII redaction, multi-provider AI with BYOK and a local extractive fallback, Wrapped, and 23 passing tests. Read context.md and README.md first.
>
> GOAL: make it trustworthy, demo-ready, and distinctive for judging. Do not rewrite working code. Keep all 23 tests passing, and add tests for everything you change. Never fake functionality; anything synthetic is labeled "Demo data".
>
> *(Full 10-step specification: Repo safety audit, metric definitions alignment, Hinglish promise tense resolution, PII redaction hardening for Indian formats, privacy & CSP hardening, synthetic demo dataset with offline cache, centralized BYOK AI layer with rate limits, optional Supabase auth, Amends Mode interactive payoff, and debt aging & Hinglish eval suite.)*

**Outcome:** Initiated the 10-step production upgrade, verified 23 baseline passing tests, confirmed repo cleanliness, and structured the incremental execution sequence.

### Prompt 12: Proceed with Step 1 Execution

> yes start with the first step

**Outcome:** Commenced the 10-step production upgrade starting with Step 1 (Repo Safety Audit). Verified that no chat exports (`Chats/`), `.env` secrets, or API keys were tracked in git history (`6615b37`), verified `.gitignore` rules, and confirmed `.env.example` safety.

### Prompt 13: Maintain and Update Prompt History

> ok before going to step-2 can u do one thing
>
> there is prompt.md file and add all the prompts i gave to u i have to submit for a hackathon. Do not delete the old ones

**Outcome:** Updated `prompt.md` with complete fidelity, ensuring all prompts from initial ideation through to ongoing production upgrade steps are preserved chronologically with zero deletions.

### Prompt 14: Secret Remediation & Push Protection

> also heres my github personal access token: [REDACTED_PAT]
> *(Attached GitHub Push Protection secret scanning alert blocking commit `985c57b` due to GCP key in `.env.example`)*

**Outcome:** Immediate security warning provided to revoke the exposed PAT token. Sanitized `.env.example` to remove the live GCP API key with placeholder tokens, and provided exact git commit amend and clean push commands.

### Prompt 15: Step 3 Execution, Real Chat Parsing Fixes & Amends Mode

> ok lets move to step-3 
>
> also the website is till very trash the chats do not work no matter how many chats it doesnt show ghosting and stuff properly. I need to be unique too can we do something new? also can u make everything functionable and stuff

**Outcome:** Diagnosed and fixed the root causes for real chat parsing failures (unicode space normalizations `\u202F` and ISO date formats in WhatsApp exports). Added Step 2 Identity Selector in Chat Importer, a live global Identity Switcher in the top bar, built **Amends Mode** (interactive 1-by-1 guilt payoff with copyable smart replies, confetti animations, and score drops), built the **Debt Aging Matrix** (compounding interest report across 0-3d, 3-7d, 7-30d, 30+d), and built a 50-sample Hinglish promise benchmark evaluation suite (`eval:promises` with 41 passing tests).

---

## 3. Prompt-builder choices

Before the final prompt was written, the assistant asked a few setup questions. The answers were:

| Question | Answer |
|---|---|
| How do you want to build this prompt? | Custom flow (step by step) |
| Clarifying questions first? | Yes |
| Which tool will the prompt be pasted into? | Cursor / Claude Code |
| How should the AI part work? | Hybrid: local heuristics + API for summaries and translation |
| Prompt frameworks | Decomposition + Clear Instruction + Chain-of-Thought |

**Why these frameworks:**

- **Decomposition:** the app spans parsing, analytics, AI, and UI, so the build is split into 7 ordered steps that can be finished and verified one at a time.
- **Clear Instruction:** exact stack, ghost and session definitions, thresholds, JSON outputs, and routes leave nothing for the coding tool to guess.
- **Chain-of-Thought:** the tool plans the data model and parsing edge cases before writing code, which avoids rewrites mid-build.

---

## 4. Final build prompt

This is the consolidated prompt that was used to build the app. The working name in the prompt is "BACKLOG"; the project shipped as **WhatsUP? (The Guilt Ledger)**.

```text
Build a web app called BACKLOG using Next.js (App Router), TypeScript, and Tailwind CSS.

WHAT IT IS
BACKLOG turns your exported chats into a command center: who you talk to and how much, who you've ghosted, what you promised and haven't done, and an AI briefing of what you missed. The pitch line: "Other apps summarize your chats. We tell you who you've been letting down."

WHO IT'S FOR
A college student or young professional with 20+ chats across WhatsApp, Telegram, and Discord who feels guilty about unanswered messages and doesn't have time to scroll back through them. Many of their chats are Hinglish (Hindi + English mixed).

HOW THE AI AND PRIVACY WORK (hybrid, and it must be honest)
- Everything numeric is computed locally in the browser, no network: parsing, message counts, session time, reply times, initiators, heatmaps, ghost detection, reply debt, promise candidates, deadlines.
- Only these features call an LLM API, through Next.js route handlers so the API key stays server-side: summaries and bullet points, translation, promise confirmation, reply drafts, and Wrapped captions.
- Before any API call, run a local redaction step: replace contact names with "Person A/B/C", mask phone numbers, emails, and URLs, and send only the excerpt needed (never the whole export). Show the user a "What will be sent" preview with a confirm button the first time.
- Keep a visible "Network ledger" badge in the app header: it counts API calls and bytes sent this session, and reads "0 bytes sent" until an AI feature is used.
- Include a "Wipe all data" button that clears IndexedDB.
- Put all LLM calls behind one file, lib/llm.ts, so the provider can be swapped. Default to the Anthropic API using ANTHROPIC_API_KEY, with the model name in an env var.

Before writing any code, think through the data model, the parsing edge cases, and the metric definitions below. Post a short plan (under 25 lines): folder structure, the TypeScript types, and the order you'll build in. Then build step by step, and stop after each step with one line saying what works.

STACK
- Next.js App Router, TypeScript (strict), Tailwind
- Dexie (IndexedDB) for local storage
- Web Workers for parsing and analytics so the UI never freezes
- chrono-node for deadline extraction
- recharts for charts
- Zod for validating every LLM JSON response
- No auth, no database server. Everything persists in the browser.

DATA MODEL (define as TypeScript types first)
- Message: id, chatId, sender, timestamp (ISO), text, isSystem, isMedia, lang (detected)
- Chat: id, title, platform, isGroup, participants[], messageCount, firstMessageAt, lastMessageAt
- Session: chatId, start, end, messageCount (a new session starts after a 30-minute gap)
- ChatStats: per chat, computed locally. Message share you/them, session count, estimated talk time, initiator share, median reply time for you and them, hour-by-weekday heatmap, last-message-from, days since last message.
- GhostEntry: chatId, type ("you_ghosted" | "they_ghosted" | "fading" | "revivable"), score, reason, daysSilent
- Promise: id, chatId, messageId, text, dueAt (nullable), status ("open" | "done" | "stale"), confidence
- Briefing: chatId, tldr[3], topics[{title, bullets[], sourceMessageIds[]}], decisions[], actionItems[], deadlines[], timeBudget variants (15s, 2min, 10min)

BUILD STEPS

Step 1 - Project structure
Scaffold folders and empty files: app/ routes, components/, lib/parsers, lib/analytics, lib/llm.ts, lib/redact.ts, lib/db.ts (Dexie), workers/, types/, public/demo/. Add a short README with setup steps.

Step 2 - Parsers (workers/parse.worker.ts)
- WhatsApp .txt: handle both 12-hour and 24-hour time, dd/mm/yy and mm/dd/yy (auto-detect from the file), multi-line messages, system lines ("Messages are end-to-end encrypted", "X added Y"), "<Media omitted>", and deleted messages.
- Telegram JSON export and Discord JSON export as secondary parsers behind the same Message type.
- Accept multiple files at once. Let the user set "I am: ___" per chat (or pick their name from the detected senders) and save it.
- Write unit tests for the WhatsApp parser with at least 6 tricky sample lines.

Step 3 - Local analytics (lib/analytics/*, pure functions, unit-tested)
- Sessions and talk time: sum session durations. Label it "estimated" in the UI.
- Reply time: time between a message from A and the next message from B, ignoring gaps over 24h as "no reply".
- Initiator: who sends the first message of each session.
- Ghost definitions (use these exactly):
  - you_ghosted: the last message(s) are from them, you haven't replied, more than 3 days have passed. Score it higher when they asked a direct question (contains "?" or a question word), and when the chat used to be active (high past volume).
  - they_ghosted: your last message went unanswered for more than 3 days.
  - fading: the average messages per week over the last 30 days is under 25% of the chat's own peak 30-day average.
  - revivable: a formerly close chat (top 20% by volume) silent for over 60 days.
  - No read receipts exist in exports, so "ghosted" means "unanswered". Say this plainly in the UI.
- Reply Debt score: a 0-100 number combining how many people are waiting on you, how long each has waited, and how important each chat is. Show the breakdown, not just the number.
- Promise candidates: find YOUR messages matching first-person commitment patterns ("I'll", "I will", "let me", "will do", "give me till", "main kar dunga", "kal bhej dunga", and similar Hinglish forms). Use chrono-node for due dates. Mark a promise "done" if you later sent an attachment or a message that contains a completion cue ("sent", "done", "bhej diya"). Otherwise it stays open. Ask the LLM only to confirm ambiguous candidates (return JSON: is_promise, confidence, due_hint).

Step 4 - AI routes (app/api/*), each validating output with Zod
- /api/summarize: input is a redacted excerpt plus the "since last opened" boundary. Return JSON: tldr (3 lines), topics with bullets, decisions, action items, deadlines, and the source message IDs for each item.
- /api/translate: input is redacted messages plus a target language. Handle Hinglish. Keep slang and tone, don't flatten it. Return original and translation pairs.
- /api/draft: input is the last 10 messages plus 5 of your own past messages as style samples. Return 3 reply options (short, warm, apologetic-for-the-delay).
- /api/wrapped-captions: input is aggregate stats only, never message text. Return 5 short, funny captions.
- On failure or invalid JSON: retry once, then show a clear inline error. The rest of the app must keep working with no API.

Step 5 - Pages
- / : landing with the pitch line, a "Try demo data" button, and an "Import your chats" button.
- /import : drag and drop multiple files, parsing progress, the "I am ___" picker, and a "what stays on your device / what gets sent" explainer.
- /dashboard : Reply Debt score at the top with its breakdown, "Smart nudges" (e.g. "3 people are waiting on you, 2 deadlines this week"), and quick links.
- /people : a card per chat showing message count with a you/them split bar, estimated talk time, initiator share, reply times, and last-message-from. Sortable and filterable by most talked, most time, most late-night, and most recent. Include a top-10 leaderboard.
- /people/[id] : the activity heatmap, a timeline of message volume, and that chat's stats.
- /ghosts : Ghost Radar with four tabs (You ghosted / They ghosted / Fading / Revivable), ranked by score. Each row shows days silent, the reason, and a "Draft a reply" button. Add a relationship-decay line chart for the Fading tab.
- /promises : Promise Ledger listing open promises by due date and overdue age. Each has "Mark done", "Open in chat", and "Draft a reply". Add an "Export deadlines to .ics" button.
- /chat/[id] : the AI briefing. Include a time-budget slider (15 sec / 2 min / 10 min) that swaps the briefing length, a "Since I last opened it" toggle, a translate toggle with a side-by-side bilingual view, and decision / action-item / deadline cards. Clicking any card scrolls to and highlights the original message in the transcript ("jump to source"), so the user can verify nothing was made up.
- /wrapped : a Spotify-Wrapped-style swipeable story (6-8 cards): total messages, hours talked, top person, most active hour, longest ghost streak, biggest promise kept, with LLM-written captions based on stats only.
- /settings : privacy explainer, network ledger details, language preference, wipe data.

Step 6 - Demo mode (important, build this early)
Create 4 realistic fake chats in public/demo/ (a college group chat, a close friend, a project team with promises and deadlines, and a family chat), each with 800-3000 messages, mixed Hinglish, planted ghosts, planted unkept promises ("I'll send the report tonight"), and one clear "fading" friendship. The "Try demo data" button loads these instantly so the app can be demoed without real data.

Step 7 - Polish
Loading, empty, and error states on every page. Keyboard-friendly. Mobile responsive. Handle 50,000 messages without freezing (virtualize long transcripts).

DESIGN DIRECTION
Don't make a generic SaaS dashboard. Go for a "mission briefing / newsroom front page" feel: a dark, warm-paper palette, monospaced headlines, red stamp badges on urgent items ("OVERDUE", "WAITING 9 DAYS"), redacted-bar styling for noise and for hidden private text, and a corkboard-style look with a few SVG string lines connecting a decision to its follow-up task on the briefing page. Keep it sharp and slightly weird, but readable. One strong accent color (stamp red) and one secondary.

RULES
- The heuristics, not the LLM, decide ghost status, reply debt, and stats. The LLM only writes language (summaries, translations, drafts, captions) and confirms ambiguous promises.
- Never send raw, unredacted chat text to any API.
- Every AI-generated item must carry source message IDs and be clickable back to the original.
- Strict TypeScript, no "any". Small, single-purpose components. Put thresholds (3 days, 30 minutes, 60 days) in a single config file.
- Write analytics as pure functions with tests, since the demo depends on them being correct.

COPY AND TONE
All visible text in the app must sound like a real person wrote it, a friend who's a bit blunt but kind. No "Unlock insights," no "Empower your conversations," no "seamless." Examples of the right voice: "Priya has been waiting 9 days. Rough." / "You said you'd send this on Friday. It's Tuesday." Write code comments like a thoughtful developer would: clear, direct, no robotic phrasing.
```

---

## 5. How the idea evolved

| Stage | Idea | What changed |
|---|---|---|
| Prompt 1 | BACKLOG: local-first "what did I miss?" briefing | Baseline answer to the problem statement |
| Prompt 2 | Promise Ledger + Time-Budget slider + Case Board look | Shifted from "what others asked of you" to "who you're letting down" |
| Prompt 3 | Chat Command Center: People view, Ghost Radar, Reply Debt, translation, Wrapped | Expanded from one chat to your whole inbox, with relationship-level stats |
| Prompt 4 | One consolidated build prompt | All features merged into a single ordered, buildable spec |
| Prompt 6 | Spec combined with a hackathon roadmap into one build prompt | Added scope tiers, a time budget per step, a demo path, and a not-building list |
| Prompts 7 and 8 | Audit of the built app, then an upgrade prompt | Focus moved from features to trust and proof: privacy wording, redaction, demo data; plus Amends Mode, debt interest and aging, and a Hinglish accuracy eval |
| Prompt 10 | Dynamic real chat parsing & local AI fixes | Shifted all paths away from hardcoding to real dynamic chat parsing, multi-provider LLM support, and verified zero-leakage repo cleanliness |
| Prompts 11 to 15 | Production upgrade, real chat parsing fixes, Amends Mode & Hinglish eval | Solved real export date/unicode parsing, added live Identity Switcher, Amends Mode interactive payoff, Debt Aging Matrix, and 50-sample benchmark eval |

**Design decisions worth noting:**

- **Heuristics decide, the LLM writes.** Ghost status, reply debt, and stats are computed with plain code over timestamps, so they are fast, testable, and explainable. The LLM is only used for language tasks.
- **Honest privacy.** Numeric analysis stays fully on-device. AI features send only a redacted excerpt, and a network ledger shows exactly what was sent.
- **Verifiable AI.** Every AI-generated item links back to its source message.
- **Honest limits.** Exports have no read receipts, so "ghosted" is defined as "unanswered", and the UI says so.

---

## 6. Upgrade prompt

This prompt was written in response to Prompt 8. It is meant to be pasted into Cursor / Claude Code at the root of the existing WhatsUP? repo, and covers repo safety, metric fixes, Hinglish detection, redaction, privacy wording, demo data, the AI provider layer, optional auth, and the standout features from Prompt 7.

```text
You are upgrading an existing, working hackathon project: WhatsUP? (The Guilt Ledger), a local-first chat-export dashboard (Next.js 14 App Router, TypeScript, Tailwind, Dexie, Recharts, chrono-node, Vitest). It already has: WhatsApp/Telegram/Discord parsers, local analytics, Ghost Radar, Reply Debt, Promise Ledger, group-chat stats, PII redaction, multi-provider AI with BYOK and a local extractive fallback, Wrapped, and 23 passing tests. Read context.md and README.md first.

GOAL: make it trustworthy, demo-ready, and distinctive for judging. Do not rewrite working code. Keep all 23 tests passing, and add tests for everything you change. Never fake functionality; anything synthetic is labeled "Demo data".

PROCESS
1. Start with a read-only audit and post a short plan (under 25 lines): what you found, files you'll touch, build order. Do not change anything yet.
2. Then work through the steps below in order. After each step, run the tests and the type-check, then write ONE line saying what works and continue.
3. Anything destructive (deleting files, rewriting git history) you must NOT run yourself. Print the exact commands and tell me to run them.
4. If you are unsure about a claim, a library API, or a model name, say so in the step summary instead of guessing.

TIERS (cut from the bottom if I say I'm behind)
P0: Steps 1 to 5. P1: Steps 6 to 8. P2: Steps 9 to 10.

STEP 1: Repo safety audit (read-only)
- Search the working tree AND git history for committed chat exports (for example Chats/**, *.txt exports, Telegram/Discord JSON dumps), .env files, and API keys. Report findings.
- Verify .gitignore covers Chats/, .env*, and any local export folders, and that .env.example has placeholder values only.
- If anything sensitive was ever committed, print the git filter-repo commands to purge it and remind me to rotate any exposed key. Do not run them.

STEP 2: Fix metric definitions and make code, tests, and README agree
- you_ghosted: their last message(s) unanswered, more than 3 days. Higher score for a direct question and for formerly active chats. Do not apply to groups with more than 8 participants.
- they_ghosted: your last message unanswered for more than 3 days.
- fading: last-30-day weekly average below 25% of the chat's own peak 30-day average.
- revivable: a top-20%-by-volume chat silent for over 60 days.
- "In-Sync" is a separate overview, not a ghost lane. Fix the "4-lane" wording.
- Update tests and README to these exact values. Add a persistent UI note: "Ghosted = unanswered. Exports have no read receipts."

STEP 3: Hinglish promise detection fixes
- "kal", "parso" are ambiguous (yesterday or tomorrow). Resolve using verb tense: future forms (dunga, bhejunga, karunga, karta hu later) mean tomorrow; past forms (bheja, kiya, tha) mean yesterday and are NOT a due date. If unclear, leave dueAt null.
- Add negative patterns so requests and non-commitments are not promises: "let me know", "let me see if", "I'll be there" (when a pure status), questions, and quoted or forwarded text.
- Add a confidence value per promise and show it in the Ledger.
- Tests: at least 15 labeled lines in English and Hinglish.

STEP 4: Redaction hardening (lib/redact)
- Keep existing name, phone, email, URL masking. Add: UPI IDs (name@bank), Aadhaar-style 12-digit numbers, PAN format, 13-19 digit card numbers, 4-8 digit OTP phrases ("OTP is 123456"), and Indian PIN codes in address-like text.
- Also mask first names and nicknames of participants when they appear inside message text.
- Tests for each pattern plus a round-trip unredact test.
- In the UI, say "Redaction is best-effort" next to the "What will be sent" preview, which must show the exact payload and require confirmation the first time per session.

STEP 5: Privacy claims, CSP, and a no-persist mode
- Remove or reword every overclaim in the README and UI ("100% Local-First", "Zero PII leakage", "Universal", "100% Real, Dynamic & Slop-Free", "No Hardcoding"). Replace with: "Analytics run 100% locally. AI is optional and sends only redacted excerpts, which you see first."
- Add a Content-Security-Policy header in next.config limiting connect-src to 'self' plus only the AI provider hosts in use.
- Add a "Don't save to this browser" mode (keep data in memory only, nothing written to IndexedDB). Keep the existing Wipe button.
- Render all AI output as plain text, never HTML.
- Add a README "Limitations and threat model" section: redaction limits, unencrypted IndexedDB, what the server sees when a server key is used, extractive local mode is not an LLM.

STEP 6: Demo dataset and deploy readiness
- Add public/demo/ with 8 to 10 synthetic chats (mixed WhatsApp, Telegram, Discord; several in Hinglish; at least 2 you_ghosted, 1 they_ghosted, 1 fading, 1 revivable, 4 or more open promises including 1 overdue, 1 group). Funny and realistic, not lorem ipsum.
- "Load demo chats" button on the empty state. Label demo data everywhere it appears.
- Cache one briefing per demo chat so the demo works offline or if the API fails; label it "cached sample".
- Make the live URL the first line of the README once I deploy.

STEP 7: AI provider layer and API keys
- Centralize provider logic in one module. Resolution order: (1) user's BYOK key from the browser, (2) server env key, (3) local extractive fallback.
- Providers: Gemini, Anthropic, and one "OpenAI-compatible endpoint" with a custom base URL (covers OpenAI and Ollama). Remove the separate hard-coded OpenAI provider.
- Model names come from env vars (GEMINI_MODEL, ANTHROPIC_MODEL, OPENAI_COMPAT_MODEL, OPENAI_COMPAT_BASE_URL), never hard-coded. For Anthropic default to claude-haiku-5-5. For Gemini, leave the default empty and tell me to set it from the current model list.
- Where possible, BYOK calls go directly from the browser to the provider so my server never sees the chat. For Anthropic, include the required browser-access header. The Network ledger must count these calls and bytes honestly.
- Server routes: IP-based rate limiting on any route that uses the server env key, a request size cap, never log request bodies, and validate every LLM JSON response with Zod.
- Update .env.example and README with where to get keys and how to set them locally and on Vercel (no NEXT_PUBLIC_ prefix).
- Label the local fallback "Extractive (no LLM)" in the UI.

STEP 8: Optional auth (behind NEXT_PUBLIC_AUTH_ENABLED, default off)
- Supabase Auth ONLY (anonymous sign-in by default, optional Google sign-in). No tables, no chat data, no storage.
- Used only to rate-limit the server-key AI route: verify the user with the Supabase server client in the route handler before calling a model.
- Add a one-line UI statement: "We store your account, never your chats."
- The app must work fully with auth disabled.

STEP 9 (P2): Amends Mode, the standout feature
- A guided flow: walk through my top 5 debts one at a time (person, how long they've waited, the unanswered question or promise, a drafted reply in three tones from the existing drafter).
- Actions per item: Copy draft, Mark paid, Skip. Never auto-send anything.
- Reply Debt gauge animates down as items are paid; confetti when it reaches a new low. Persist paid state locally.

STEP 10 (P2): Debt interest and aging, plus a Hinglish eval
- Debt interest: each day an item stays unanswered adds a small compounding amount to its score (document the formula in the README and show the breakdown).
- Aging report: buckets 0-3d, 3-7d, 7-30d, 30+ days, shown like an accounts-receivable aging table.
- Eval: create tests/fixtures/hinglish-promises.json with 50 hand-labeled messages (promise / not promise, plus expected due date where present; I will review the labels). Add an npm script that prints precision and recall for the promise detector, and put the numbers in the README.

DEFINITION OF DONE
- npm test, type-check, and npm run build all pass.
- No API key or chat data in the repo or in the client bundle.
- README: live URL, screenshot or GIF, honest privacy section, limitations, setup, env vars, demo path.
- At the end, give me: what changed, what was cut, the exact git-history commands if needed, the demo script (6 clicks, under 3 minutes), and 10 hard judge questions with short honest answers.
```
