export type Platform = "whatsapp" | "telegram" | "discord";

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  timestamp: string; // ISO string
  text: string;
  isSystem: boolean;
  isMedia: boolean;
  lang?: "en" | "hinglish" | "hi" | "other";
}

export interface Chat {
  id: string;
  title: string;
  platform: Platform;
  isGroup: boolean;
  participants: string[];
  messageCount: number;
  firstMessageAt: string; // ISO
  lastMessageAt: string; // ISO
  selfName: string; // The user's identified name in this chat
}

export interface Session {
  chatId: string;
  start: string; // ISO
  end: string; // ISO
  messageCount: number;
}

export interface HeatmapPoint {
  day: number; // 0 (Sun) to 6 (Sat)
  hour: number; // 0 to 23
  count: number;
}

export interface GroupMemberStat {
  name: string;
  messageCount: number;
  messageShare: number; // 0 to 1
  talkTimeMinutes: number;
  initiatorCount: number;
  medianReplyTimeSecs: number | null;
}

export interface ChatStats {
  chatId: string;
  messageShareYou: number; // 0 to 1
  messageShareThem: number; // 0 to 1
  sessionCount: number;
  estimatedTalkTimeMinutes: number; // Sum of session durations + baseline estimation
  initiatorShareYou: number; // 0 to 1
  initiatorShareThem: number; // 0 to 1
  medianReplyTimeYouSecs: number | null; // null if no replies recorded
  medianReplyTimeThemSecs: number | null;
  heatmap: HeatmapPoint[]; // 7x24 grid
  lastMessageFrom: string;
  daysSinceLastMessage: number;
  messagesPerWeekRecent: number; // Last 30 days avg/week
  messagesPerWeekPeak: number; // Peak 30 days avg/week
  memberStats?: GroupMemberStat[]; // Per-member stats for group chats
  historicalLongestSilenceDays?: number;
  unansweredQuestionsCount?: number;
}

export type GhostType = "you_ghosted" | "they_ghosted" | "fading" | "revivable";

export interface GhostEntry {
  chatId: string;
  type: GhostType;
  score: number; // 0 - 100 severity/priority
  reason: string;
  daysSilent: number;
  lastMessageText: string;
  lastMessageTimestamp: string;
}

export type PromiseStatus = "open" | "done" | "stale";

export interface PromiseItem {
  id: string;
  chatId: string;
  messageId: string;
  text: string;
  sender: string;
  dueAt: string | null; // ISO or null
  status: PromiseStatus;
  confidence: number; // 0 - 1
  createdAt: string; // ISO message timestamp
}

export type TimeBudget = "15s" | "2min" | "10min";

export interface TopicItem {
  title: string;
  bullets: string[];
  sourceMessageIds: string[];
}

export interface DeadlineItem {
  title: string;
  dueAt: string | null;
  context?: string;
}

export interface Briefing {
  id?: string;
  chatId: string;
  timeBudget: TimeBudget;
  tldr: [string, string, string]; // exactly 3 punchy points
  topics: TopicItem[];
  decisions: string[];
  actionItems: string[];
  deadlines: DeadlineItem[];
  generatedAt: string; // ISO
  isDemoCached?: boolean;
}

export interface ReplyDebtBreakdown {
  score: number; // 0 - 100
  peopleWaitingCount: number;
  totalUnansweredDays: number;
  highPriorityCount: number;
  chatsInDebt: {
    chatId: string;
    chatTitle: string;
    daysWaiting: number;
    weight: number;
    lastQuestion: string;
  }[];
}

export interface NetworkLedgerState {
  apiCalls: number;
  bytesSent: number;
  lastCallAt: string | null;
}

export interface ReplyDraftOptions {
  apologetic: string;
  casual: string;
  short: string;
}

export interface WrappedData {
  topPerson: { name: string; messageCount: number; talkTimeHours: number };
  longestSilence: { name: string; days: number; whoStopped: "you" | "them" };
  promisesKept: { kept: number; total: number; percentage: number };
  replyDebtPeak: number;
  fastestReplyContact: { name: string; medianMins: number };
  mostActiveHour: string;
  aiCaption?: string;
}
