"use client";

import React from "react";
import { Clock, TrendingUp, AlertOctagon, Flame } from "lucide-react";
import type { GhostEntry, PromiseItem, Chat } from "@/types";

interface DebtAgingMatrixProps {
  ghosts: GhostEntry[];
  promises: PromiseItem[];
  chats: Chat[];
  onSelectChat?: (chatId: string) => void;
}

interface AgingBucket {
  label: string;
  sublabel: string;
  range: string;
  color: string;
  borderClass: string;
  bgClass: string;
  items: {
    id: string;
    chatId: string;
    title: string;
    days: number;
    text: string;
    penaltyScore: number;
  }[];
}

export const DebtAgingMatrix: React.FC<DebtAgingMatrixProps> = ({
  ghosts,
  promises,
  chats,
  onSelectChat,
}) => {
  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  // Buckets: 0-3d, 3-7d, 7-30d, 30+d
  const buckets: AgingBucket[] = [
    {
      label: "Fresh Debt",
      sublabel: "Minor Friction",
      range: "0-3 Days",
      color: "#30D158",
      borderClass: "border-[#30D158]/30",
      bgClass: "bg-[#09150E]",
      items: [],
    },
    {
      label: "At-Risk",
      sublabel: "Growing Debt",
      range: "3-7 Days",
      color: "#FF9F0A",
      borderClass: "border-[#FF9F0A]/30",
      bgClass: "bg-[#181206]",
      items: [],
    },
    {
      label: "Critical",
      sublabel: "Severe Stagnation",
      range: "7-30 Days",
      color: "#FF334B",
      borderClass: "border-[#FF334B]/30",
      bgClass: "bg-[#1A0A0E]",
      items: [],
    },
    {
      label: "Defaulted",
      sublabel: "Terminal Silence",
      range: "30+ Days",
      color: "#AF52DE",
      borderClass: "border-[#AF52DE]/30",
      bgClass: "bg-[#14081B]",
      items: [],
    },
  ];

  // Helper to calculate compounding interest on psychological debt: Base * (1.05 ^ days)
  const calculateCompoundedDebt = (baseScore: number, days: number): number => {
    return Math.round(baseScore * Math.pow(1.05, Math.min(days, 60)));
  };

  // Populate from you_ghosted
  ghosts
    .filter((g) => g.type === "you_ghosted")
    .forEach((g) => {
      const chat = chatMap.get(g.chatId);
      const title = chat?.title || "Direct Chat";
      const days = g.daysSilent;
      const penalty = calculateCompoundedDebt(g.score || 50, days);

      const entry = {
        id: `ghost_${g.chatId}`,
        chatId: g.chatId,
        title,
        days,
        text: g.lastMessageText || g.reason,
        penaltyScore: penalty,
      };

      if (days <= 3) buckets[0].items.push(entry);
      else if (days <= 7) buckets[1].items.push(entry);
      else if (days <= 30) buckets[2].items.push(entry);
      else buckets[3].items.push(entry);
    });

  // Populate from open promises
  promises
    .filter((p) => p.status === "open" && p.dueAt)
    .forEach((p) => {
      const chat = chatMap.get(p.chatId);
      const title = chat?.title || "Commitment";
      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(p.dueAt!).getTime()) / (1000 * 60 * 60 * 24)));
      const penalty = calculateCompoundedDebt(60, daysOverdue);

      const entry = {
        id: `promise_${p.id}`,
        chatId: p.chatId,
        title: `${title} (Promise)`,
        days: daysOverdue,
        text: p.text,
        penaltyScore: penalty,
      };

      if (daysOverdue <= 3) buckets[0].items.push(entry);
      else if (daysOverdue <= 7) buckets[1].items.push(entry);
      else if (daysOverdue <= 30) buckets[2].items.push(entry);
      else buckets[3].items.push(entry);
    });

  return (
    <div className="space-y-4 text-left">
      {/* Header and Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A1F30] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FF9F0A]" />
          <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Accounts Receivable Aging Matrix (Conversational Debt)
          </h4>
        </div>
        <div className="text-[11px] font-mono text-[#828BA5] flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#FF334B]" />
          <span>Formula: Base × (1.05)^days compounding interest</span>
        </div>
      </div>

      {/* 4 Aging Buckets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div
            key={b.range}
            className={`p-3.5 rounded-xl border ${b.borderClass} ${b.bgClass} flex flex-col justify-between space-y-3`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-white">{b.label}</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{ color: b.color, backgroundColor: `${b.color}20` }}
                >
                  {b.range}
                </span>
              </div>
              <div className="text-[10px] text-[#7A85A4] mt-0.5">{b.sublabel}</div>
            </div>

            <div className="space-y-1.5 min-h-[120px] max-h-[160px] overflow-y-auto pr-1">
              {b.items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] font-mono text-[#4F5874] py-6">
                  0 items in bucket
                </div>
              ) : (
                b.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectChat?.(item.chatId)}
                    className="p-2 rounded-lg bg-[#070911] border border-[#161B2E] hover:border-[#2C3656] cursor-pointer transition-all text-left space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white group-hover:text-[#64D2FF] truncate max-w-[120px]">
                        {item.title}
                      </span>
                      <span className="font-mono text-[10px] font-bold" style={{ color: b.color }}>
                        {item.days}d
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8892AE] line-clamp-1 italic">
                      &ldquo;{item.text}&rdquo;
                    </p>
                    <div className="text-[9px] font-mono text-[#5A6482] flex justify-between">
                      <span>Compounded Debt</span>
                      <span className="text-[#FF8090]">+{item.penaltyScore} pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#192036] flex items-center justify-between text-[10px] font-mono text-[#828BA5]">
              <span>Bucket Total:</span>
              <strong className="text-white">{b.items.length} conversations</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
