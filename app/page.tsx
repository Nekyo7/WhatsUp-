"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, Trash2, Shield, Upload, FileText, CheckCircle2, RotateCcw, Cpu, PlusCircle, UserCheck, HeartHandshake, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { analyzeChat } from "@/lib/analytics";
import { calculateReplyDebt } from "@/lib/analytics/debt";
import { calculateHeatmap } from "@/lib/analytics/heatmap";
import { ChatImporter } from "@/components/ChatImporter";
import { NetworkLedgerBadge } from "@/components/NetworkLedgerBadge";
import { ReplyDebtCard } from "@/components/ReplyDebtCard";
import { GhostRadar } from "@/components/GhostRadar";
import { PeopleLeaderboard } from "@/components/PeopleLeaderboard";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PromiseLedger } from "@/components/PromiseLedger";
import { BriefingModal } from "@/components/BriefingModal";
import { ReplyDraftModal } from "@/components/ReplyDraftModal";
import { WrappedModal } from "@/components/WrappedModal";
import { WipeDataModal } from "@/components/WipeDataModal";
import { ChatDetailModal } from "@/components/ChatDetailModal";
import { AISettingsModal } from "@/components/AISettingsModal";
import { AmendsModeModal } from "@/components/AmendsModeModal";
import { IdentitySwitcherModal } from "@/components/IdentitySwitcherModal";
import { PersonalTabModal } from "@/components/PersonalTabModal";
import { buildPersonProfile } from "@/lib/analytics/personProfile";
import type { Chat, Message, ChatStats, GhostEntry, PromiseItem, ReplyDebtBreakdown, HeatmapPoint, PersonProfile } from "@/types";


export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [stats, setStats] = useState<ChatStats[]>([]);
  const [ghosts, setGhosts] = useState<GhostEntry[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [replyDebt, setReplyDebt] = useState<ReplyDebtBreakdown | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [aggregateHeatmap, setAggregateHeatmap] = useState<HeatmapPoint[]>([]);

  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isDemoDataset, setIsDemoDataset] = useState(false);
  const [activeAIEngine, setActiveAIEngine] = useState<string>("Local AI");
  const [activeSelfName, setActiveSelfName] = useState<string>("You");
  const [refTimeMode, setRefTimeMode] = useState<"export" | "today">("export");

  // Modal active states
  const [activeChatForDetail, setActiveChatForDetail] = useState<Chat | null>(null);
  const [activeChatForBriefing, setActiveChatForBriefing] = useState<Chat | null>(null);
  const [activeChatForReplyDraft, setActiveChatForReplyDraft] = useState<Chat | null>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isAmendsOpen, setIsAmendsOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [activePersonProfile, setActivePersonProfile] = useState<PersonProfile | null>(null);

  // Load from Dexie on mount
  useEffect(() => {
    loadExistingDatabase();
    refreshAIEngineBadge();
    const savedSelf = localStorage.getItem("whatsup_self_name");
    if (savedSelf) setActiveSelfName(savedSelf);
  }, []);

  const refreshAIEngineBadge = () => {
    const key = localStorage.getItem("whatsup_custom_api_key");
    const provider = localStorage.getItem("whatsup_custom_provider") || "local";
    if (provider === "gemini") setActiveAIEngine("Google Gemini");
    else if (provider === "anthropic") setActiveAIEngine("Claude 3.5");
    else if (provider === "openai") setActiveAIEngine("GPT-4o");
    else setActiveAIEngine("Local Real-Time AI");
  };

  const loadExistingDatabase = async () => {
    setIsLoadingDB(true);
    try {
      const storedChats = await db.chats.toArray();
      if (storedChats.length > 0) {
        const storedStats = await db.stats.toArray();
        const storedGhosts = await db.ghosts.toArray();
        const storedPromises = await db.promises.toArray();
        const storedMsgs = await db.messages.toArray();

        setChats(storedChats);
        setStats(storedStats);
        setGhosts(storedGhosts);
        setPromises(storedPromises);
        setAllMessages(storedMsgs);

        if (storedChats[0]?.selfName) {
          setActiveSelfName(storedChats[0].selfName);
        }

        const debt = calculateReplyDebt(storedGhosts, storedChats, storedPromises);
        setReplyDebt(debt);
        setAggregateHeatmap(calculateHeatmap(storedMsgs));
        setIsDemoDataset(storedChats.some((c) => c.id.startsWith("wa_rohan") || c.id.startsWith("dc_hackathon")));
      }
    } catch (err) {
      console.error("Error reading Dexie DB:", err);
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleDataLoaded = (data: {
    chats: Chat[];
    stats: ChatStats[];
    ghosts: GhostEntry[];
    promises: PromiseItem[];
    replyDebt: ReplyDebtBreakdown;
    isDemo: boolean;
  }) => {
    setChats(data.chats);
    setStats(data.stats);
    setGhosts(data.ghosts);
    setPromises(data.promises);
    setReplyDebt(data.replyDebt);
    setIsDemoDataset(data.isDemo);
    setIsImporterOpen(false);

    if (data.chats[0]?.selfName) {
      setActiveSelfName(data.chats[0].selfName);
    }

    db.messages.toArray().then((msgs) => {
      setAllMessages(msgs);
      setAggregateHeatmap(calculateHeatmap(msgs));
    });
  };

  const getEffectiveReferenceTime = (chatList: Chat[], mode: "export" | "today" = refTimeMode): Date => {
    if (mode === "today") return new Date();
    const timestamps = chatList
      .map((c) => new Date(c.lastMessageAt).getTime())
      .filter((t) => !isNaN(t) && t > 0);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  };

  const reanalyzeAllChats = async (
    chatList: Chat[],
    msgs: Message[],
    selfName: string,
    mode: "export" | "today"
  ) => {
    if (chatList.length === 0) return;
    const totalChats = chatList.length || 1;
    const refDate = getEffectiveReferenceTime(chatList, mode);
    const newStats: ChatStats[] = [];
    const newGhosts: GhostEntry[] = [];
    const newPromises: PromiseItem[] = [];

    for (let i = 0; i < chatList.length; i++) {
      const chat = chatList[i];
      const chatMsgs = msgs.filter((m) => m.chatId === chat.id);
      const analysis = analyzeChat(chat.id, chatMsgs, selfName, (i + 1) / totalChats, refDate);

      newStats.push(analysis.stats);
      if (analysis.ghost) {
        newGhosts.push(analysis.ghost);
      }
      newPromises.push(...analysis.promises);
    }

    const newDebt = calculateReplyDebt(newGhosts, chatList, newPromises);
    setStats(newStats);
    setGhosts(newGhosts);
    setPromises(newPromises);
    setReplyDebt(newDebt);

    await db.transaction("rw", [db.stats, db.ghosts, db.promises], async () => {
      await db.stats.bulkPut(newStats);
      await db.ghosts.bulkPut(newGhosts);
      await db.promises.bulkPut(newPromises);
    });
  };

  // Switch identity and recalculate all analytics across all chats live
  const handleSwitchIdentity = async (newSelfName: string) => {
    setActiveSelfName(newSelfName);
    localStorage.setItem("whatsup_self_name", newSelfName);

    if (chats.length === 0) return;

    const updatedChats = chats.map((c) => ({ ...c, selfName: newSelfName }));
    setChats(updatedChats);
    await db.chats.bulkPut(updatedChats);
    await reanalyzeAllChats(updatedChats, allMessages, newSelfName, refTimeMode);
  };

  // Mark debt/promise paid via Amends Mode
  const handleMarkItemPaid = async (item: { type: "ghost" | "promise"; id: string; chatId: string }) => {
    if (item.type === "ghost") {
      const updatedGhosts = ghosts.filter((g) => g.chatId !== item.chatId);
      setGhosts(updatedGhosts);
      const newDebt = calculateReplyDebt(updatedGhosts, chats, promises);
      setReplyDebt(newDebt);
      await db.ghosts.where("chatId").equals(item.chatId).delete();
    } else {
      const updatedPromises = promises.map((p) => (p.id === item.id ? { ...p, status: "done" as const } : p));
      setPromises(updatedPromises);
      const newDebt = calculateReplyDebt(ghosts, chats, updatedPromises);
      setReplyDebt(newDebt);
      await db.promises.update(item.id, { status: "done" });
    }
  };

  // Extract all unique detected senders across imported messages
  const availableSendersMap = new Map<string, number>();
  allMessages.forEach((m) => {
    if (!m.isSystem && m.sender && m.sender !== "System") {
      availableSendersMap.set(m.sender, (availableSendersMap.get(m.sender) || 0) + 1);
    }
  });
  const availableSenders = Array.from(availableSendersMap.entries())
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount);

  const handleSelectChatById = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChatForDetail(chat);
    }
  };

  const handleTriggerBriefing = (chat: Chat) => {
    setActiveChatForDetail(null);
    setActiveChatForBriefing(chat);
  };

  const handleTriggerReplyDraft = (chat: Chat) => {
    setActiveChatForDetail(null);
    setActiveChatForReplyDraft(chat);
  };

  const handleOpenPersonProfile = (personName: string, chat: Chat) => {
    const chatMsgs = allMessages.filter((m) => m.chatId === chat.id);
    const profile = buildPersonProfile(personName, chat, chatMsgs, activeSelfName, ghosts, promises);
    setActivePersonProfile(profile);
  };

  const handleWipedData = () => {
    setChats([]);
    setStats([]);
    setGhosts([]);
    setPromises([]);
    setReplyDebt(null);
    setAllMessages([]);
    setAggregateHeatmap([]);
    setIsDemoDataset(false);
    setIsImporterOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#07080C] text-[#E6E8F0] p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1A1F33] pb-6">
          <div className="space-y-1 text-left">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3 font-display">
              <span className="text-[#FF334B]">WhatsUP?</span>
              <span className="text-xs uppercase px-2.5 py-0.5 rounded bg-[#FF334B]/15 text-[#FF453A] border border-[#FF334B]/35 font-mono tracking-wider">
                Guilt Ledger v1.0
              </span>
            </h1>
            <p className="text-sm text-[#8892AD]">
              Other apps summarize your chats. <strong className="text-[#CCD3E8]">We tell you who you&apos;ve been letting down.</strong>
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Identity Switcher Button */}
            {chats.length > 0 && (
              <button
                onClick={() => setIsIdentityModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#121A2E] hover:bg-[#1E2C4D] border border-[#2B4070] text-xs font-mono text-[#64D2FF] flex items-center gap-1.5 transition-all shadow-sm"
                title="Switch which sender identity is 'You'"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#64D2FF]" />
                <span>You: <strong>{activeSelfName}</strong></span>
              </button>
            )}

            {/* AI Engine Selector Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1C263D] border border-[#2B3B5C] text-xs font-mono text-[#64D2FF] flex items-center gap-1.5 transition-all shadow-sm"
              title="Configure AI Engine (Gemini / Claude / OpenAI / Local NLP)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Engine: {activeAIEngine}</span>
            </button>

            <NetworkLedgerBadge />

            {chats.length > 0 && (
              <>
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2642] border border-[#2B375C] text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Import More</span>
                </button>

                <button
                  onClick={() => {
                    const newMode = refTimeMode === "export" ? "today" : "export";
                    setRefTimeMode(newMode);
                    reanalyzeAllChats(chats, allMessages, activeSelfName, newMode);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2642] border border-[#2B375C] text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
                  title={`Timeline reference: ${refTimeMode === "export" ? "As of Export Date" : "As of Today"}. Click to toggle.`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#64D2FF]" />
                  <span>Timeline: <strong className="text-[#64D2FF]">{refTimeMode === "export" ? "Export Date" : "Today"}</strong></span>
                </button>

                <button
                  onClick={() => setIsWipeModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E0E14] hover:bg-[#2D141E] border border-[#3D1E28] text-xs font-mono text-[#FF7082] flex items-center gap-1.5 transition-all"
                  title="Clear all local data from IndexedDB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All Data</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        {isLoadingDB ? (
          <div className="py-24 text-center text-xs font-mono text-[#7D88A6] animate-pulse">
            Loading local IndexedDB cache...
          </div>
        ) : chats.length === 0 || isImporterOpen ? (
          /* Empty / Ingestion State */
          <div className="space-y-8 animate-fadeIn">
            {chats.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setIsImporterOpen(false)}
                  className="text-xs font-mono text-[#8E99B8] hover:text-white"
                >
                  &larr; Back to Dashboard
                </button>
              </div>
            )}
            <ChatImporter onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          /* Loaded Dashboard State */
          <div className="space-y-8 animate-fadeIn">
            {/* Demo Notice Banner */}
            {isDemoDataset && (
              <div className="p-3.5 rounded-xl bg-[#121728] border border-[#232F52] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[#64D2FF]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#30D158] animate-ping" />
                  <span>
                    <strong>BENCHMARK DATASET LOADED:</strong> 9 synthetic WhatsApp, Telegram & Discord conversations.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAmendsOpen(true)}
                    className="px-3 py-1 rounded-lg bg-[#FF334B]/20 border border-[#FF334B]/50 text-[#FF453A] font-bold hover:bg-[#FF334B]/30 transition-all flex items-center gap-1"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Try Amends Mode</span>
                  </button>
                  <button
                    onClick={() => {
                      const rohanChat = chats.find((c) => c.id === "wa_rohan_sharma");
                      if (rohanChat) handleTriggerBriefing(rohanChat);
                    }}
                    className="underline hover:text-white font-bold"
                  >
                    Quick-test AI Briefing &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* 1. Reply Debt Hero Card with Amends Mode & Debt Aging Matrix */}
            {replyDebt && (
              <ReplyDebtCard
                debt={replyDebt}
                ghosts={ghosts}
                promises={promises}
                chats={chats}
                onSelectChat={handleSelectChatById}
                onOpenAmendsMode={() => setIsAmendsOpen(true)}
              />
            )}

            {/* 2. Ghost Radar (4 Lanes + In-Sync) */}
            <GhostRadar
              ghosts={ghosts}
              chats={chats}
              onSelectChat={handleSelectChatById}
            />

            {/* 3. Promise Ledger */}
            <PromiseLedger
              promises={promises}
              chats={chats}
              onPromisesUpdated={(updated) => setPromises(updated)}
              onSelectChat={handleSelectChatById}
            />

            {/* 4. People Leaderboard */}
            <PeopleLeaderboard
              chats={chats}
              stats={stats}
              onSelectChat={handleSelectChatById}
              onOpenPersonProfile={handleOpenPersonProfile}
            />

            {/* 5. 24x7 Conversational Activity Heatmap */}
            <ActivityHeatmap
              heatmap={aggregateHeatmap}
              title="Aggregate 24x7 Conversational Activity Heatmap"
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <BriefingModal
        isOpen={Boolean(activeChatForBriefing)}
        chat={activeChatForBriefing}
        messages={
          activeChatForBriefing
            ? allMessages.filter((m) => m.chatId === activeChatForBriefing.id)
            : []
        }
        onClose={() => setActiveChatForBriefing(null)}
      />

      <ReplyDraftModal
        isOpen={Boolean(activeChatForReplyDraft)}
        chat={activeChatForReplyDraft}
        messages={
          activeChatForReplyDraft
            ? allMessages.filter((m) => m.chatId === activeChatForReplyDraft.id)
            : []
        }
        onClose={() => setActiveChatForReplyDraft(null)}
      />

      <WrappedModal
        isOpen={isWrappedOpen}
        chats={chats}
        stats={stats}
        promises={promises}
        ghosts={ghosts}
        replyDebtScore={replyDebt?.score || 0}
        onClose={() => setIsWrappedOpen(false)}
      />

      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={refreshAIEngineBadge}
      />

      <WipeDataModal
        isOpen={isWipeModalOpen}
        onClose={() => setIsWipeModalOpen(false)}
        onWiped={handleWipedData}
      />

      <ChatDetailModal
        isOpen={Boolean(activeChatForDetail)}
        chat={activeChatForDetail}
        messages={
          activeChatForDetail
            ? allMessages.filter((m) => m.chatId === activeChatForDetail.id)
            : []
        }
        stat={stats.find((s) => s.chatId === activeChatForDetail?.id) || null}
        ghost={ghosts.find((g) => g.chatId === activeChatForDetail?.id) || null}
        onOpenBriefing={handleTriggerBriefing}
        onOpenReplyDraft={handleTriggerReplyDraft}
        onClose={() => setActiveChatForDetail(null)}
      />

      {/* Standout Feature: Amends Mode Modal */}
      <AmendsModeModal
        isOpen={isAmendsOpen}
        onClose={() => setIsAmendsOpen(false)}
        ghosts={ghosts}
        chats={chats}
        promises={promises}
        onMarkItemPaid={handleMarkItemPaid}
      />

      {/* Standout Feature: Identity Switcher Modal */}
      <IdentitySwitcherModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentSelfName={activeSelfName}
        availableSenders={availableSenders}
        onSelectIdentity={handleSwitchIdentity}
      />

      {/* Per-Person Tab Modal */}
      <PersonalTabModal
        isOpen={Boolean(activePersonProfile)}
        profile={activePersonProfile}
        onClose={() => setActivePersonProfile(null)}
        onSelectMessage={handleSelectChatById}
      />
    </main>
  );
}
