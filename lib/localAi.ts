import type { Briefing, ReplyDraftOptions, TimeBudget, Message } from "@/types";
import * as chrono from "chrono-node";

interface LocalBriefingParams {
  chatId: string;
  chatTitle: string;
  messages: { sender: string; text: string; timestamp: string }[];
  timeBudget: TimeBudget;
  isGroup?: boolean;
}

const HINGLISH_DICT: Record<string, string> = {
  "bhai": "bro",
  "yaar": "friend",
  "kya": "what",
  "kab": "when",
  "kaha": "where",
  "kyun": "why",
  "kaise": "how",
  "haan": "yes",
  "ha": "yes",
  "nahi": "no",
  "nhi": "no",
  "nah": "no",
  "kar": "do",
  "karna": "to do",
  "karega": "will do",
  "kardo": "please do",
  "bhej": "send",
  "bheja": "sent",
  "bhej dunga": "will send",
  "bhej diya": "sent it",
  "dekh": "look/see",
  "theek": "alright/okay",
  "thik": "alright/okay",
  "accha": "good/okay",
  "acha": "good/okay",
  "sahi": "right/correct",
  "aaj": "today",
  "kal": "tomorrow",
  "parso": "day after tomorrow",
  "hoga": "will happen",
  "raha": "doing",
  "matlab": "meaning",
  "kuch": "something",
  "aisa": "like this",
  "paise": "money",
  "kaam": "work",
  "chal": "come on/let's go",
  "chalo": "let's go",
  "sun": "listen",
  "arre": "hey",
  "are": "hey",
  "lelo": "take/include",
  "sabko": "everyone",
  "sabkoo": "everyone",
  "chutti": "holiday/leave",
  "jaldi": "quickly",
  "hojayga": "will be done",
  "karenge": "will do",
  "soch rha": "thinking",
  "batadena": "let me know",
};

/**
 * Translates Hinglish text to English using contextual vocabulary mappings
 */
export function translateHinglishLocal(text: string): { translatedText: string; detectedLanguage: string; toneNotes?: string } {
  if (!text) return { translatedText: "", detectedLanguage: "en" };

  let translated = text;
  const words = text.split(/(\s+|[.,!?]+)/);

  const transformedWords = words.map((w) => {
    const clean = w.toLowerCase().trim();
    if (HINGLISH_DICT[clean]) {
      // Preserve initial capitalization if word was capitalized
      const rep = HINGLISH_DICT[clean];
      if (w[0] && w[0] === w[0].toUpperCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    }
    return w;
  });

  translated = transformedWords.join("");

  return {
    translatedText: translated,
    detectedLanguage: "hinglish",
    toneNotes: "Casual colloquial Indian conversational tone",
  };
}

/**
 * Generates dynamic, structured AI Briefing locally based on real messages in the chat
 */
export function generateLocalBriefing({
  chatId,
  chatTitle,
  messages,
  timeBudget,
  isGroup = false,
}: LocalBriefingParams): Briefing {
  const validMsgs = messages.filter((m) => m.text && m.text.trim().length > 0);
  const recentMsgs = validMsgs.slice(-40);

  // 1. Extract questions and open requests
  const questions: { sender: string; text: string; timestamp: string }[] = [];
  const agreements: string[] = [];
  const keyTopicsMap = new Map<string, string[]>();

  const keywordsToTopic: Record<string, string> = {
    hackathon: "Hackathon & Project Build",
    project: "Project Coordination",
    expo: "Exhibition / Demo Showcase",
    deck: "Pitch Deck & Presentation",
    slide: "Presentation Slides",
    meeting: "Meeting & Calls",
    investor: "Investor Discussions",
    figma: "Design & UI Review",
    code: "Development & Engineering",
    api: "Backend & API Integration",
    trip: "Travel & Trip Planning",
    ticket: "Bookings & Travel Logistics",
    chutti: "Holiday & Vacation Schedule",
    diwali: "Diwali & Festival Plans",
    exam: "Exams & Academics",
    placement: "Placements & Career",
  };

  recentMsgs.forEach((m) => {
    const lower = m.text.toLowerCase();
    if (lower.includes("?") || lower.includes("kya") || lower.includes("kab") || lower.includes("when") || lower.includes("status")) {
      questions.push(m);
    }

    if (
      lower.includes("sure") ||
      lower.includes("done") ||
      lower.includes("booked") ||
      lower.includes("agreed") ||
      lower.includes("ha bhi") ||
      lower.includes("haa") ||
      lower.includes("lelo") ||
      lower.includes("thik")
    ) {
      agreements.push(`${m.sender}: "${m.text}"`);
    }

    // Assign to topic
    for (const [kw, topicName] of Object.entries(keywordsToTopic)) {
      if (lower.includes(kw)) {
        if (!keyTopicsMap.has(topicName)) {
          keyTopicsMap.set(topicName, []);
        }
        const bullets = keyTopicsMap.get(topicName)!;
        if (bullets.length < 3) {
          bullets.push(`${m.sender}: ${m.text}`);
        }
      }
    }
  });

  // Default topic if none matched
  if (keyTopicsMap.size === 0) {
    keyTopicsMap.set("Recent Conversation Highlights", [
      recentMsgs[0] ? `${recentMsgs[0].sender}: ${recentMsgs[0].text.slice(0, 100)}` : "Ongoing discussion",
      recentMsgs[Math.floor(recentMsgs.length / 2)]
        ? `${recentMsgs[Math.floor(recentMsgs.length / 2)].sender}: ${recentMsgs[Math.floor(recentMsgs.length / 2)].text.slice(0, 100)}`
        : "Active exchanges",
      recentMsgs[recentMsgs.length - 1]
        ? `${recentMsgs[recentMsgs.length - 1].sender}: ${recentMsgs[recentMsgs.length - 1].text.slice(0, 100)}`
        : "Latest messages pending follow-up",
    ]);
  }

  // 2. Build TL;DR based on budget & actual data
  const lastMsg = recentMsgs[recentMsgs.length - 1];
  const participantNames = Array.from(new Set(recentMsgs.map((m) => m.sender)));
  const otherParticipants = participantNames.filter((p) => p !== "You" && p !== "Person A (You)");

  let tldr: [string, string, string];

  if (timeBudget === "15s") {
    tldr = [
      lastMsg ? `Latest message from ${lastMsg.sender}: "${lastMsg.text.slice(0, 80)}"` : `Recent chat in ${chatTitle}.`,
      questions.length > 0
        ? `Pending question by ${questions[questions.length - 1].sender}: "${questions[questions.length - 1].text.slice(0, 80)}"`
        : `${recentMsgs.length} messages analyzed in this conversation thread.`,
      `Immediate action: Check thread context with ${otherParticipants.join(", ") || "participants"} and send prompt confirmation.`,
    ];
  } else if (timeBudget === "2min") {
    tldr = [
      `Active conversation covering ${Array.from(keyTopicsMap.keys()).slice(0, 2).join(" & ") || "recent updates"} with ${participantNames.join(", ")}.`,
      agreements.length > 0
        ? `Key agreement: ${agreements[agreements.length - 1]}`
        : `${questions.length} open questions/follow-ups identified in recent turns.`,
      lastMsg
        ? `Last active touchpoint was from ${lastMsg.sender} (${new Date(lastMsg.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}).`
        : "Conversation ready for triage.",
    ];
  } else {
    // 10min Deep Dive
    tldr = [
      `Comprehensive exchange analysis for ${chatTitle} (${isGroup ? "Group Discussion" : "1-on-1 Thread"} with ${participantNames.join(", ")}).`,
      `Core themes identified: ${Array.from(keyTopicsMap.keys()).join(", ")}.`,
      `Follow-up roadmap: Address ${questions.length} unanswered questions and fulfill pending commitments.`,
    ];
  }

  // 3. Format Topics
  const topics = Array.from(keyTopicsMap.entries()).map(([title, bullets]) => ({
    title,
    bullets: bullets.map((b) => b.slice(0, 140)),
    sourceMessageIds: [],
  }));

  // 4. Decisions
  const decisions = agreements.length > 0
    ? agreements.slice(-3).map((a) => a.slice(0, 120))
    : ["Keep active conversational momentum.", "Follow up on recent queries."];

  // 5. Action Items
  const actionItems = questions.length > 0
    ? questions.slice(-4).map((q) => `Reply to ${q.sender}: "${q.text.slice(0, 90)}"`)
    : [
        `Send a quick check-in to ${otherParticipants[0] || "chat participant"}.`,
        "Review conversation milestones and confirm next steps.",
      ];

  // 6. Deadlines
  const deadlines: { title: string; dueAt: string | null; context?: string }[] = [];
  recentMsgs.forEach((m) => {
    const parsed = chrono.parseDate(m.text, new Date(m.timestamp), { forwardDate: true });
    if (parsed) {
      deadlines.push({
        title: `Mentioned in chat: "${m.text.slice(0, 60)}"`,
        dueAt: parsed.toISOString(),
        context: m.sender,
      });
    }
  });

  return {
    chatId,
    timeBudget,
    tldr,
    topics,
    decisions,
    actionItems,
    deadlines: deadlines.slice(0, 4),
    generatedAt: new Date().toISOString(),
    isDemoCached: false,
  };
}

/**
 * Generates personalized, contextual reply drafts locally from the actual conversation
 */
export function generateLocalReplyDrafts(
  contactName: string,
  lastMessagesText: string
): ReplyDraftOptions {
  // Extract key topic or last question from recent messages
  const lines = lastMessagesText.split("\n").filter(Boolean);
  const lastLine = lines[lines.length - 1] || "";
  const cleanLastLine = lastLine.replace(/^\[.*?\]\s*/, "").replace(/^.*?: /, "");

  const hasQuestion = cleanLastLine.includes("?");

  let apologetic = `Hey ${contactName}, really sorry for the delay in getting back to you! Got swamped with a few things. Regarding "${cleanLastLine.slice(0, 50)}"—let's connect and get this sorted today!`;
  let casual = `Hey ${contactName}! My bad on the delay. On it right now regarding "${cleanLastLine.slice(0, 45)}"`;
  let short = `Hey ${contactName}, on it right now! Will update you in a bit.`;
  let warm = `Hi ${contactName}, thinking of you! So sorry for going quiet on you. About "${cleanLastLine.slice(0, 45)}" — let's definitely catch up and sort it out!`;
  let direct = `Hey ${contactName}, about "${cleanLastLine.slice(0, 40)}" — handling this now. Will confirm as soon as it's done.`;
  let professional = `Hello ${contactName}, apologies for the delayed response. Regarding your note on "${cleanLastLine.slice(0, 45)}", I am addressing this today and will follow up shortly.`;

  if (hasQuestion) {
    apologetic = `Hey ${contactName}, so sorry for keeping you waiting! To answer your question about "${cleanLastLine.slice(0, 45)}": Yes, let's do this! Checking the details right now.`;
    casual = `Hey ${contactName}, my bad on the late reply! Regarding "${cleanLastLine.slice(0, 40)}": On it, let me get back to you with the details shortly.`;
    short = `On it! Checking "${cleanLastLine.slice(0, 35)}" and updating you soon.`;
    warm = `Hi ${contactName}! Thanks so much for your patience. To answer "${cleanLastLine.slice(0, 40)}" — looking into this now and will send you everything with pleasure!`;
    direct = `Hey ${contactName}, regarding "${cleanLastLine.slice(0, 35)}": Yes, working on it now and will deliver an answer shortly.`;
    professional = `Hello ${contactName}, thank you for your query regarding "${cleanLastLine.slice(0, 40)}". I am reviewing the specifics and will provide a complete response today.`;
  }

  return {
    apologetic,
    casual,
    short,
    warm,
    direct,
    professional,
  };
}

/**
 * Generates personalized Guilt Wrapped AI Roasts locally
 */
export function generateLocalWrappedCaption(data: {
  topPersonName: string;
  totalTalkHours: number;
  longestSilenceDays: number;
  replyDebtScore: number;
}): { caption: string; subtitle: string; vibeTag: string } {
  const { topPersonName, totalTalkHours, longestSilenceDays, replyDebtScore } = data;

  if (replyDebtScore > 60) {
    return {
      caption: `You spent ${totalTalkHours} hours chatting with ${topPersonName}, but ghosted others for ${longestSilenceDays} straight days. Your reply debt of ${replyDebtScore}/100 is clinically dangerous.`,
      subtitle: "Certified Professional Procrastinator",
      vibeTag: "High Guilt Tier 🚨",
    };
  } else if (replyDebtScore > 25) {
    return {
      caption: `${topPersonName} is officially your conversational soulmate (${totalTalkHours}h talk time). You still left someone waiting for ${longestSilenceDays} days though!`,
      subtitle: "Selectively Responsive VIP",
      vibeTag: "Moderate Guilt ⚖️",
    };
  }

  return {
    caption: `Peak conversational discipline! You logged ${totalTalkHours}h with ${topPersonName} and kept your reply debt at a spotless ${replyDebtScore}/100. Outstanding communication health!`,
    subtitle: "Inbox Zero Royalty",
    vibeTag: "Wholesome Communicator ✨",
  };
}
