# 🎬 WhatsUP? (The Guilt Ledger) — 3-Minute Demo Script

> **Target Audience:** Hackathon Judges & Evaluators  
> **Estimated Run Time:** 3 Minutes  
> **Key Message:** *"WhatsUP? solves conversational debt—not by burying you in summaries, but by telling you who you've been leaving on read and what promises you broke, 100% locally."*

---

## ⚡ Fast-Track Preparation Checklist

Before the demo:
1. Start the app: `npm run dev`
2. Open Chrome/Brave at `http://localhost:3000`
3. Have the sample fixtures ready in a finder/explorer window:
   - `tests/fixtures/chat_1on1.txt`
   - `tests/fixtures/hinglish_chat.txt`
   - `tests/fixtures/group_chat.txt`
4. Set AI Engine to **"Local AI"** in the top-right settings (so the demo has **zero API latency and 100% offline reliability**).

---

## ⏱️ Minute-by-Minute Demo Script

### 0:00 – 0:30 | The Hook & Problem Pitch
**What to show:**
* Start on the **Cozy Storybook RPG View** or the analytical **Classic Ledger View**.
* Show the prominent **Reply Debt Index gauge (e.g. 74/100)**.

**What to say:**
> *"Every single one of us has conversational debt. We open WhatsApp, see 40 unread messages, feel a spike of guilt, and close the app. Existing AI tools just summarize long messages into shorter messages. But that doesn't answer the question that actually gives you anxiety: **Who is waiting on me? What did I promise? And who did I ghost?**  
> Meet **WhatsUP? — The Chat Guilt Ledger**."*

---

### 0:30 – 1:15 | The Import & Data Layer (Live Drop)
**What to show:**
* Click **"Import Chat"** (or drag & drop `tests/fixtures/hinglish_chat.txt` into the dropzone).
* Show the **Import Report** dialog:
  - 40+ messages parsed
  - Automatic DMY/MDY date format detection
  - Skip count for system messages and media omissions
  - 0 unparsed lines
* Point out: *"Notice that this entire file was parsed and processed 100% inside the browser using IndexedDB. No messages ever left my computer."*

---

### 1:15 – 2:00 | Ghost Radar & Promise Ledger (The Core Magic)
**What to show:**
1. **Ghost Radar:**
   - Click over to the **Ghost Radar** tab.
   - Show the 4 triage lanes: `Recent`, `Warning (3-7d)`, `Ghosted (>7d)`, `Revivable`.
   - Point to the **Directional Badges**: *"They ghosted me"* vs *"I ghosted them"*.
   - Point to the adaptive explanation: *"Silence is calibrated against this relationship's historical median reply latency and excludes night sleep hours."*
2. **Promise Ledger:**
   - Switch to the **Promise Ledger** tab.
   - Show the tabs: **"I Owe"**, **"They Owe Me"**, **"Overdue"**, **"Kept"**.
   - Show how Hinglish phrases like *"kal shaam tak bhej dunga"* are automatically recognized with confidence scores and evidence quotes.
   - Click **"Mark Kept"** to demonstrate immediate 1-click status resolution.

---

### 2:00 – 2:40 | Per-Person Tab & 5-Tone Reply Drafter
**What to show:**
1. **Per-Person Tab:**
   - In the People Leaderboard, click on a contact (e.g., **Riya**).
   - Show the **Personal Tab Modal**:
     - *"What Riya Said"* (attributed quotes, questions, and decisions)
     - Message volume share & reciprocal turnaround times
     - Mutual commitments ("I owe Riya" vs "Riya owes me")
     - Private local scratchpad notes
2. **5-Tone Guilt-Free Reply Drafter:**
   - Click **"Draft Reply"**.
   - Toggle through the 5 tone options: **Warm**, **Direct**, **Apologetic**, **Professional**, **Casual**.
   - Point out that it references the exact unanswered topic without sending any message automatically.
   - Click **"Copy Draft"**.

---

### 2:40 – 3:00 | Privacy Architecture & Closing
**What to show:**
* Point to the **Network Ledger badge**: `0 Network Bytes • Local AI Active`.
* Mention the dual theme switch: toggle between **Storybook RPG View** and **Classic Ledger View**.
* Click **"Guilt Wrapped '26"** to show the shareable annual communication recap.

**What to say:**
> *"WhatsUP? isn't a chatbot wrapper. It is a resilient, local-first conversational audit engine with zero cloud exposure, bilingual promise resolution, and adaptive relationship health metrics. It turns chat anxiety into an actionable, guilt-free inbox zero."*

---

## 🛡️ Judge Fallback Plan (If Anything Goes Wrong)

| Potential Issue | Instant Fallback Action |
|---|---|
| **No chat export file available** | Click **"Load Demo Dataset"** in the top navigation bar. It instantly populates 6 complete multi-turn chats, Recharts graphs, and heatmaps. |
| **API Provider Key is invalid / expired** | Switch AI Engine to **"Local AI"** in AI Settings. All briefings, reply drafts, and roasts execute instantly using the built-in local extractive NLP engine with zero network calls. |
| **File drag-and-drop didn't register** | Use the standard file picker button inside the **Import Chat** modal, or select one of the pre-loaded fixtures in `tests/fixtures/`. |
| **Data needs to be completely reset** | Click the **"Wipe Data"** button in the header. It purges IndexedDB and resets memory instantly. |
