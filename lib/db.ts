import Dexie, { type Table } from "dexie";
import type {
  Chat,
  Message,
  ChatStats,
  GhostEntry,
  PromiseItem,
  Briefing,
  CachedTranslation,
} from "@/types";

export class WhatsUpDatabase extends Dexie {
  chats!: Table<Chat, string>;
  messages!: Table<Message, string>;
  stats!: Table<ChatStats, string>;
  ghosts!: Table<GhostEntry, string>;
  promises!: Table<PromiseItem, string>;
  briefings!: Table<Briefing, string>;
  translations!: Table<CachedTranslation, string>;

  constructor() {
    super("WhatsUpBacklogDB");
    this.version(1).stores({
      chats: "id, platform, lastMessageAt, messageCount",
      messages: "id, chatId, sender, timestamp, [chatId+timestamp]",
      stats: "chatId",
      ghosts: "chatId, type, score",
      promises: "id, chatId, status, dueAt",
      briefings: "++id, chatId, timeBudget, [chatId+timeBudget]",
    });
    this.version(2).stores({
      translations: "id, hash, targetLang, provider, [hash+targetLang+provider]",
    });
  }
}

export const db = new WhatsUpDatabase();

/**
 * Completely wipe all IndexedDB data and reset application storage
 */
export async function wipeAllData(): Promise<void> {
  await db.transaction("rw", [db.chats, db.messages, db.stats, db.ghosts, db.promises, db.briefings, db.translations], async () => {
    await db.chats.clear();
    await db.messages.clear();
    await db.stats.clear();
    await db.ghosts.clear();
    await db.promises.clear();
    await db.briefings.clear();
    await db.translations.clear();
  });
  if (typeof window !== "undefined") {
    localStorage.removeItem("whatsup_network_ledger");
    localStorage.removeItem("whatsup_privacy_acknowledged");
    localStorage.removeItem("whatsup_custom_self_names");
    localStorage.removeItem("whatsup_target_language");
    localStorage.removeItem("whatsup_no_persist");
  }
}
