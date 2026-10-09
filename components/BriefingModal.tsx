"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Clock, CheckCircle, AlertCircle, X, Shield, Calendar, ListTodo, Loader2 } from "lucide-react";
import type { Briefing, Chat, Message, TimeBudget } from "@/types";
import { redactMessages, unredactText, type RedactionResult } from "@/lib/redact";
import { RedactionPreviewModal } from "./RedactionPreviewModal";
import { db } from "@/lib/db";
import { getStoredApiKey, getStoredProvider } from "@/lib/cryptoKey";

interface BriefingModalProps {
  isOpen: boolean;
  chat: Chat | null;
  messages: Message[];
  onClose: () => void;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({
  isOpen,
  chat,
  messages,
  onClose,
}) => {
  const [timeBudget, setTimeBudget] = useState<TimeBudget>("2min");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redaction confirmation flow state
  const [showRedactionPreview, setShowRedactionPreview] = useState(false);
  const [pendingRedaction, setPendingRedaction] = useState<RedactionResult | null>(null);

  useEffect(() => {
    if (isOpen && chat) {
      loadOrFetchBriefing(timeBudget);
    }
  }, [isOpen, chat, timeBudget]);

  if (!isOpen || !chat) return null;

  const loadOrFetchBriefing = async (selectedBudget: TimeBudget) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check local Dexie DB cache first
      const cached = await db.briefings
        .where({ chatId: chat.id, timeBudget: selectedBudget })
        .first();

      if (cached) {
        setBriefing(cached);
        setIsLoading(false);
        return;
      }

      // 2. Prepare excerpt & redact PII
      const recentMessages = messages.slice(-150);
      const redaction = redactMessages(recentMessages, chat.selfName, chat.participants);
      setPendingRedaction(redaction);

      // Check if user already confirmed privacy preview in this session
      const privacyConfirmed = localStorage.getItem("whatsup_privacy_acknowledged");
      if (!privacyConfirmed) {
        setShowRedactionPreview(true);
        setIsLoading(false);
        return;
      }

      await executeBriefingGeneration(redaction, selectedBudget);
    } catch (err: any) {
      setErrorMsg(`Failed to generate briefing: ${err.message || String(err)}`);
      setIsLoading(false);
    }
  };

  const handleConfirmRedactionAndSend = async () => {
    localStorage.setItem("whatsup_privacy_acknowledged", "true");
    setShowRedactionPreview(false);
    if (pendingRedaction) {
      setIsLoading(true);
      await executeBriefingGeneration(pendingRedaction, timeBudget);
    }
  };

  const executeBriefingGeneration = async (redaction: RedactionResult, budget: TimeBudget) => {
    try {
      const apiKey = (await getStoredApiKey()) || undefined;
      const provider = getStoredProvider() || undefined;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-ai-key"] = apiKey;
      if (provider) headers["x-ai-provider"] = provider;

      const res = await fetch("/api/briefing", {
        method: "POST",
        headers,
        body: JSON.stringify({
          chatId: chat.id,
          chatTitle: chat.title,
          isGroup: chat.isGroup,
          timeBudget: budget,
          redactedExcerptText: redaction.redactedExcerptText,
          messages: redaction.redactedMessages,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate briefing from server");
      }

      const rawBriefing: Briefing = data.briefing;

      // Update network ledger in localStorage
      if (data.bytesUsed > 0) {
        const stored = localStorage.getItem("whatsup_network_ledger");
        const prev = stored ? JSON.parse(stored) : { apiCalls: 0, bytesSent: 0 };
        const updated = {
          apiCalls: prev.apiCalls + 1,
          bytesSent: prev.bytesSent + data.bytesUsed,
          lastCallAt: new Date().toISOString(),
        };
        localStorage.setItem("whatsup_network_ledger", JSON.stringify(updated));
      }

      // Un-redact Person A/B tokens back to real names for display
      const unredactedTLDR = rawBriefing.tldr.map((line) =>
        unredactText(line, redaction.reverseNameMapping)
      ) as [string, string, string];

      const unredactedTopics = rawBriefing.topics.map((t) => ({
        title: unredactText(t.title, redaction.reverseNameMapping),
        bullets: t.bullets.map((b) => unredactText(b, redaction.reverseNameMapping)),
        sourceMessageIds: t.sourceMessageIds,
      }));

      const unredactedDecisions = rawBriefing.decisions.map((d) =>
        unredactText(d, redaction.reverseNameMapping)
      );

      const unredactedActionItems = rawBriefing.actionItems.map((a) =>
        unredactText(a, redaction.reverseNameMapping)
      );

      const unredactedDeadlines = rawBriefing.deadlines.map((dl) => ({
        ...dl,
        title: unredactText(dl.title, redaction.reverseNameMapping),
      }));

      const finalBriefing: Briefing = {
        ...rawBriefing,
        tldr: unredactedTLDR,
        topics: unredactedTopics,
        decisions: unredactedDecisions,
        actionItems: unredactedActionItems,
        deadlines: unredactedDeadlines,
      };

      setBriefing(finalBriefing);

      // Save to IndexedDB
      await db.briefings.put(finalBriefing);
    } catch (err: any) {
      setErrorMsg(err.message || "Briefing generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-[#0E111C] border border-[#232A42] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
          {/* Top Bar */}
          <div className="p-6 border-b border-[#1E253E] bg-[#111524] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF334B]" />
                <h3 className="text-xl font-black text-white font-display">
                  AI Guilt Briefing
                </h3>
                <span className="text-xs font-mono text-[#8890A6]">
                  • {chat.title}
                </span>
              </div>
              <p className="text-xs text-[#828BA5]">
                Instant context catch-up • What did you miss and what do you owe?
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-[#7E89A6] hover:text-white p-1 rounded-lg hover:bg-[#1A2035] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Time Budget Toggle Tabs */}
          <div className="px-6 py-3 bg-[#0A0C14] border-b border-[#1A1F33] flex items-center justify-between">
            <span className="text-xs font-mono text-[#7682A0]">Select Time Budget:</span>
            <div className="flex items-center gap-2 bg-[#121626] p-1 rounded-xl border border-[#202740]">
              {(["15s", "2min", "10min"] as TimeBudget[]).map((budget) => (
                <button
                  key={budget}
                  onClick={() => setTimeBudget(budget)}
                  className={`px-3.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    timeBudget === budget
                      ? "bg-[#FF334B] text-white shadow-md shadow-[#FF334B]/20"
                      : "text-[#828CA8] hover:text-white"
                  }`}
                >
                  {budget === "15s" ? "⚡ 15s Speed" : budget === "2min" ? "⏱️ 2min Standard" : "📖 10min Deep"}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-[#FF334B] animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-white font-mono">
                    Generating {timeBudget} AI Briefing...
                  </p>
                  <p className="text-xs text-[#7B87A8]">
                    Sanitizing contact tokens & synthesizing conversational priorities
                  </p>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-[#2D0F16] border border-[#FF334B]/40 text-[#FF8595] text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-[#FF453A]" />
                  <span>Briefing Error</span>
                </div>
                <p>{errorMsg}</p>
                <button
                  onClick={() => loadOrFetchBriefing(timeBudget)}
                  className="px-3 py-1 bg-[#FF334B] text-white rounded-lg text-xs font-mono font-bold mt-2"
                >
                  Retry
                </button>
              </div>
            ) : briefing ? (
              <div className="space-y-6">
                {/* Demo Cache Notice Badge if offline */}
                {briefing.isDemoCached && (
                  <div className="p-2.5 rounded-lg bg-[#141A2E] border border-[#232F52] text-[11px] font-mono text-[#64D2FF] flex items-center justify-between">
                    <span>⚡ Demo Cache Active (Instant local preview)</span>
                    <span className="text-[10px] text-[#8890A6]">0 network bytes used</span>
                  </div>
                )}

                {/* Priority-First Triage Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    briefing.actionItems.length > 0 || briefing.deadlines.length > 0
                      ? "bg-[#2D0F16] border-[#FF334B]/50 text-[#FF8595]"
                      : "bg-[#0A0D18] border-[#1C233C] text-[#6B7694] opacity-60"
                  }`}>
                    <span className="text-base">🚨</span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider font-mono">
                        {briefing.actionItems.length > 0 || briefing.deadlines.length > 0 ? "Action Required" : "No Urgent Reply"}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {briefing.actionItems.length > 0 ? "Needs reply within 24h" : "Zero pending blockers"}
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    briefing.actionItems.length === 0 && briefing.deadlines.length === 0
                      ? "bg-[#0F281E] border-[#30D158]/50 text-[#30D158]"
                      : "bg-[#0A0D18] border-[#1C233C] text-[#6B7694] opacity-60"
                  }`}>
                    <span className="text-base">💡</span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider font-mono">
                        FYI Only
                      </div>
                      <div className="text-[10px] opacity-80">
                        {briefing.actionItems.length === 0 ? "Safe to archive/read later" : "Contains informational context"}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-[#161226] border-[#7928CA]/40 text-[#D8B4FE] flex items-center gap-2.5">
                    <span className="text-base">👥</span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider font-mono">
                        Team & Delegated
                      </div>
                      <div className="text-[10px] opacity-80">
                        {briefing.decisions.length > 0 ? `${briefing.decisions.length} mutual decisions` : "Monitored thread"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Bullet TL;DR Box */}
                <div className="p-5 rounded-xl bg-[#121524] border border-[#252E4C] space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#FF453A] font-bold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> 3-Bullet Executive TL;DR
                  </div>
                  <ul className="space-y-2 text-sm text-[#E2E6F2]">
                    {briefing.tldr.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#FF334B]/20 text-[#FF453A] font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Structured Topics */}
                {briefing.topics.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase text-[#7D88A6] font-bold tracking-wider">
                        Key Topics & Blocker Threads
                      </h4>
                      <span className="text-[10px] font-mono text-[#64D2FF]">Source citations linked</span>
                    </div>
                    <div className="space-y-3">
                      {briefing.topics.map((topic, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-[#090B12] border border-[#1A1F33] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#64D2FF]">
                              {topic.title}
                            </span>
                            {topic.sourceMessageIds?.length > 0 && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162238] text-[#64D2FF] border border-[#233554]">
                                📍 {topic.sourceMessageIds.length} source msgs
                              </span>
                            )}
                          </div>
                          <ul className="space-y-1.5 text-xs text-[#9FA9C2] pl-4 list-disc">
                            {topic.bullets.map((bullet, bi) => (
                              <li key={bi} className="leading-relaxed">
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions & Action Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Decisions */}
                  <div className="p-4 rounded-xl bg-[#090B12] border border-[#1A1F33] space-y-2">
                    <div className="text-xs font-mono uppercase text-[#30D158] font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Decisions Reached
                    </div>
                    {briefing.decisions.length === 0 ? (
                      <p className="text-xs text-[#5D6682] italic">No explicit decisions logged.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-[#9FA9C2] pl-4 list-disc">
                        {briefing.decisions.map((d, di) => (
                          <li key={di}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action Items */}
                  <div className="p-4 rounded-xl bg-[#090B12] border border-[#1A1F33] space-y-2">
                    <div className="text-xs font-mono uppercase text-[#FF9F0A] font-bold flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5" /> Action Items For You
                    </div>
                    {briefing.actionItems.length === 0 ? (
                      <p className="text-xs text-[#5D6682] italic">No open action items detected.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-[#9FA9C2] pl-4 list-disc">
                        {briefing.actionItems.map((a, ai) => (
                          <li key={ai}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Deadlines */}
                {briefing.deadlines.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#140E18] border border-[#3D1E45] space-y-2">
                    <div className="text-xs font-mono uppercase text-[#E879F9] font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Tracked Deadlines
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {briefing.deadlines.map((dl, dli) => (
                        <div
                          key={dli}
                          className="p-2.5 rounded-lg bg-[#0E0B12] border border-[#2A1730] flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-white truncate max-w-[180px]">
                            {dl.title}
                          </span>
                          <span className="font-mono text-[11px] text-[#E879F9]">
                            {dl.dueAt ? new Date(dl.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Soon"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#1C2135] bg-[#0A0C14] flex items-center justify-between text-xs font-mono text-[#6C7694]">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#30D158]" />
              <span>Contact names unredacted client-side for your view only</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#161C2E] hover:bg-[#202740] text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Redaction Confirmation Modal */}
      <RedactionPreviewModal
        isOpen={showRedactionPreview}
        redaction={pendingRedaction}
        featureName="AI Briefing"
        onConfirm={handleConfirmRedactionAndSend}
        onCancel={() => {
          setShowRedactionPreview(false);
          setIsLoading(false);
        }}
      />
    </>
  );
};
