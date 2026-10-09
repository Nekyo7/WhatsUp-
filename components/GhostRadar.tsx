"use client";

import React, { useState } from "react";
import { UserX, Clock, TrendingDown, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { GhostEntry, Chat, GhostType } from "@/types";

interface GhostRadarProps {
  ghosts: GhostEntry[];
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
}

const LANES: {
  type: GhostType;
  title: string;
  subtitle: string;
  badgeClass: string;
  borderClass: string;
  icon: any;
}[] = [
  {
    type: "you_ghosted",
    title: "You Ghosted",
    subtitle: "They reached out; you left them on read",
    badgeClass: "stamp-crimson",
    borderClass: "border-[#FF334B]/30 hover:border-[#FF334B]",
    icon: UserX,
  },
  {
    type: "they_ghosted",
    title: "They Ghosted",
    subtitle: "Your message went unanswered",
    badgeClass: "stamp-amber",
    borderClass: "border-[#FF9F0A]/30 hover:border-[#FF9F0A]",
    icon: Clock,
  },
  {
    type: "fading",
    title: "Fading",
    subtitle: "Activity dropped >65% from its peak",
    badgeClass: "stamp-cyan",
    borderClass: "border-[#64D2FF]/30 hover:border-[#64D2FF]",
    icon: TrendingDown,
  },
  {
    type: "revivable",
    title: "Revivable",
    subtitle: "Top friend dormant >14 days",
    badgeClass: "stamp-emerald",
    borderClass: "border-[#30D158]/30 hover:border-[#30D158]",
    icon: Sparkles,
  },
];

export const GhostRadar: React.FC<GhostRadarProps> = ({ ghosts, chats, onSelectChat }) => {
  const [activeTab, setActiveTab] = useState<GhostType | "all" | "in_sync">("all");

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  const ghostChatIds = new Set(ghosts.map((g) => g.chatId));
  const inSyncChats = chats.filter((c) => !ghostChatIds.has(c.id));

  const filteredLanes = activeTab === "all" ? LANES : LANES.filter((l) => l.type === activeTab);

  return (
    <div className="space-y-6 text-left">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1E30] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <span>Ghost Radar</span>
            <span className="text-xs font-mono text-[#828BA5] font-normal">
              ({ghosts.length} flagged • {inSyncChats.length} active in-sync)
            </span>
          </h3>
          <p className="text-xs text-[#828BA5] mt-0.5">
            Automated categorisation of conversation health & turn-by-turn reply latency.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-[#0D0F18] p-1 rounded-xl border border-[#1E2338] overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              activeTab === "all"
                ? "bg-[#1F263D] text-white font-bold"
                : "text-[#828BA5] hover:text-[#CCD2E3]"
            }`}
          >
            All ({ghosts.length})
          </button>
          {LANES.map((lane) => {
            const count = ghosts.filter((g) => g.type === lane.type).length;
            return (
              <button
                key={lane.type}
                onClick={() => setActiveTab(lane.type)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                  activeTab === lane.type
                    ? "bg-[#1F263D] text-white font-bold"
                    : "text-[#828BA5] hover:text-[#CCD2E3]"
                }`}
              >
                {lane.title} ({count})
              </button>
            );
          })}
          {inSyncChats.length > 0 && (
            <button
              onClick={() => setActiveTab("in_sync")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === "in_sync"
                  ? "bg-[#142A1E] text-[#30D158] font-bold border border-[#30D158]/40"
                  : "text-[#30D158]/70 hover:text-[#30D158]"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>In-Sync ({inSyncChats.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* When In-Sync Tab is Active */}
      {activeTab === "in_sync" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inSyncChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className="p-4 rounded-2xl bg-[#09120D] border border-[#1A3D25]/60 hover:border-[#30D158] cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-[#30D158] transition-colors">
                    {chat.title}
                  </div>
                  <div className="text-[11px] font-mono text-[#6E7896]">
                    {chat.messageCount} messages • {chat.isGroup ? "Group Chat" : "1-on-1"}
                  </div>
                </div>
                <span className="stamp-badge stamp-emerald text-[10px]">In-Sync</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#060D09] border border-[#142D1C] text-xs font-mono text-[#8BA498] flex items-center justify-between">
                <span>Turn Status: Caught Up</span>
                <span className="text-[#30D158] font-bold">0d silent</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#64D2FF]">
                <span>Triage & AI Briefing</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 4 Lanes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredLanes.map((lane) => {
            const laneGhosts = ghosts.filter((g) => g.type === lane.type);
            const Icon = lane.icon;

            return (
              <div
                key={lane.type}
                className="flex flex-col rounded-2xl bg-[#0B0D15] border border-[#191E30] p-4 min-h-[320px]"
              >
                {/* Lane Header */}
                <div className="flex items-center justify-between border-b border-[#171B2B] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#CCD2E3]" />
                    <span className="font-bold text-sm text-white">{lane.title}</span>
                  </div>
                  <span className={`stamp-badge ${lane.badgeClass} text-[10px]`}>
                    {laneGhosts.length}
                  </span>
                </div>
                <p className="text-[11px] text-[#6E7896] mb-3">{lane.subtitle}</p>

                {/* Lane Cards List */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1">
                  {laneGhosts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#525B75] font-mono space-y-2">
                      <ShieldCheck className="w-6 h-6 text-[#30D158]/40" />
                      <span>No chats in this category</span>
                    </div>
                  ) : (
                    laneGhosts.map((ghost) => {
                      const chat = chatMap.get(ghost.chatId);
                      const title = chat?.title || "Direct Message";

                      return (
                        <div
                          key={ghost.chatId}
                          onClick={() => onSelectChat(ghost.chatId)}
                          className={`p-3 rounded-xl bg-[#0F121E] border ${lane.borderClass} cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-2`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs text-white group-hover:text-[#64D2FF] transition-colors truncate">
                              {title}
                            </span>
                            <span className="text-[10px] font-mono text-[#8890A6] whitespace-nowrap">
                              {ghost.daysSilent}d silent
                            </span>
                          </div>

                          <p className="text-[11px] text-[#A6AFC7] line-clamp-2 italic bg-[#090B12] p-2 rounded-lg border border-[#151928]">
                            &ldquo;{ghost.lastMessageText}&rdquo;
                          </p>

                          <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-[#647192]">
                            <span className="truncate max-w-[140px]">{ghost.reason}</span>
                            <span className="flex items-center gap-0.5 text-[#64D2FF] group-hover:translate-x-0.5 transition-transform">
                              Open <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Required persistent footnote */}
      <div className="p-3 rounded-xl bg-[#0A0C14] border border-[#161B2E] text-center text-xs text-[#6C7694] font-mono">
        💡 <strong className="text-[#8890A6]">Notice:</strong> Ghosted = unanswered turn or pending question. Exported chats do not include read receipts.
      </div>
    </div>
  );
};
