"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, Trash2, Shield, Upload, FileText, CheckCircle2, RotateCcw, Cpu, PlusCircle } from "lucide-react";
import { db } from "@/lib/db";
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
import type { Chat, Message, ChatStats, GhostEntry, PromiseItem, ReplyDebtBreakdown, HeatmapPoint } from "@/types";

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

  // Modal active states
  const [activeChatForDetail, setActiveChatForDetail] = useState<Chat | null>(null);
  const [activeChatForBriefing, setActiveChatForBriefing] = useState<Chat | null>(null);
  const [activeChatForReplyDraft, setActiveChatForReplyDraft] = useState<Chat | null>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Load from Dexie on mount
  useEffect(() => {
    loadExistingDatabase();
    refreshAIEngineBadge();
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

    db.messages.toArray().then((msgs) => {
      setAllMessages(msgs);
      setAggregateHeatmap(calculateHeatmap(msgs));
    });
  };

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
                  onClick={() => setIsWrappedOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#161C2E] hover:bg-[#202840] border border-[#2B3554] text-xs font-mono font-bold text-[#FF9F0A] flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Guilt Wrapped &lsquo;26</span>
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
                <div className="flex items-center gap-2">
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

            {/* 1. Reply Debt Hero Card */}
            {replyDebt && (
              <ReplyDebtCard debt={replyDebt} onSelectChat={handleSelectChatById} />
            )}

            {/* 2. Ghost Radar (4 Lanes) */}
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
    </main>
  );
}
