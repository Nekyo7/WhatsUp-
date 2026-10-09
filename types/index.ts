export type Platform = "whatsapp" | "telegram" | "discord";

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  timestamp: string; // ISO string
  text: string;
  isSystem: boolean;
  isMedia: boolean;
  type?: "text" | "media" | "system" | "deleted" | "call";
  replyToId?: string;
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
export type GhostStatus = "active" | "slowing" | "ghosting" | "ghosted-by-me" | "gone-quiet" | "closed";

export interface GhostEvidence {
  unansweredMessageText: string;
  unansweredTimestamp: string;
  sender: string;
  recipient: string;
  isQuestion: boolean;
  normalReplyTimeMins: number;
  daysSilent: number;
  hoursPastNormal: number;
}

export interface GhostEntry {
  chatId: string;
  personName?: string;
  type: GhostType;
  status?: GhostStatus;
  score: number; // 0 - 100 severity/priority
  confidence?: "high" | "medium" | "low";
  reason: string;
  explanation?: string;
  evidence?: GhostEvidence;
  daysSilent: number;
  lastMessageText: string;
  lastMessageTimestamp: string;
}

export type PromiseStatus = "open" | "done" | "stale";
export type PromiseDirection = "i_owe" | "they_owe_me";
export type PromiseResolution = "open" | "kept" | "overdue" | "broken" | "unclear";

export interface PromiseItem {
  id: string;
  chatId: string;
  messageId: string;
  text: string;
  sender: string;
  promiser?: string;
  promisee?: string;
  direction?: PromiseDirection; // "i_owe" | "they_owe_me"
  dueAt: string | null; // ISO or null
  status: PromiseStatus;
  resolution?: PromiseResolution;
  confidence: number; // 0 - 1
  evidence?: string;
  userOverride?: "kept" | "dismissed" | "wrong" | null;
  createdAt: string; // ISO message timestamp
}

export interface ImportReport {
  messagesParsed: number;
  participantsFound: string[];
  dateRange: { start: string; end: string };
  systemMessagesSkipped: number;
  mediaCount: number;
  unparsedLinesCount: number;
  unparsedLinesSample: string[];
  warnings: string[];
}

export interface PersonHighlight {
  type: "question" | "request" | "plan" | "fact" | "decision" | "moment";
  text: string;
  timestamp: string;
  messageId: string;
  sender: string;
}

export interface PersonProfile {
  name: string;
  chatId: string;
  avatarInitials: string;
  firstMessageAt: string;
  lastMessageAt: string;
  totalMessages: number;
  messagesSentByThem: number;
  messagesSentByMe: number;
  messageShareThem: number;
  talkTimeMinutes: number;
  medianReplyTimeThemSecs: number | null;
  medianReplyTimeMeSecs: number | null;
  busiestHours: number[];
  busiestDays: number[];
  longestStreakDays: number;
  longestSilenceDays: number;
  conversationStarterShare: number; // 0 - 1
  avgMessageLengthWords: number;
  mediaCount: number;
  ghostStatus: GhostEntry | null;
  promisesIOwe: PromiseItem[];
  promisesTheyOwe: PromiseItem[];
  highlights: PersonHighlight[];
  sharedTopics: string[];
  notes?: string;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface CachedTranslation {
  id: string;
  hash: string;
  originalText: string;
  targetLang: string;
  translatedText: string;
  detectedSourceLang: string;
  provider: string;
  timestamp: string;
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
  warm?: string;
  direct?: string;
  professional?: string;
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

