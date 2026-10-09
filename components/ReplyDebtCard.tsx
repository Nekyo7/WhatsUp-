"use client";

import React, { useState } from "react";
import { AlertTriangle, Clock, Flame, ChevronDown, ChevronUp, UserX } from "lucide-react";
import { DebtAgingMatrix } from "./DebtAgingMatrix";
import type { ReplyDebtBreakdown } from "@/types";

interface ReplyDebtCardProps {
  debt: ReplyDebtBreakdown;
  ghosts?: any[];
  promises?: any[];
  chats?: any[];
  onSelectChat?: (chatId: string) => void;
  onOpenAmendsMode?: () => void;
}

export const ReplyDebtCard: React.FC<ReplyDebtCardProps> = ({
  debt,
  ghosts = [],
  promises = [],
  chats = [],
  onSelectChat,
  onOpenAmendsMode,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAgingMatrix, setShowAgingMatrix] = useState(false);

  // Determine severity tier
  let severityColor = "#30D158"; // Kept / Low Debt
  let badgeText = "Low Guilt • All Caught Up";
  let stampClass = "stamp-emerald";

  if (debt.score >= 60) {
    severityColor = "#FF334B"; // High Debt
    badgeText = "Critical Guilt • Action Required";
    stampClass = "stamp-crimson";
  } else if (debt.score >= 25) {
    severityColor = "#FF9F0A"; // Moderate
    badgeText = "Moderate Debt • People Waiting";
    stampClass = "stamp-amber";
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#111422] to-[#0A0C14] border border-[#1E2338] p-6 lg:p-8 shadow-xl relative overflow-hidden text-left">
      {/* Glow highlight */}
      <div
        className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: severityColor }}
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Score and Title */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`stamp-badge ${stampClass}`}>
              {badgeText}
            </span>
            <span className="text-xs font-mono text-[#8890A6]">
              Updated in real-time
            </span>
            {onOpenAmendsMode && debt.peopleWaitingCount > 0 && (
              <button
                onClick={onOpenAmendsMode}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF334B] to-[#FF5E7E] hover:brightness-110 text-white font-mono text-xs font-bold transition-all shadow-md shadow-[#FF334B]/20 flex items-center gap-1.5 animate-pulse"
              >
                <span>✨ Amends Mode (Pay Off Guilt)</span>
              </button>
            )}
          </div>

          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>
              {debt.peopleWaitingCount > 0 ? (
                <>
                  <span className="text-[#FF334B]">{debt.peopleWaitingCount}</span>{" "}
                  {debt.peopleWaitingCount === 1 ? "person is" : "people are"} waiting on you.
                </>
              ) : (
                "Zero pending reply debt."
              )}
            </span>
          </h2>

          <p className="text-sm text-[#8E97B2] max-w-xl leading-relaxed">
            {debt.peopleWaitingCount > 0
              ? `You have accumulated ${debt.totalUnansweredDays} total unanswered days across ${debt.peopleWaitingCount} active conversations (${debt.highPriorityCount} marked high-priority with urgent questions).`
              : "You've replied to every conversational turn. Your friends are not currently waiting on your replies."}
          </p>
        </div>

        {/* Right: Big Score Gauge */}
        <div className="flex items-center gap-5 bg-[#090B12] px-6 py-5 rounded-2xl border border-[#1A1F33] self-stretch lg:self-auto justify-between lg:justify-start">
          <div className="text-right">
            <div className="text-xs font-mono uppercase text-[#7E88A3] tracking-wider">
              Reply Debt Index
            </div>
            <div className="text-xs text-[#5D6782] font-mono">Max 100</div>
          </div>

          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-mono font-black text-3xl shadow-inner border"
            style={{
              color: severityColor,
              borderColor: `${severityColor}40`,
              backgroundColor: `${severityColor}12`,
            }}
          >
            {debt.score}
          </div>
        </div>
      </div>

      {/* Action Tabs & Toggles */}
      <div className="mt-6 pt-5 border-t border-[#191D2F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {debt.chatsInDebt.length > 0 && (
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#64D2FF] hover:text-[#95E0FF] transition-colors"
            >
              <span>{showBreakdown ? "Hide itemized breakdown" : "Itemized breakdown & pending questions"}</span>
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={() => setShowAgingMatrix(!showAgingMatrix)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#FF9F0A] hover:text-[#FFB84D] transition-colors"
          >
            <span>{showAgingMatrix ? "Hide Debt Aging Matrix" : "Inspect Debt Aging Matrix (0-3d, 3-7d, 7-30d, 30+d)"}</span>
            {showAgingMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible itemized guilt breakdown */}
      {showBreakdown && debt.chatsInDebt.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
          {debt.chatsInDebt.map((chat) => (
            <div
              key={chat.chatId}
              onClick={() => onSelectChat?.(chat.chatId)}
              className="p-3.5 rounded-xl bg-[#0C0F1A] border border-[#1E243C] hover:border-[#333D63] cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-white text-sm group-hover:text-[#64D2FF] transition-colors">
                  {chat.chatTitle}
                </div>
                <span className="stamp-badge stamp-crimson text-[10px]">
                  {chat.daysWaiting}d silent
                </span>
              </div>

              <p className="text-xs text-[#959FB8] italic line-clamp-2 bg-[#080A12] p-2 rounded-lg border border-[#161B2E]">
                &ldquo;{chat.lastQuestion}&rdquo;
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#6E7896]">
                <span>Chat Weight: {(chat.weight * 100).toFixed(0)}%</span>
                <span className="text-[#64D2FF] group-hover:underline">Open Triage &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Debt Aging Matrix */}
      {showAgingMatrix && (
        <div className="mt-5 pt-4 border-t border-[#1E253E] animate-fadeIn">
          <DebtAgingMatrix
            ghosts={ghosts}
            promises={promises}
            chats={chats}
            onSelectChat={onSelectChat}
          />
        </div>
      )}
    </div>
  );
};
