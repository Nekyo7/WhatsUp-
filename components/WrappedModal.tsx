"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, Flame, Clock, Share2, Check, X, Shield, RefreshCw } from "lucide-react";
import type { Chat, ChatStats, PromiseItem, GhostEntry, WrappedData } from "@/types";

interface WrappedModalProps {
  isOpen: boolean;
  chats: Chat[];
  stats: ChatStats[];
  promises: PromiseItem[];
  ghosts: GhostEntry[];
  replyDebtScore: number;
  onClose: () => void;
}

export const WrappedModal: React.FC<WrappedModalProps> = ({
  isOpen,
  chats,
  stats,
  promises,
  ghosts,
  replyDebtScore,
  onClose,
}) => {
  const [wrappedData, setWrappedData] = useState<WrappedData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingCaption, setIsLoadingCaption] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger festive confetti blast
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FF334B", "#64D2FF", "#30D158", "#FF9F0A"],
        });
      } catch {
        // ignore
      }

      computeWrappedData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const computeWrappedData = async () => {
    const statsMap = new Map<string, ChatStats>();
    stats.forEach((s) => statsMap.set(s.chatId, s));

    // 1. Top person by talk time
    let topChat = chats[0];
    let maxTalk = 0;
    for (const c of chats) {
      const s = statsMap.get(c.id);
      const talk = s?.estimatedTalkTimeMinutes || 0;
      if (talk > maxTalk) {
        maxTalk = talk;
        topChat = c;
      }
    }

    // 2. Longest silence
    let maxSilentDays = 0;
    let silentChatTitle = "None";
    let whoStopped: "you" | "them" = "you";
    for (const g of ghosts) {
      if (g.daysSilent > maxSilentDays) {
        maxSilentDays = g.daysSilent;
        const c = chats.find((ch) => ch.id === g.chatId);
        silentChatTitle = c?.title || "Direct Chat";
        whoStopped = g.type === "they_ghosted" ? "them" : "you";
      }
    }

    // 3. Promises kept
    const totalPromises = promises.length;
    const keptPromises = promises.filter((p) => p.status === "done").length;
    const keptPercentage = totalPromises > 0 ? Math.round((keptPromises / totalPromises) * 100) : 100;

    // 4. Fastest reply contact from real stats
    let fastestContact = { name: topChat?.title || "Friend", medianMins: 1 };
    let minReplySecs = 999999;
    for (const c of chats) {
      const s = statsMap.get(c.id);
      if (s && s.medianReplyTimeYouSecs !== null && s.medianReplyTimeYouSecs < minReplySecs) {
        minReplySecs = s.medianReplyTimeYouSecs;
        fastestContact = {
          name: c.title,
          medianMins: Math.max(1, Math.round(s.medianReplyTimeYouSecs / 60)),
        };
      }
    }

    // 5. Most active hour from real aggregated heatmap
    const hourlyCounts = Array(24).fill(0);
    stats.forEach((s) => {
      s.heatmap?.forEach((pt) => {
        hourlyCounts[pt.hour] += pt.count;
      });
    });

    let peakHour = 22; // default 10 PM
    let maxHourCount = 0;
    hourlyCounts.forEach((count, hour) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = hour;
      }
    });

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${display}:00 ${ampm}`;
    };

    const mostActiveHour = `${formatHour(peakHour)} - ${formatHour((peakHour + 2) % 24)}`;

    const baseData: WrappedData = {
      topPerson: {
        name: topChat?.title || "Unknown",
        messageCount: topChat?.messageCount || 0,
        talkTimeHours: Number((maxTalk / 60).toFixed(1)),
      },
      longestSilence: {
        name: silentChatTitle,
        days: maxSilentDays,
        whoStopped,
      },
      promisesKept: {
        kept: keptPromises,
        total: totalPromises,
        percentage: keptPercentage,
      },
      replyDebtPeak: replyDebtScore,
      fastestReplyContact: fastestContact,
      mostActiveHour,
    };

    setWrappedData(baseData);
    await fetchAICaption(baseData);
  };

  const fetchAICaption = async (data: WrappedData) => {
    setIsLoadingCaption(true);
    try {
      const apiKey = localStorage.getItem("whatsup_custom_api_key") || undefined;
      const provider = localStorage.getItem("whatsup_custom_provider") || undefined;

      const res = await fetch("/api/wrapped-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topPersonName: data.topPerson.name,
          totalTalkHours: data.topPerson.talkTimeHours,
          longestSilenceDays: data.longestSilence.days,
          replyDebtScore: data.replyDebtPeak,
          apiKey,
          provider,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setWrappedData((prev) => (prev ? { ...prev, aiCaption: json.data.caption } : prev));
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCaption(false);
    }
  };

  const handleCopyShare = () => {
    if (!wrappedData) return;
    const text = `🏆 My 2026 WhatsUP? Chat Guilt Wrapped:
• Top Confidant: ${wrappedData.topPerson.name} (${wrappedData.topPerson.talkTimeHours} hrs talk time)
• Longest Ghost: ${wrappedData.longestSilence.days} days silent with ${wrappedData.longestSilence.name}
• Promises Kept: ${wrappedData.promisesKept.kept}/${wrappedData.promisesKept.total} (${wrappedData.promisesKept.percentage}%)
• Reply Debt Index: ${wrappedData.replyDebtPeak}/100

"${wrappedData.aiCaption || "Certified Chronic Procrastinator."}"
Triage your guilt: https://whatsup-backlog.app`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0E111D] border border-[#2B3454] rounded-3xl shadow-2xl overflow-hidden animate-scaleUp text-left">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#FF334B]/20 via-[#64D2FF]/20 to-[#30D158]/20 border-b border-[#232B45] flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-white font-black text-xl">
            <Trophy className="w-6 h-6 text-[#FF9F0A]" />
            <span>BACKLOG WRAPPED &lsquo;26</span>
          </div>
          <button onClick={onClose} className="text-[#8890A6] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wrapped Body */}
        {wrappedData && (
          <div className="p-6 space-y-5">
            {/* Stat 1: Top Person */}
            <div className="p-4 rounded-2xl bg-[#121626] border border-[#232C4A] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase text-[#7D88A6]">
                  #1 Favorite Human
                </div>
                <div className="text-lg font-black text-white font-display">
                  {wrappedData.topPerson.name}
                </div>
                <div className="text-xs text-[#8E99B8]">
                  {wrappedData.topPerson.messageCount} messages exchanged
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-2xl font-black text-[#64D2FF]">
                  {wrappedData.topPerson.talkTimeHours}h
                </div>
                <div className="text-[10px] text-[#717C9B]">Talk Time</div>
              </div>
            </div>

            {/* Stat 2 & 3 Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Longest Ghost */}
              <div className="p-4 rounded-2xl bg-[#1A0E14] border border-[#3D1E28]">
                <div className="text-[10px] font-mono uppercase text-[#FF6E82]">
                  Longest Silence
                </div>
                <div className="text-2xl font-black text-[#FF334B] font-mono mt-1">
                  {wrappedData.longestSilence.days}d
                </div>
                <div className="text-xs text-[#A6949C] truncate mt-0.5">
                  with {wrappedData.longestSilence.name}
                </div>
              </div>

              {/* Promises Kept */}
              <div className="p-4 rounded-2xl bg-[#0C1A14] border border-[#1A3D2D]">
                <div className="text-[10px] font-mono uppercase text-[#4ADE80]">
                  Promises Kept
                </div>
                <div className="text-2xl font-black text-[#30D158] font-mono mt-1">
                  {wrappedData.promisesKept.percentage}%
                </div>
                <div className="text-xs text-[#8BA498] mt-0.5">
                  {wrappedData.promisesKept.kept} of {wrappedData.promisesKept.total} fulfilled
                </div>
              </div>
            </div>

            {/* AI Roast Caption */}
            <div className="p-4 rounded-2xl bg-[#090B12] border border-[#1E253E] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#FF9F0A] font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Guilt Verdict
                </span>
                <span className="text-[10px] text-[#717D9E]">Anthropic LLM</span>
              </div>
              <p className="text-xs text-[#CCD4EA] italic leading-relaxed">
                &ldquo;{wrappedData.aiCaption || "Calculating your behavioral roast..."}&rdquo;
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCopyShare}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF334B] to-[#FF5E74] hover:from-[#E0243C] hover:to-[#FF453A] text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF334B]/25 transition-all"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Summary Card!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Share Guilt Wrapped</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
