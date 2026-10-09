"use client";

import React, { useState } from "react";
import { MessageCircle, Clock, Users, ArrowUpDown, ChevronRight, UserCheck, Layers } from "lucide-react";
import type { Chat, ChatStats } from "@/types";

interface PeopleLeaderboardProps {
  chats: Chat[];
  stats: ChatStats[];
  onSelectChat: (chatId: string) => void;
  onOpenPersonProfile?: (personName: string, chat: Chat) => void;
}

export const PeopleLeaderboard: React.FC<PeopleLeaderboardProps> = ({
  chats,
  stats,
  onSelectChat,
  onOpenPersonProfile,
}) => {

  const [sortBy, setSortBy] = useState<"volume" | "talkTime" | "replyTime">("volume");
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");

  const statsMap = new Map<string, ChatStats>();
  stats.forEach((s) => statsMap.set(s.chatId, s));

  // Combine chat & stats
  const combined = chats
    .filter((chat) => {
      if (filterType === "direct") return !chat.isGroup;
      if (filterType === "group") return chat.isGroup;
      return true;
    })
    .map((chat) => {
      const stat = statsMap.get(chat.id);
      return {
        chat,
        stat,
        messageCount: chat.messageCount || 0,
        talkTimeMinutes: stat?.estimatedTalkTimeMinutes || 0,
        replyTimeSecs: stat?.medianReplyTimeYouSecs ?? 999999,
      };
    });

  const sorted = [...combined].sort((a, b) => {
    if (sortBy === "talkTime") return b.talkTimeMinutes - a.talkTimeMinutes;
    if (sortBy === "replyTime") return a.replyTimeSecs - b.replyTimeSecs;
    return b.messageCount - a.messageCount;
  });

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const formatReplyTime = (secs: number | null | undefined) => {
    if (secs === null || secs === undefined || secs >= 999999) return "N/A";
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  return (
    <div className="rounded-2xl bg-[#0B0D15] border border-[#191E30] p-6 lg:p-7 shadow-xl space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171B2B] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <Users className="w-5 h-5 text-[#64D2FF]" />
            <span>People & Groups Leaderboard</span>
          </h3>
          <p className="text-xs text-[#828BA5] mt-0.5">
            Relationship distribution, member participation, and response latencies
          </p>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chat Type Filter */}
          <div className="flex items-center gap-1 bg-[#101320] p-1 rounded-xl border border-[#1E2338] text-xs font-mono">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "all" ? "bg-[#1E253D] text-white font-bold" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              All ({chats.length})
            </button>
            <button
              onClick={() => setFilterType("direct")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "direct" ? "bg-[#1E253D] text-white font-bold" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              1-on-1 ({chats.filter((c) => !c.isGroup).length})
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "group" ? "bg-[#1E253D] text-white font-bold" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              Groups ({chats.filter((c) => c.isGroup).length})
            </button>
          </div>

          {/* Sort Metric */}
          <div className="flex items-center gap-1 bg-[#101320] p-1 rounded-xl border border-[#1E2338] text-xs font-mono">
            <button
              onClick={() => setSortBy("volume")}
              className={`px-3 py-1 rounded-lg transition-all ${
                sortBy === "volume" ? "bg-[#FF334B] text-white font-bold shadow-md shadow-[#FF334B]/20" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setSortBy("talkTime")}
              className={`px-3 py-1 rounded-lg transition-all ${
                sortBy === "talkTime" ? "bg-[#FF334B] text-white font-bold shadow-md shadow-[#FF334B]/20" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              Talk Time
            </button>
            <button
              onClick={() => setSortBy("replyTime")}
              className={`px-3 py-1 rounded-lg transition-all ${
                sortBy === "replyTime" ? "bg-[#FF334B] text-white font-bold shadow-md shadow-[#FF334B]/20" : "text-[#7C86A2] hover:text-white"
              }`}
            >
              Reply Speed
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#6C7694] border border-dashed border-[#1C2135] rounded-xl">
            No conversations matching this filter.
          </div>
        ) : (
          sorted.map((item, index) => {
            const youShare = Math.round((item.stat?.messageShareYou || 0.5) * 100);
            const themShare = 100 - youShare;
            const youInitiator = Math.round((item.stat?.initiatorShareYou || 0.5) * 100);
            const isGroup = item.chat.isGroup;
            const memberStats = item.stat?.memberStats || [];

            return (
              <div
                key={item.chat.id}
                onClick={() => onSelectChat(item.chat.id)}
                className="p-4 rounded-xl bg-[#0F121E] border border-[#1C2135] hover:border-[#333C5E] hover:bg-[#131726] cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Rank & Title */}
                <div className="flex items-center gap-3 min-w-[220px]">
                  <div className="w-7 h-7 rounded-lg bg-[#161B2E] border border-[#232B45] flex items-center justify-center font-mono text-xs font-bold text-[#8E99B5]">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-[#64D2FF] transition-colors truncate max-w-[220px] font-display">
                      {item.chat.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#6E7896] flex items-center gap-1.5 capitalize">
                      <span>{item.chat.platform}</span>
                      <span>•</span>
                      {isGroup ? (
                        <span className="text-[#64D2FF] font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3" /> {item.chat.participants.length || memberStats.length} members
                        </span>
                      ) : (
                        <span>1-on-1</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Message Share Ratio Bar or Member breakdown */}
                <div className="flex-1 max-w-xs space-y-1">
                  {isGroup && memberStats.length > 2 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[#7D88A6]">
                        <span>Top: {memberStats[0]?.name || "You"} ({Math.round((memberStats[0]?.messageShare || 0) * 100)}%)</span>
                        <span>{memberStats[1]?.name || "Them"} ({Math.round((memberStats[1]?.messageShare || 0) * 100)}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1A1F30] overflow-hidden flex">
                        {memberStats.slice(0, 4).map((m, mi) => (
                          <div
                            key={mi}
                            className={`h-full ${
                              mi === 0
                                ? "bg-[#FF334B]"
                                : mi === 1
                                ? "bg-[#3B82F6]"
                                : mi === 2
                                ? "bg-[#30D158]"
                                : "bg-[#FF9F0A]"
                            }`}
                            style={{ width: `${Math.round(m.messageShare * 100)}%` }}
                            title={`${m.name}: ${m.messageCount} msgs`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[#7D88A6]">
                        <span>You ({youShare}%)</span>
                        <span>Them ({themShare}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1A1F30] overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF334B] to-[#FF6B7D]"
                          style={{ width: `${youShare}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
                          style={{ width: `${themShare}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Metrics Grid */}
                <div className="flex items-center gap-6 justify-between md:justify-end text-xs font-mono">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#6C7694]">Talk Time (Est.)</div>
                    <div className="font-bold text-[#E2E6F2]">
                      {formatDuration(item.talkTimeMinutes)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#6C7694]">Your Median Reply</div>
                    <div className="font-bold text-[#30D158]">
                      {formatReplyTime(item.stat?.medianReplyTimeYouSecs)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase text-[#6C7694]">You Initiated</div>
                    <div className="font-bold text-[#FF9F0A]">{youInitiator}%</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#5D6782] group-hover:text-white group-hover:translate-x-0.5 transition-all hidden md:block" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
