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

### Prompt 16: Cozy Fantasy RPG / Illustrated Storybook UI/UX Transformation

*(A reference image was attached depicting a cozy fantasy RPG storybook adventure game interface featuring an illustrated character in a twilight enchanted forest, warm parchment panels with hand-drawn botanical vine borders, Quest / Skills / Items / Equip / Status tabs, character status HUD, mini-map, and controller/keyboard prompt footer.)*

> Lets make some ui/ux changes i have given u refrence image and here are specifics:
>
> UI / UX SPECIFICATIONS
> Design Style:
> - Cozy fantasy RPG / illustrated storybook aesthetic
> - Hand-drawn, whimsical, nature-inspired interface
> - “A playable storybook brought to life”
> - Inspired by classic adventure game menus and folklore illustrations
> - Warm, nostalgic, immersive, and slightly magical
> - UI should feel physically embedded in the game world
>
> *(Full specification covering warm parchment colors, forest green & dusty lavender accents, deep twilight sky & layered foliage background, left-anchored character visual, right-anchored parchment compartments for Quests, Skills, Items, Equip, Status, classic fantasy serif typography, hand-drawn outlines, and responsive gamepad/keyboard HUD.)*

**Outcome:** Re-engineered the application interface into an enchanted storybook RPG adventure journal. Gamified conversational debts, promises, and reply drafting into Quests, Skills, Items, and Companion Bonds, while preserving 100% of the underlying chat parsing, Ghost Radar, and local AI intelligence engines with full test coverage.

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

---

### Prompt 17: V2 Fix, Upgrade and Hardening

```markdown
# WhatsUP? (The Guilt Ledger) — V2 Fix, Upgrade and Hardening Prompt

> Paste this entire file into Claude Code / Cursor at the root of the `Nekyo7/WhatsUp-` repo.
> Read `context.md` and `README.md` first. Then execute the phases in order.

---

## 0. ROLE AND MISSION

You are a senior full-stack engineer and product-minded designer working on **WhatsUP?** — a local-first web app for the hackathon challenge **"The Unread Problem — What Did I Miss?"**. Users import their chat exports and the app helps them understand and prioritize overwhelming conversations.

The app is already built. It is **not working correctly yet.** Your job in this pass is to:

1. **Fix** what is broken, starting with the data layer, so every imported chat actually works.
2. **Upgrade** the features that are weak or half-working.
3. **Add** per-person tabs.
4. **Harden** security.
5. **Rewrite** the README so it looks like a winning hackathon submission.

Do not rebuild from scratch. Keep the existing stack and architecture unless something is genuinely broken at the root, and if you change an architectural decision, say why in `context.md`.

**Existing stack (verify against the repo, do not assume):** Next.js 14, Dexie (IndexedDB), Vitest (23 tests currently), multi-provider AI (Gemini / Claude / OpenAI, BYOK, plus a local NLP fallback). Supabase is planned for **authentication only**. No chat data may ever be stored on any server.

**Non-negotiables:**
- Local-first. Chat content stays in the browser. The only thing that ever leaves the device is the specific text snippet sent to the user's chosen AI provider, and only when the user triggers an AI action.
- Hybrid AI design stays: **local heuristics** for stats, ghost detection and promise detection; **API** for summaries, briefings and translation.
- Everything must work offline except the AI calls, and those must fail gracefully.
- Do not fake data, hardcode demo numbers into real views, or hide errors. If something can't be computed, say so in the UI.

---

## 1. WORKING RULES

- **Diagnose before you fix.** For every issue below, first reproduce it, find the root cause, and write a one-line root-cause note. Then fix it. Do not patch symptoms.
- **Test with real data.** Create a fixtures folder with realistic chat exports: a 1:1 chat, a large group chat, a Hinglish chat, a chat with media/system messages, and a very large chat (50k+ messages). If the repo already has fixtures, extend them.
- **Write tests for every fix.** Add Vitest tests that would have caught each bug. The test count must go up, not down. All tests must pass before moving on.
- **Work phase by phase.** After each phase, run lint, typecheck, tests and a build. Fix everything before starting the next phase.
- **Keep a running changelog** in `context.md` (what was broken, why, what you changed).
- **Ask before destructive changes** (deleting files, changing the DB schema in a way that loses user data). For schema changes, write a Dexie migration so existing local data is not lost.
- If any requirement is ambiguous, pick the most reasonable option, state your assumption in `context.md`, and keep going. Do not stall.

---

## 2. PHASE 1 — FIX THE DATA LAYER (HIGHEST PRIORITY)

**Problem:** The data is not working properly. I want **all chats to work**, not just some. Many views show empty or zero values, which usually means the import/parse/normalize pipeline is wrong or silently dropping data.

### 2.1 Audit the pipeline end to end
Trace data from file upload → parsing → normalization → Dexie storage → selectors/queries → UI. Log or test what happens at each stage with each fixture. Find where data is lost, mis-typed, mis-dated or mis-attributed.

### 2.2 Make parsing robust
Support at minimum:
- WhatsApp `.txt` exports and `.zip` exports (with and without media).
- **Both major date formats and both 12h and 24h time**, including `DD/MM/YY`, `MM/DD/YY`, `DD/MM/YYYY`, with AM/PM variants, different separators, and the narrow no-break space characters newer exports use. Auto-detect the format from the whole file, not just the first line, and handle ambiguity (e.g. `03/04/24`) by scanning for unambiguous dates.
- Android and iOS export differences.
- **Multi-line messages** (continuation lines with no timestamp must append to the previous message).
- System messages (encryption notice, "X added Y", "X left", group icon changes, "Messages and calls are end-to-end encrypted") — classify them as system events, never as messages from a person.
- Media placeholders (`<Media omitted>`, `image omitted`, `(file attached)`, etc.), deleted messages (`This message was deleted`, `You deleted this message`), edited messages, polls, locations, contact cards, missed calls.
- Unicode, emoji, RTL scripts, Indian languages, and romanized Hinglish.
- Sender-name edge cases: names with colons, phone numbers as names, contacts saved vs unsaved, duplicate display names, the user's own name (let the user pick "which one is me" at import and persist it).
- Large files: parse in a **Web Worker**, stream or chunk, show real progress, never freeze the UI.

### 2.3 Normalize into one clean schema
Every message becomes a typed record: `id`, `chatId`, `senderId`, `timestamp` (UTC epoch + original tz note), `type` (text / media / system / deleted / call), `text`, `replyToId?`, `language?`. Every chat has `participants[]`, `isGroup`, `meId`. Keep one canonical identity per person even if the name varies slightly.

### 2.4 Make the failures visible
If a line cannot be parsed, count it and surface "X lines could not be read" with a way to inspect them. Never silently drop data. Add an **Import Report** after every import: messages parsed, participants found, date range, system messages skipped, media count, parse warnings.

### 2.5 Verify
For each fixture, assert exact expected counts (messages, per-person counts, date range). Add a debug page or dev panel (dev only) showing raw vs parsed data for any chat.

**Done when:** every fixture imports with correct counts, every chat in the dashboard shows real data, and no view shows zeros caused by a parsing bug.

---

## 3. PHASE 2 — REDESIGN GHOST DETECTION

**Problem:** The Ghost Radar shows **0 for everything**. I think the way it measures "am I being ghosted?" is wrong, so don't just tweak the old thresholds. Redesign the measurement.

### 3.1 First find out why it is 0
Identify whether the zeros come from a data bug (Phase 1), a threshold that is never reached, a wrong comparison (e.g. comparing to "now" when the export is old), or filtering that excludes everything. Write the root cause.

### 3.2 Use the right reference time
Never measure against the real current time by default. An export from 8 months ago would make everyone look ghosted. Measure against the **export's last message timestamp**, with an optional toggle "treat as of today". Show which reference time is in use.

### 3.3 Define ghosting properly (two directions)
Compute both, separately, per person:

- **They ghosted me:** I sent a message (or a question) and they have not replied, and the silence is unusual **for that person**.
- **I ghosted them (Reply Debt):** They sent a message (or a question) and I have not replied, and the silence is unusual **for me with that person**.

### 3.4 Make thresholds adaptive, not fixed
- Calculate each person's **normal reply latency** (median and 90th percentile) from the history of that conversation, excluding overnight gaps (use sleep-hour awareness: a reply at 9am to a 11pm message is normal).
- A person is "ghosting" only if the current unanswered gap is significantly beyond their own normal (e.g. > P90 × a factor and above a minimum absolute floor such as 12 hours).
- For people with too little history, fall back to sensible defaults and label confidence as **low**.
- Distinguish **conversation endings** from ghosting: if the last message was "ok", "thanks", "👍", "bye", "good night" etc., the thread closed naturally and is not ghosting. Detect this with a small multilingual closer list plus a "last message is not a question or request" check.
- Weigh **unanswered questions and requests** more heavily than statements.
- Handle **dormant relationships** (long silence from both sides) separately as "gone quiet", not ghosting.
- Handle group chats separately: per-person ghosting inside a group means "did not respond to messages that addressed or mentioned them / asked them a direct question". Do not mark group members as ghosts for ignoring general chatter.

### 3.5 Output a score, not just a flag
For each person produce: status (`active`, `slowing`, `ghosting`, `ghosted-by-me`, `gone-quiet`, `closed`), a **0–100 ghost score**, a **confidence** level, the exact evidence (the unanswered message, when it was sent, their usual reply time, how far past normal), and a plain-language explanation ("Riya usually replies in ~40 min. Your last message, a question, has been unanswered for 6 days.").

### 3.6 UI
Rebuild the Ghost Radar so it is visually clear (sorted by score, filter by direction, tap to see the evidence, link to the person's tab). Show an honest empty state when there genuinely are no ghosts, with a count of how many people were analyzed so it is obvious the feature ran.

### 3.7 Tests
Cover: normal fast replier gone silent, naturally ended conversation, overnight gaps, old exports, one-sided conversations, group mentions, low-history people, both directions.

**Done when:** the Radar shows meaningful, explainable results on the fixtures, and results change sensibly when you change the data.

---

## 4. PHASE 3 — FIX THE PROMISE LEDGER

**Problem:** The Promise Ledger is not working correctly. Treat it as a feature that tracks **commitments made in chats and whether they were kept**, in both directions (promises I made, promises others made to me).

### 4.1 Detection
Detect commitments locally first (fast, private), using pattern rules in **English, Hindi (romanized), Hinglish and common Indian-English phrasing**: "I'll send it", "will do", "kal karta hu", "I'll call you", "let me check and get back", "done by Friday", "pakka", "promise", "remind me", "I'll pay you", "we'll meet on Sunday", etc.
- Capture: who promised, to whom, what was promised, the original message, the timestamp, and any **due date or time expression** ("tomorrow", "by Friday", "next week", "kal", "parso", "EOD").
- Resolve relative dates against the **message's own timestamp**, never against today.
- Ignore false positives: hypotheticals ("I would send it if..."), questions ("will you send it?"), quotes, jokes, negations ("I won't").
- Optional AI pass (API) to improve extraction on demand, merged with the local results without duplicating them.

### 4.2 Resolution tracking
For each promise decide a status: `open`, `kept` (a later message from the promiser indicates completion, e.g. "sent", "done", "paid", "here you go", media attachment after "I'll send the photo"), `overdue` (due date passed with no sign of completion), `broken/stale` (very old, no follow-up), or `unclear`. Always show the evidence for the status.

### 4.3 Let the user override
The user can mark any promise as kept, dismissed, or wrong, and that decision is stored and respected on future re-analysis.

### 4.4 UI
A clear ledger with tabs/filters: **I owe** / **They owe me** / **Overdue** / **Kept**. Each entry shows who, what, when promised, due date, status, a link to the exact message in the chat, and a one-tap reply/follow-up draft (reuse the existing reply drafts feature).

### 4.5 Tests
Include multilingual phrases, relative date parsing, false positives, resolution detection, and user overrides.

**Done when:** the ledger returns real, accurate entries on the fixtures and the user can trust it.

---

## 5. PHASE 4 — FIX THE TRANSLATION FEATURE

**Problem:** Translation is not correct. Find out why (wrong language detection, translating things that should not be translated, truncation, mangled names/emoji, wrong target language, API errors, caching bugs) and fix all of it.

### Requirements
- **Per-message language detection**, including romanized Hindi/Hinglish and mixed-language messages. Do not translate a message that is already in the target language.
- Let the user choose the **target language** once (persisted), and translate a single message, a selection, or a whole chat.
- **Preserve** names, @mentions, emoji, URLs, numbers, and line breaks. Do not translate proper nouns or code-mixed slang into nonsense. For Hinglish, translate meaning, not word-by-word.
- Always show **original and translation side by side** (or toggle), with the detected source language and a confidence indicator.
- **Batch** requests to respect token and rate limits; **cache** results in Dexie keyed by (message hash, target language, provider) so nothing is translated twice.
- Handle failures: provider errors, rate limits, missing API key, offline. Show a clear message and fall back gracefully; never show a half-translated blank.
- Translation of summaries and AI briefings follows the same target-language setting.
- Prompt-injection safe: chat text is **data**, never instructions (see Security).

### Tests
Language detection fixtures (English, Hindi, Hinglish, Kannada, Tamil, mixed), preservation of mentions/emoji/URLs, cache hits, batching, error paths.

**Done when:** translations are correct, consistent, cached, and fail gracefully.

---

## 6. PHASE 5 — PERSONAL TABS (NEW FEATURE)

**Requirement:** **Every person should have their own personal tab.** Each tab is a dashboard about that one person and their dynamic with me, including **what this person said**, attributed clearly to them.

### 6.1 What each personal tab contains
- **Header:** name, avatar/initials, first and last message date, total messages, who talks more, a "relationship at a glance" line.
- **Stats:** message share (me vs them), average reply time both ways, busiest hours and days, longest streak, longest silence, conversation starters (who initiates more), average message length, emoji and media usage.
- **Ghost / Reply Debt status** for this person with the evidence from Phase 2.
- **Promises** between us from Phase 3 (I owe / they owe me).
- **What they said (attributed highlights):** their unanswered questions, requests they made, plans they proposed, key facts they shared (dates, places, numbers, deadlines), decisions and opinions, and notable moments — each shown with the **exact quote, date, and a jump-to-message link**. Always attribute correctly: "**Riya said** …". Local extraction first; AI pass on demand.
- **Per-person AI briefing:** "What did I miss with this person?" — a short bullet summary, open loops, suggested next action, and optional reply drafts in my tone.
- **Timeline** of the conversation with activity heat (messages per week) and important moments marked.
- **Shared topics** (top keywords/themes), shared links and media counts.
- **Personal notes:** a private notes field per person stored locally.
- **Actions:** translate this chat, export this person's summary, pin/mute this person.

### 6.2 Navigation
A people index (searchable, sortable by recency, ghost score, reply debt, message count), with each row linking to the person's tab. Deep links like `/people/[id]`. In group chats, each member also gets a tab scoped to the group (messages they sent in that group) and a combined view across all shared chats when the same person appears in several.

### 6.3 Performance
Compute person aggregates once per import and cache them in Dexie. Opening a tab must feel instant even for large chats.

**Done when:** every participant has a working, accurate, good-looking tab and "this person said this" content is correctly attributed.

---

## 7. PHASE 6 — IMPROVE THE PERSONALISE FEATURE AND AI BRIEFING

I **really like the Personalise feature** — keep it and build on it, do not remove or dilute it. The **AI briefing is a good feature, but it can be much better.**

### 7.1 Personalise
- Keep all existing personalization options working. Audit them for bugs.
- Extend it where natural: tone for reply drafts (casual, formal, short, Hinglish), summary length, language, which sections appear on the dashboard, people pinned/muted, and theme options. Persist everything locally and make settings apply instantly.
- Let personalization influence the briefing and drafts (e.g. the user's usual tone and length).

### 7.2 AI Briefing — make it genuinely useful
Upgrade the briefing from a summary into an **actionable catch-up**:
- **Priority-first:** the top of the briefing says what needs attention now (urgent questions to me, deadlines, promises due, people I'm ghosting), ranked with reasons.
- **Structured sections:** TL;DR, Needs my reply, Decisions made, Plans and dates, Promises, Things I can safely ignore, Sentiment/tone shift (only if clearly supported).
- **Bullet points with citations:** every claim links back to the source message so the user can verify it.
- **Time-window control:** "since I last opened this chat", last 24h, last 7 days, custom range.
- **Group chat intelligence:** separate signal from noise, attribute points to the right people, and surface only what concerns the user (mentions, questions to them, tasks assigned).
- **One-tap actions:** draft a reply, add to promise ledger, set a reminder, translate.
- **Quality controls:** a faithfulness instruction so the model does not invent facts; if confidence is low, say so. Show which provider/model produced it.
- **Local fallback:** a useful no-API briefing from heuristics when no key is set.
- **Streaming output** and cached results so reopening is instant; a regenerate button; token-aware chunking for huge chats (map-reduce summarization).
- Make the experience feel like a calm, premium "morning briefing" rather than a wall of text.

### 7.3 Tests
Mock the providers. Test chunking, citation integrity (every cited message id exists), fallback behavior, and cache invalidation when new data is imported.

**Done when:** the briefing is clearly more useful than before and every statement is traceable to a message.

---

## 8. PHASE 7 — SECURITY HARDENING

Improve security across the whole app. Treat all chat content and all uploaded files as **untrusted input**. Work through this checklist, fix what applies, and document the result in a `SECURITY.md`.

### 8.1 API key (BYOK) handling
- Never hardcode keys. Never commit `.env` files; confirm `.gitignore` and scan git history for leaked keys.
- Keep the user's key out of logs, URLs, error messages and analytics.
- Offer **session-only** storage as the default and an opt-in "remember on this device" that encrypts the key at rest with the **Web Crypto API** (not plaintext localStorage).
- If requests go through a Next.js API route, make it a **thin stateless proxy** that does not log or persist bodies or keys. Prefer direct client-to-provider calls where the provider allows it.

### 8.2 Injection and rendering safety
- **XSS:** never render chat text with `dangerouslySetInnerHTML`. Escape everything. Sanitize any markdown/HTML from AI output (e.g. DOMPurify or a safe markdown renderer with HTML disabled). Sanitize URLs (block `javascript:` and data URLs) and add `rel="noopener noreferrer"` to external links.
- **Prompt injection:** chat messages can contain instructions aimed at the AI ("ignore previous instructions…"). Wrap chat content in clearly delimited data blocks, tell the model it is untrusted data, never let model output trigger actions automatically, and validate/parse structured AI output with a schema (e.g. Zod) before using it.

### 8.3 File upload safety
- Enforce **file size limits**, **allowed types**, and **zip-bomb protections** (cap total uncompressed size, file count, nesting, and path traversal such as `../`). Never execute or render uploaded media as code.
- Parse in a Web Worker with timeouts so a malicious file cannot freeze or crash the tab.
- Strip or ignore unexpected files in the zip.

### 8.4 Browser and platform security
- Add strict **security headers** in `next.config.js`: `Content-Security-Policy` (no `unsafe-eval` if avoidable; restrict `connect-src` to the chosen AI providers and Supabase), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors`, and HSTS for production.
- Disable any unneeded third-party scripts. Self-host fonts and assets where possible. Add **no analytics or trackers** (this is part of the privacy story).
- Add Subresource Integrity or lock dependencies where applicable.

### 8.5 Authentication (Supabase, auth only)
- Use Supabase **only for authentication**. No chat content, summaries, names or metadata in Supabase tables or storage.
- If any table exists (e.g. profiles/settings), enable **Row Level Security** with strict per-user policies, and never expose the service-role key to the client.
- Use secure cookies/session handling, validate sessions on any server route, and add rate limiting on auth and proxy endpoints.
- Make the app usable in **guest/local mode** without an account so judges can try it instantly.

### 8.6 Data protection on device
- Provide a **"Delete all my data"** button that wipes IndexedDB, caches and stored keys.
- Offer an optional **local app lock / encryption at rest** for the Dexie database (passphrase-derived key), clearly labeled optional.
- Offer a **redact PII before sending to AI** option (phone numbers, emails, card-like numbers, Aadhaar/PAN-style patterns) and show the user exactly what will be sent before the first AI call.
- Keep the **privacy badge** accurate: it must reflect reality (what is local, what is sent, to which provider).

### 8.7 Supply chain and hygiene
- Run `npm audit` and fix or document issues; pin versions; remove unused dependencies.
- Add a dependency-scan step (e.g. a GitHub Action with `npm audit` / Dependabot config).
- Don't leak stack traces or internal errors to the UI; log safely in dev only.

### 8.8 Tests
Add tests for sanitization (XSS payloads), zip-bomb and path-traversal rejection, size limits, schema validation of AI output, key storage encryption round-trip, and PII redaction.

**Done when:** `SECURITY.md` documents the threat model, every item above is implemented or has a stated reason, and the tests pass.

---

## 9. PHASE 8 — README THAT WINS

**Requirement:** The old README must change. Make the new one **absolutely excellent** — the kind of README that makes a judge want to try the app in the first ten seconds. You may (and should) add **screenshots and GIFs of the website**.

### 9.1 Screenshots and media
- Run the app with realistic **synthetic demo data** (never real personal chats) and capture screenshots using Playwright (or the best available tool) at a consistent viewport, light and dark if both exist.
- Save to `docs/images/` with clean names and reference them with relative paths. Capture at least: landing/import screen, dashboard, Ghost Radar, Promise Ledger, a person's personal tab, AI briefing, translation side-by-side, Personalise settings, privacy badge/security panel, and mobile view.
- If possible, add a short **demo GIF** of the import-to-briefing flow. Optimize image sizes.
- Include a seeded **demo mode / sample dataset** in the repo so anyone can load realistic fake chats with one click.

### 9.2 Structure
1. **Hero:** logo/title, one-line tagline, badges (build, tests, license, Next.js, local-first, privacy), a hero screenshot or GIF, and a live demo link if deployed.
2. **The problem:** "The Unread Problem — What Did I Miss?" in 3–4 punchy lines.
3. **The solution and the unique angle** (the Guilt Ledger): what makes this different from every other submission on the same problem statement.
4. **Feature tour** with a screenshot per feature: import report, people stats, Ghost Radar (both directions), Promise Ledger, personal tabs, AI briefing, translation, reply drafts, Reply Debt score, Wrapped-style recap, Personalise, privacy badge.
5. **How it works:** a clean architecture diagram (Mermaid) showing import → parse → local analysis → optional AI → UI, and a **privacy/data-flow diagram** that shows exactly what stays local and what is sent.
6. **Privacy and security:** local-first, BYOK, no chat data on servers, Supabase auth-only, security headers, redaction, delete-all. Link to `SECURITY.md`.
7. **Quick start:** prerequisites, install, env setup, run, how to export a chat from WhatsApp (Android and iOS), how to add an API key, demo mode. Commands must be copy-pasteable and **tested**.
8. **Tech stack** table and **project structure** tree.
9. **Testing:** how to run the suite and what it covers.
10. **Design decisions and tradeoffs** (why hybrid AI, why local-first, why a website instead of automatic capture).
11. **Roadmap**, **limitations (be honest)**, **contributing**, **license**, **credits/team**.
12. **Hackathon info:** problem statement, how this solves it, and where to find `prompt.md`.

### 9.3 Quality bar
Scannable, visually clean, no walls of text, correct links, no broken images, consistent emoji/heading style, and every claim in the README must be true of the actual code. Verify every command and link yourself.

---

## 10. PHASE 9 — HACKATHON SUBMISSION FILES

- Update `context.md` with the changelog, architecture, assumptions, and known limitations.
- Create or update **`prompt.md`** (the prompt log required by the hackathon): include the key prompts used to build and fix the app, including this one, in order, with a short note on what each produced. Keep it honest and readable.
- Add a **`DEMO.md`** with a 3-minute demo script: exact click-through steps using the demo dataset, what to say at each step, and a fallback plan if the live demo fails.
- Add a short **FAQ for judges**: privacy, how ghost detection works, how accurate it is, what happens without an API key.

---

## 11. FINAL VERIFICATION CHECKLIST

Before you finish, run everything and confirm each item with evidence (command output or screenshot), not assumption:

- [ ] Typecheck, lint, tests and production build all pass; test count is higher than 23.
- [ ] Every fixture chat imports with correct counts; an Import Report appears.
- [ ] No dashboard view shows zeros caused by a bug.
- [ ] Ghost Radar returns explainable results in both directions with adaptive thresholds and the right reference time.
- [ ] Promise Ledger finds, tracks and resolves promises with evidence and user overrides.
- [ ] Translation is correct, cached, side-by-side, and degrades gracefully.
- [ ] Every participant has a personal tab with attributed "said this" content.
- [ ] Personalise works and influences briefings and drafts; AI briefing is priority-first with citations.
- [ ] Security checklist implemented, `SECURITY.md` written, no secrets in the repo or git history.
- [ ] README rewritten with working screenshots/GIF, tested quick start, diagrams, and honest limitations.
- [ ] `context.md`, `prompt.md` and `DEMO.md` updated.
- [ ] App works in guest/demo mode with no account and no API key.

---

## 12. HOW TO REPORT BACK

When finished, give me:
1. A short summary of the **root cause** of each original issue (data, ghost = 0, Promise Ledger, translation).
2. What you changed, phase by phase.
3. Anything you could not finish or are unsure about, and why.
4. The exact commands to run, test and demo the app.
5. A prioritized list of the top 5 things I should still do before submitting.

Be direct. Do not claim something works unless you ran it and saw it work.
```

