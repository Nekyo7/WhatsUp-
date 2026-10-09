import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");
const TESTS_FIXTURES_DIR = path.resolve(__dirname, "../tests/fixtures");

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// ----------------------------------------------------
// 1. Fixture: 1-on-1 Chat (~500 messages, 6 months)
// ----------------------------------------------------
function generate1on1Chat() {
  const participants = ["Arnav", "Priya"];
  const lines: string[] = [];
  lines.push("01/10/2023, 09:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.");

  const topics = [
    ["Hey Priya! Did you start the machine learning assignment?", "Hey Arnav! Just saw it, question 3 looks super tricky.", "Yeah, gradient descent derivation is confusing.", "I'll try working through the math tonight and send you my notes.", "Awesome, let me know when you finish."],
    ["Morning! Coffee at Blue Tokai today?", "Yes please! Need caffeine urgently.", "Meet in 20 minutes?", "On my way!", "Here already, grabbed a table near the window."],
    ["Did you apply to the Google Summer of Code program?", "Drafting my proposal right now. Can you review it?", "Send over the Google Doc link.", "Here: https://docs.google.com/document/d/fake123", "Looks great! Added comments on section 2."],
    ["Are we meeting for the group project tomorrow?", "Yes, 4 PM at the library discussion room.", "Should I bring my laptop charger?", "Definitely, we'll be debugging for at least 3 hours.", "Cool, see you there."],
    ["Bhai did you see the new Next.js 14 release?", "Server Actions are crazy good!", "Finally no more boilerplate API routes for simple forms.", "I'm refactoring our hackathon project this weekend.", "Nice, let's test it together."],
    ["Happy Diwali Priya!", "Happy Diwali Arnav! Have fun with family!", "Send photos of the sweets!", "<Media omitted>", "Those laddoos look amazing!"],
    ["Can you share the lecture slides for Distributed Systems?", "Checking my downloads folder...", "Found them, attaching now.", "<Media omitted>", "Thanks a ton!"],
    ["Are you attending the tech talk by Andrej Karpathy tonight?", "Yes, registered last week! Streaming starts at 8pm.", "Let's discuss key takeaways after.", "For sure, will write a quick summary."],
    ["Hey, did you get around to pushing that pull request?", "Almost done, fixing one lint error in the auth hook.", "Take your time, no rush.", "Merged! Check PR #42.", "Super clean code, approved and merged."]
  ];

  let currentDate = new Date(Date.UTC(2023, 9, 1, 9, 15, 0));
  let arnavCount = 0;
  let priyaCount = 0;
  let mediaCount = 0;
  let systemCount = 1;

  let topicIndex = 0;
  let msgIndex = 0;

  while (msgIndex < 499) {
    const topic = topics[topicIndex % topics.length];
    for (let i = 0; i < topic.length && msgIndex < 499; i++) {
      const sender = i % 2 === 0 ? "Arnav" : "Priya";
      const text = topic[i];

      // Format: DD/MM/YYYY, HH:MM - Sender: Message
      const day = String(currentDate.getUTCDate()).padStart(2, "0");
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const year = currentDate.getUTCFullYear();
      const hours = String(currentDate.getUTCHours()).padStart(2, "0");
      const mins = String(currentDate.getUTCMinutes()).padStart(2, "0");

      lines.push(`${day}/${month}/${year}, ${hours}:${mins} - ${sender}: ${text}`);

      if (sender === "Arnav") arnavCount++;
      else priyaCount++;

      if (text.includes("<Media omitted>")) mediaCount++;
      msgIndex++;

      // Advance by 5 to 45 minutes
      currentDate = new Date(currentDate.getTime() + (5 + (msgIndex % 35)) * 60 * 1000);
    }
    // Jump forward by 4 to 18 hours for next conversation
    currentDate = new Date(currentDate.getTime() + (4 + (topicIndex % 14)) * 3600 * 1000);
    topicIndex++;
  }

  // End message from Priya waiting on Arnav (6 months mark)
  const lastDate = new Date(Date.UTC(2024, 2, 31, 18, 30, 0));
  const day = String(lastDate.getUTCDate()).padStart(2, "0");
  const month = String(lastDate.getUTCMonth() + 1).padStart(2, "0");
  const year = lastDate.getUTCFullYear();
  lines.push(`${day}/${month}/${year}, 18:30 - Priya: Hey Arnav, did you finish reviewing the final report? Let me know!`);
  priyaCount++;
  msgIndex++;

  const content = lines.join("\n");
  const meta = {
    fixtureName: "chat_1on1_500",
    totalMessages: 500,
    systemMessages: systemCount,
    mediaCount,
    participants: ["Arnav", "Priya"],
    perPersonCounts: {
      Arnav: arnavCount,
      Priya: priyaCount,
    },
    dateRange: {
      start: "2023-10-01",
      end: "2024-03-31",
    },
    platform: "whatsapp",
    isGroup: false,
  };

  return { content, meta };
}

// ----------------------------------------------------
// 2. Fixture: Group Chat (~2,000 messages, 8 people)
// ----------------------------------------------------
function generateGroupChat() {
  const members = ["Aryan", "Rohan", "Tanya", "Dev", "Sara", "Sam", "Kabir", "You"];
  const lines: string[] = [];

  lines.push("10/01/2024, 09:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.");
  lines.push('10/01/2024, 09:01 - Aryan created group "HackNation Core 2024"');
  lines.push("10/01/2024, 09:02 - Aryan added Rohan, Tanya, Dev, Sara, Sam, Kabir, and You");
  lines.push("10/01/2024, 09:03 - Tanya changed the group description");

  const systemCount = 4;
  let mediaCount = 0;
  const perPersonCounts: Record<string, number> = {};
  members.forEach((m) => (perPersonCounts[m] = 0));

  const templates = [
    (m: string) => `Hey team, daily standup: @${members[(members.indexOf(m) + 1) % members.length]} what are your blockers?`,
    (m: string) => `Working on the database schema and query indexes right now.`,
    (m: string) => `Just pushed the Figma components for dark mode!`,
    (m: string) => `Can someone test the new API endpoint on localhost:3000?`,
    (m: string) => `<Media omitted>`,
    (m: string) => `LGTM! PR approved.`,
    (m: string) => `Are we meeting at 5pm for architecture review?`,
    (m: string) => `Yes, link is on the calendar invite.`,
    (m: string) => `Don't forget to push your branch before the sync!`,
    (m: string) => `Deployed staging build to Vercel. Test it out!`,
  ];

  let currentDate = new Date(Date.UTC(2024, 0, 10, 9, 5, 0));
  let msgCount = 0;

  while (msgCount < 2000) {
    const sender = members[msgCount % members.length];
    const templateFn = templates[msgCount % templates.length];
    const text = templateFn(sender);

    const day = String(currentDate.getUTCDate()).padStart(2, "0");
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
    const year = currentDate.getUTCFullYear();
    const hours = String(currentDate.getUTCHours()).padStart(2, "0");
    const mins = String(currentDate.getUTCMinutes()).padStart(2, "0");

    lines.push(`${day}/${month}/${year}, ${hours}:${mins} - ${sender}: ${text}`);
    perPersonCounts[sender]++;
    if (text === "<Media omitted>") mediaCount++;
    msgCount++;

    // Increment time
    currentDate = new Date(currentDate.getTime() + (2 + (msgCount % 20)) * 60 * 1000);
    if (msgCount % 15 === 0) {
      currentDate = new Date(currentDate.getTime() + 6 * 3600 * 1000); // overnight or work gap
    }
  }

  const content = lines.join("\n");
  const meta = {
    fixtureName: "group_chat_2000",
    totalMessages: 2000,
    systemMessages: systemCount,
    mediaCount,
    participants: members,
    perPersonCounts,
    dateRange: {
      start: "2024-01-10",
      end: "2024-03-31",
    },
    platform: "whatsapp",
    isGroup: true,
  };

  return { content, meta };
}

// ----------------------------------------------------
// 3. Fixture: Hinglish Chat
// ----------------------------------------------------
function generateHinglishChat() {
  const content = `14/03/2024, 10:15 - Kabir: Bhai are you awake? Kaam tha ek.
14/03/2024, 10:17 - You: Haan bhai bol, kya scene hai?
14/03/2024, 10:20 - Kabir: Kal meeting hai investor ke saath. Pitch deck ka final draft kahan hai?
14/03/2024, 10:22 - You: Tension mat le bhai, mai kal shaam tak traction slides aur financial model bhej dunga pakka.
14/03/2024, 10:25 - Kabir: Sahi me? Kal 5 baje se pehle chahiye mujhe.
14/03/2024, 10:26 - You: Haan 5 baje tak ho jayega 100%.
14/03/2024, 18:00 - Kabir: Shaam ho gayi bhai, deck kahan hai?
14/03/2024, 20:30 - Kabir: Bhai please reply kar, investors wait kar rahe hain. Kab bhej raha hai?`;

  const meta = {
    fixtureName: "hinglish_chat",
    totalMessages: 8,
    systemMessages: 0,
    mediaCount: 0,
    participants: ["Kabir", "You"],
    perPersonCounts: {
      Kabir: 5,
      You: 3,
    },
    dateRange: {
      start: "2024-03-14",
      end: "2024-03-14",
    },
    platform: "whatsapp",
    isGroup: false,
  };

  return { content, meta };
}

// ----------------------------------------------------
// 4. Fixture: Media, System, Deleted & Multi-line Chat
// ----------------------------------------------------
function generateMediaSystemChat() {
  const content = `15/03/2024, 08:30 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
15/03/2024, 08:31 - Rohit created group "Ops & Release"
15/03/2024, 08:32 - Rohit added Priya and You
15/03/2024, 08:35 - Rohit: Welcome! Here is the deployment plan for v2.0:
Step 1: Run database migrations
Step 2: Deploy Next.js web worker
Step 3: Verify analytics dashboard
15/03/2024, 08:40 - Priya: <Media omitted>
15/03/2024, 08:41 - Priya: (file attached) architecture_diagram.png
15/03/2024, 08:45 - You: This message was deleted
15/03/2024, 08:46 - You: Fixed the config.
15/03/2024, 08:48 - Rohit: Let's do a quick sync before lunch.
15/03/2024, 09:00 - Missed voice call
15/03/2024, 09:05 - Priya: POLL:
Where should we eat lunch?
1. Chaayos
2. Subway
15/03/2024, 09:10 - Rohit's security code changed with Priya`;

  const meta = {
    fixtureName: "media_system_chat",
    totalMessages: 7,
    systemMessages: 5,
    mediaCount: 3, // <Media omitted>, (file attached), poll
    participants: ["Rohit", "Priya", "You"],
    perPersonCounts: {
      Rohit: 2,
      Priya: 3,
      You: 2,
    },
    dateRange: {
      start: "2024-03-15",
      end: "2024-03-15",
    },
    platform: "whatsapp",
    isGroup: true,
  };

  return { content, meta };
}

// ----------------------------------------------------
// 5. Fixture: iOS Format Chat ([DD/MM/YY, 12h AM/PM])
// ----------------------------------------------------
function generateIosFormatChat() {
  const content = `[12/03/24, 10:15:20\u202FAM] Rohan Sharma: Hey! Did you get time to review the contract?
[12/03/24, 10:18:45\u202FAM] You: Reviewing it right now, section 4 needs revision.
[12/03/24, 02:45:10\u202FPM] Rohan Sharma: Cool, let me know once done.
[13/03/24, 06:10:00\u202FPM] Rohan Sharma: Any update on section 4?`;

  const meta = {
    fixtureName: "ios_format_chat",
    totalMessages: 4,
    systemMessages: 0,
    mediaCount: 0,
    participants: ["Rohan Sharma", "You"],
    perPersonCounts: {
      "Rohan Sharma": 3,
      You: 1,
    },
    dateRange: {
      start: "2024-03-12",
      end: "2024-03-13",
    },
    platform: "whatsapp",
    isGroup: false,
  };

  return { content, meta };
}

// ----------------------------------------------------
// 6. Fixture: Android Format Chat (DD/MM/YYYY, 24h dash)
// ----------------------------------------------------
function generateAndroidFormatChat() {
  const content = `18/03/2024, 09:15 - Ananya: Good morning! Standup in 15 mins.
18/03/2024, 09:20 - You: Morning! Joining via mobile today.
18/03/2024, 17:45 - Ananya: Could you please push the release tags?
19/03/2024, 11:30 - Ananya: Hey, did you push the release tags? CI build is waiting.`;

  const meta = {
    fixtureName: "android_format_chat",
    totalMessages: 4,
    systemMessages: 0,
    mediaCount: 0,
    participants: ["Ananya", "You"],
    perPersonCounts: {
      Ananya: 3,
      You: 1,
    },
    dateRange: {
      start: "2024-03-18",
      end: "2024-03-19",
    },
    platform: "whatsapp",
    isGroup: false,
  };

  return { content, meta };
}

// Write all fixtures to fixtures/ and tests/fixtures/
const fixtures = [
  generate1on1Chat(),
  generateGroupChat(),
  generateHinglishChat(),
  generateMediaSystemChat(),
  generateIosFormatChat(),
  generateAndroidFormatChat(),
];

for (const f of fixtures) {
  const name = f.meta.fixtureName;
  const txtPath1 = path.join(FIXTURES_DIR, `${name}.txt`);
  const jsonPath1 = path.join(FIXTURES_DIR, `${name}.json`);
  const txtPath2 = path.join(TESTS_FIXTURES_DIR, `${name}.txt`);
  const jsonPath2 = path.join(TESTS_FIXTURES_DIR, `${name}.json`);

  fs.writeFileSync(txtPath1, f.content, "utf-8");
  fs.writeFileSync(jsonPath1, JSON.stringify(f.meta, null, 2), "utf-8");
  fs.writeFileSync(txtPath2, f.content, "utf-8");
  fs.writeFileSync(jsonPath2, JSON.stringify(f.meta, null, 2), "utf-8");

  console.log(`Generated fixture: ${name}.txt (${f.meta.totalMessages} msgs)`);
}

console.log("All Stage 0 fixtures generated successfully!");
