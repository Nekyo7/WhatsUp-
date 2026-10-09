import { db, wipeAllData } from "./db";
import { parseChatFile } from "./parsers";
import { analyzeChat } from "./analytics";
import { calculateReplyDebt } from "./analytics/debt";
import type { Chat, Message, GhostEntry, ChatStats, PromiseItem, ReplyDebtBreakdown } from "@/types";

interface DemoFileDefinition {
  id: string;
  name: string;
  path: string;
  selfName: string;
}

const DEMO_FILES: DemoFileDefinition[] = [
  { id: "wa_arnav_priya_500", name: "WhatsApp Chat with Arnav & Priya (500 msgs).txt", path: "/fixtures/chat_1on1_500.txt", selfName: "Arnav" },
  { id: "wa_hacknation_2000", name: "WhatsApp Chat with HackNation Core (2000 msgs).txt", path: "/fixtures/group_chat_2000.txt", selfName: "Arnav" },
  { id: "wa_rohan_sharma", name: "WhatsApp Chat with Rohan Sharma.txt", path: "/demo/1_whatsapp_rohan_sharma.txt", selfName: "You" },
  { id: "wa_goa_trip_squad", name: "WhatsApp Chat with Goa Plan 2024.txt", path: "/demo/2_whatsapp_goa_trip_squad.txt", selfName: "You" },
  { id: "wa_tanvi_designer", name: "WhatsApp Chat with Tanvi UI UX.txt", path: "/demo/3_whatsapp_tanvi_designer.txt", selfName: "You" },
  { id: "wa_rahul_college_friend", name: "WhatsApp Chat with Rahul College.txt", path: "/demo/4_whatsapp_rahul_college_friend.txt", selfName: "You" },
  { id: "wa_mentor_arjun", name: "WhatsApp Chat with Arjun Mentor.txt", path: "/demo/5_whatsapp_mentor_arjun.txt", selfName: "You" },
  { id: "wa_startup_founders", name: "WhatsApp Chat with Founders Group.txt", path: "/demo/6_whatsapp_startup_founders.txt", selfName: "You" },
  { id: "tg_crypto_research", name: "telegram_zk_research.json", path: "/demo/7_telegram_crypto_research.json", selfName: "You" },
  { id: "dc_hackathon_team", name: "discord_hackathon.json", path: "/demo/8_discord_hackathon_team.json", selfName: "You" },
  { id: "wa_mom", name: "WhatsApp Chat with Mom.txt", path: "/demo/9_whatsapp_mom.txt", selfName: "You" },
];

// Fallback embedded contents if fetch fails (e.g. running in isolated environments)
const DEMO_CONTENTS_FALLBACK: Record<string, string> = {
  "/demo/1_whatsapp_rohan_sharma.txt": `[12/03/24, 10:15:22 AM] Rohan Sharma: Bhai are you awake?
[12/03/24, 10:16:04 AM] You: Haan bhai bol, kya hua?
[12/03/24, 10:17:15 AM] Rohan Sharma: Investor meeting Thursday ko hai. Pitch deck slides 4 to 8 completely blank hain!
[12/03/24, 10:18:30 AM] You: Chill kar, I will finish the market sizing and traction slides by tomorrow 6pm.
[12/03/24, 10:19:00 AM] Rohan Sharma: Pakka na? And what about the financial projections Excel sheet?
[12/03/24, 10:20:12 AM] You: Haan mai kal shaam tak Excel bhi bhej dunga pakka.
[13/03/24, 07:00:15 PM] Rohan Sharma: Bhai 6pm ho gaya, deck kahan hai?
[14/03/24, 11:30:22 AM] Rohan Sharma: Bro please reply... investors are asking for pre-read. Pitch deck final kiya kya? Kab bhej raha hai?`,

  "/demo/2_whatsapp_goa_trip_squad.txt": `[01/03/24, 08:30:10 PM] Messages and calls are end-to-end encrypted.
[01/03/24, 08:30:45 PM] Kabir created group "Goa Plan 2024 (Final Final)"
[01/03/24, 08:31:00 PM] Kabir added You, Priya, Vikram, and Ananya
[01/03/24, 08:32:15 PM] Kabir: Agar is baar trip cancel hui toh dosti khatam.
[01/03/24, 08:33:00 PM] Priya: Agreed! Airbnbs in Anjuna are getting booked out fast.
[01/03/24, 08:34:20 PM] Vikram: Budget kitna hai per person? 15k or 25k?
[01/03/24, 08:35:10 PM] You: Let me check the villa rates and compare flight prices tonight.
[01/03/24, 09:15:33 PM] You: <Media omitted>
[01/03/24, 09:16:00 PM] You: Bhej diya villa link. 4BHK with private pool for 18k total!
[01/03/24, 09:17:20 PM] Ananya: OMG this looks insane!! Book it now!!
[02/03/24, 11:00:15 AM] You: Haan flights and villa dono book kar diya maine. Confirmation email checked.
[02/03/24, 11:02:40 AM] Kabir: Legend bhai! Party on you in North Goa.`,

  "/demo/3_whatsapp_tanvi_designer.txt": `[08/03/24, 02:15:10 PM] Tanvi UI/UX: Hey! I just pushed the high-fidelity mockups for the dashboard redesign to Figma.
[08/03/24, 02:18:22 PM] Tanvi UI/UX: We need to finalize the typography hierarchy and color contrast for dark mode before Monday's design sprint.
[08/03/24, 02:22:45 PM] You: Awesome work Tanvi! I'll review the Figma file and leave detailed comments by tomorrow morning 10am.
[10/03/24, 04:40:12 PM] Tanvi UI/UX: Hey, just checking in. Did you get a chance to go through the Figma components?
[12/03/24, 11:15:30 AM] Tanvi UI/UX: Dev team is waiting for the tokens. Did you check the Figma prototypes? Need your sign-off before sprint planning today!`,

  "/demo/4_whatsapp_rahul_college_friend.txt": `[15/12/23, 04:00:10 PM] Rahul College: Bhai pass ho gaye semester mein!! 8.5 CGPA!
[15/12/23, 04:01:20 PM] You: Congratulations bhai!! Treat kab de raha hai?
[15/12/23, 04:05:30 PM] Rahul College: Jab tu bole. Maggi point chalein shaam ko?
[15/12/23, 04:07:00 PM] You: Haan chalte hain 6 baje.
[20/12/23, 09:30:15 PM] Rahul College: Bhai hostel room pe aa ja FIFA tournament chal raha hai.
[20/12/23, 09:31:00 PM] You: 5 min me aya.
[28/12/23, 11:20:00 PM] Rahul College: Happy new year in advance bro! College will never be the same after graduation.
[28/12/23, 11:22:15 PM] You: Same to you bhai, best 4 years of life!
[05/01/24, 03:45:10 PM] Rahul College: Bhai placement lag gayi Google me!! Party kab de raha hai placement ki?`,

  "/demo/5_whatsapp_mentor_arjun.txt": `[01/03/24, 11:10:00 AM] Arjun Mentor: Great talking to you last week. Your product thesis on local-first AI is quite intriguing.
[01/03/24, 11:15:20 AM] You: Thank you so much Arjun! Really appreciate your guidance on GTM strategy.
[05/03/24, 04:30:15 PM] You: Hi Arjun, wanted to follow up on your advice regarding our Seed round valuation cap. Are you open to a quick 10-min sync this week?`,

  "/demo/6_whatsapp_startup_founders.txt": `[10/01/24, 09:00:00 AM] Messages and calls are end-to-end encrypted.
[10/01/24, 09:01:00 AM] Dev Founder: We are hitting YC application deadline in 3 weeks.
[10/01/24, 09:05:00 AM] You: Got it, daily standup every morning at 9am.
[12/01/24, 02:00:00 PM] Dev Founder: Customer discovery interview #1 went great.
[14/01/24, 04:00:00 PM] Sara Founder: Figma prototypes are 90% ready.
[16/01/24, 06:00:00 PM] You: Great momentum guys, keeping the velocity high!
[18/01/24, 11:00:00 AM] Dev Founder: Added 5 more beta users from waitlist.
[20/01/24, 03:00:00 PM] Sara Founder: Weekly metrics: 250 signups!
[25/01/24, 05:00:00 PM] You: Let's keep pushing.
[10/02/24, 10:00:00 AM] Dev Founder: Hey team, anyone working on the demo video?
[20/02/24, 04:00:00 PM] Sara Founder: Busy with college exams this week.
[05/03/24, 02:00:00 PM] Dev Founder: Anyone still working on the pitch deck?`,

  "/demo/7_telegram_crypto_research.json": JSON.stringify({
    name: "ZK & Layer2 Alpha Group",
    type: "public_supergroup",
    id: -1001928374,
    messages: [
      { id: 101, type: "message", date: "2024-03-10T14:00:00", from: "Vitalik Fan", text: "Did anyone read the latest paper on STARK recursion efficiency benchmarks?" },
      { id: 102, type: "message", date: "2024-03-10T14:05:00", from: "You", text: "I will summarize the zero-knowledge whitepaper and benchmark results by Friday 4pm." },
      { id: 103, type: "message", date: "2024-03-11T09:30:00", from: "CryptoWhale", text: "Looking forward to your summary! The gas optimization math looked tricky." }
    ]
  }),

  "/demo/8_discord_hackathon_team.json": JSON.stringify({
    guild: { id: "987654321", name: "HackNation 2026" },
    channel: { id: "543210987", type: "GuildTextChat", name: "team-whats-up" },
    messages: [
      { id: "2001", timestamp: "2024-03-12T18:00:00.000+00:00", author: { id: "user_sam", name: "Sam Backend", nickname: "Sam (Server Guru)" }, content: "Frontend team, what is the status of the Dexie IndexedDB integration?", attachments: [] },
      { id: "2002", timestamp: "2024-03-12T18:04:10.000+00:00", author: { id: "user_you", name: "You", nickname: "You" }, content: "I'll push the Next.js API endpoints and database schema by midnight today.", attachments: [] },
      { id: "2003", timestamp: "2024-03-13T10:20:00.000+00:00", author: { id: "user_sam", name: "Sam Backend", nickname: "Sam (Server Guru)" }, content: "Hey, did you get around to pushing those endpoints? Need them for testing.", attachments: [] }
    ]
  }),

  "/demo/9_whatsapp_mom.txt": `[09/03/24, 08:00:15 AM] Mom: Beta good morning. Time pe nashta kar lena.
[09/03/24, 08:30:20 AM] You: Good morning mummy, haan kar liya.
[10/03/24, 09:15:30 PM] Mom: Beta dinner kar liya kya? Aaj office kaisa raha?
[11/03/24, 07:45:10 PM] Mom: 2 din se call nahi kiya beta. Sab theek hai na? Free hoke call karo.`
};

export async function loadDemoChatsIntoDB(
  onProgress?: (current: number, total: number, name: string) => void,
  options?: { skipWipe?: boolean; noPersist?: boolean }
): Promise<{
  chats: Chat[];
  stats: ChatStats[];
  ghosts: GhostEntry[];
  promises: PromiseItem[];
  replyDebt: ReplyDebtBreakdown;
}> {
  if (!options?.skipWipe) {
    await wipeAllData();
  }

  const total = DEMO_FILES.length;
  const parsedChats: { chat: Chat; messages: Message[] }[] = [];

  // Reference anchor date for realistic simulated demo time calculations (e.g. March 20, 2024)
  const demoReferenceTime = new Date("2024-03-20T12:00:00Z");

  for (let i = 0; i < total; i++) {
    const def = DEMO_FILES[i];
    onProgress?.(i + 1, total, def.name);

    let content = "";
    try {
      if (typeof window !== "undefined" && window.location) {
        const res = await fetch(def.path);
        if (res.ok) {
          content = await res.text();
        }
      }
    } catch {
      // ignore
    }

    if (!content) {
      content = DEMO_CONTENTS_FALLBACK[def.path] || "";
    }

    const parsed = parseChatFile(content, def.name);
    // Assign consistent deterministic ID
    parsed.chatId = def.id;
    parsed.messages.forEach((m) => {
      m.chatId = def.id;
    });

    const chatObj: Chat = {
      id: def.id,
      title: parsed.title,
      platform: parsed.platform,
      isGroup: parsed.isGroup,
      participants: parsed.participants,
      messageCount: parsed.messages.length,
      firstMessageAt: parsed.firstMessageAt,
      lastMessageAt: parsed.lastMessageAt,
      selfName: def.selfName,
    };

    parsedChats.push({
      chat: chatObj,
      messages: parsed.messages,
    });
  }

  // Analyze all chats
  const allChats = parsedChats.map((p) => p.chat);
  const allStats: ChatStats[] = [];
  const allGhosts: GhostEntry[] = [];
  const allPromises: PromiseItem[] = [];
  const allMessages: Message[] = [];

  // Dynamically compute reference time as max timestamp across chats
  const maxTs = Math.max(
    ...parsedChats.map((p) => new Date(p.chat.lastMessageAt).getTime())
  );
  const effectiveDemoRefTime = !isNaN(maxTs) && maxTs > 0 ? new Date(maxTs) : demoReferenceTime;

  for (let i = 0; i < parsedChats.length; i++) {
    const { chat, messages } = parsedChats[i];
    const analysis = analyzeChat(chat.id, messages, chat.selfName, (i + 1) / total, effectiveDemoRefTime);

    allStats.push(analysis.stats);
    if (analysis.ghost) {
      allGhosts.push(analysis.ghost);
    }
    allPromises.push(...analysis.promises);
    allMessages.push(...messages);
  }

  const replyDebt = calculateReplyDebt(allGhosts, allChats, allPromises);

  const isNoPersist = options?.noPersist ?? (typeof window !== "undefined" && localStorage.getItem("whatsup_no_persist") === "true");

  // Bulk put into Dexie DB only if persistence is permitted
  if (!isNoPersist) {
    await db.transaction("rw", [db.chats, db.messages, db.stats, db.ghosts, db.promises], async () => {
      await db.chats.bulkPut(allChats);
      await db.messages.bulkPut(allMessages);
      await db.stats.bulkPut(allStats);
      await db.ghosts.bulkPut(allGhosts);
      await db.promises.bulkPut(allPromises);
    });
  }

  return {
    chats: allChats,
    stats: allStats,
    ghosts: allGhosts,
    promises: allPromises,
    replyDebt,
  };
}
