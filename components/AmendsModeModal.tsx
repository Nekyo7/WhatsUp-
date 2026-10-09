"use client";

import React, { useState } from "react";
import { X, Sparkles, Check, Copy, ArrowRight, ShieldCheck, UserX, Clock, HeartHandshake, Award } from "lucide-react";
import confetti from "canvas-confetti";
import type { GhostEntry, Chat, PromiseItem } from "@/types";

interface AmendsDebtItem {
  id: string;
  chatId: string;
  chatTitle: string;
  personName: string;
  daysWaiting: number;
  reason: string;
  contextText: string;
  type: "ghost" | "promise";
}

interface AmendsModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ghosts: GhostEntry[];
  chats: Chat[];
  promises: PromiseItem[];
  onMarkItemPaid: (item: { type: "ghost" | "promise"; id: string; chatId: string }) => void;
}

export const AmendsModeModal: React.FC<AmendsModeModalProps> = ({
  isOpen,
  onClose,
  ghosts,
  chats,
  promises,
  onMarkItemPaid,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTone, setSelectedTone] = useState<"apologetic" | "casual" | "short">("apologetic");
  const [copiedTone, setCopiedTone] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  // Collect top debts (you_ghosted and overdue/open promises)
  const debtItems: AmendsDebtItem[] = [];

  ghosts
    .filter((g) => g.type === "you_ghosted")
    .slice(0, 5)
    .forEach((g) => {
      const chat = chatMap.get(g.chatId);
      debtItems.push({
        id: `ghost_${g.chatId}`,
        chatId: g.chatId,
        chatTitle: chat?.title || "Direct Chat",
        personName: chat?.title || "Friend",
        daysWaiting: g.daysSilent,
        reason: g.reason,
        contextText: g.lastMessageText || "Pending unanswered message",
        type: "ghost",
      });
    });

  promises
    .filter((p) => p.status === "open")
    .slice(0, 3)
    .forEach((p) => {
      const chat = chatMap.get(p.chatId);
      const isAlreadyInList = debtItems.some((d) => d.chatId === p.chatId);
      if (!isAlreadyInList) {
        debtItems.push({
          id: `promise_${p.id}`,
          chatId: p.chatId,
          chatTitle: chat?.title || "Chat",
          personName: chat?.title || "Contact",
          daysWaiting: p.dueAt ? Math.max(1, Math.floor((Date.now() - new Date(p.dueAt).getTime()) / (1000 * 60 * 60 * 24))) : 3,
          reason: `Unfulfilled commitment: "${p.text}"`,
          contextText: p.text,
          type: "promise",
        });
      }
    });

  const activeDebts = debtItems.filter((d) => !resolvedIds.has(d.id));
  const currentDebt = activeDebts[currentIndex] || activeDebts[0];
  const totalDebtsCount = debtItems.length;
  const clearedCount = resolvedIds.size;

  // Generate dynamic smart draft variations based on context & tone
  const generateDrafts = (item?: AmendsDebtItem) => {
    if (!item) return { apologetic: "", casual: "", short: "" };
    const name = item.personName.split(" ")[0];
    const context = item.contextText;

    return {
      apologetic: `Hey ${name}, so sorry for the radio silence! I got completely buried under work and missed this earlier. About "${context.slice(0, 40)}..." — really apologize for keeping you waiting! Let me know if you are free to catch up today.`,
      casual: `Hey ${name}! So sorry for the delayed reply, was swamped the past couple of days! Regarding "${context.slice(0, 35)}..." — all sorted on my end now. How have you been?`,
      short: `Hey ${name}, apologies for the delay! Following up on this: "${context.slice(0, 30)}...". Sending over what you need now!`,
    };
  };

  const drafts = generateDrafts(currentDebt);

  const handleCopyDraft = (text: string, toneKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTone(toneKey);
    setTimeout(() => setCopiedTone(null), 2000);
  };

  const handleMarkPaid = () => {
    if (!currentDebt) return;

    // Trigger celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#30D158", "#64D2FF", "#FF334B", "#FFD60A"],
    });

    const newResolved = new Set(resolvedIds);
    newResolved.add(currentDebt.id);
    setResolvedIds(newResolved);

    onMarkItemPaid({
      type: currentDebt.type,
      id: currentDebt.id.replace(/^(ghost_|promise_)/, ""),
      chatId: currentDebt.chatId,
    });

    if (currentIndex >= activeDebts.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < activeDebts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-b from-[#121626] via-[#0B0D18] to-[#07080F] border border-[#263152] shadow-2xl p-6 sm:p-8 space-y-6 text-left overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF334B]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E2640] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF334B]/15 border border-[#FF334B]/40 flex items-center justify-center text-[#FF453A]">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white font-display">Amends Mode</h3>
                <span className="stamp-badge stamp-crimson text-[10px]">Guilt Payoff</span>
              </div>
              <p className="text-xs text-[#8893B0]">
                Interactive 1-by-1 debt clearance. Draft apologies, copy replies, and clear your score.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7A85A4] hover:text-white hover:bg-[#1C2238] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between text-xs font-mono text-[#828BA5] bg-[#0A0C16] p-3 rounded-xl border border-[#1A2035]">
          <span>
            Resolved: <strong className="text-[#30D158]">{clearedCount}</strong> / {totalDebtsCount} debts
          </span>
          <div className="flex items-center gap-1.5">
            {debtItems.map((item, idx) => {
              const isDone = resolvedIds.has(item.id);
              const isCurrent = !isDone && currentDebt?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isDone
                      ? "bg-[#30D158]"
                      : isCurrent
                      ? "bg-[#FF334B] ring-2 ring-[#FF334B]/40 scale-125"
                      : "bg-[#20273D]"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Active Debt Card OR Triumphant Completed Screen */}
        {activeDebts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#30D158]/20 border border-[#30D158]/50 flex items-center justify-center text-[#30D158] shadow-2xl">
              <Award className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-2xl font-black text-white font-display">Guilt Ledger Cleared! 🎉</h4>
              <p className="text-sm text-[#8893B0] max-w-md mx-auto">
                You have addressed all active ghosting debts and overdue commitments. Your friends and colleagues are caught up!
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#30D158] hover:bg-[#28B84B] text-black font-bold font-mono text-xs transition-all shadow-lg shadow-[#30D158]/20"
            >
              Done • Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Target Person Context Box */}
            <div className="p-5 rounded-2xl bg-[#0F1322] border border-[#222B47] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-[#FF334B] uppercase tracking-wider font-bold">
                    Target Conversation #{debtItems.indexOf(currentDebt) + 1}
                  </span>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {currentDebt.personName}
                  </h4>
                </div>
                <span className="stamp-badge stamp-crimson text-xs">
                  {currentDebt.daysWaiting} Days Waiting
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#090B14] border border-[#161B2E] space-y-1">
                <span className="text-[10px] font-mono text-[#747E9E]">Unanswered Message / Question:</span>
                <p className="text-xs text-[#E1E5F2] italic">&ldquo;{currentDebt.contextText}&rdquo;</p>
              </div>
            </div>

            {/* Tone Selector & Draft Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8E99B8]">Select Draft Style:</span>
                <div className="flex items-center gap-1.5 bg-[#090B14] p-1 rounded-xl border border-[#1E253E]">
                  {(["apologetic", "casual", "short"] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setSelectedTone(tone)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                        selectedTone === tone
                          ? "bg-[#253052] text-white font-bold"
                          : "text-[#7A85A4] hover:text-[#CCD2E3]"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draft Box */}
              <div className="relative p-4 rounded-2xl bg-[#0A0C16] border border-[#1F2742] space-y-3">
                <p className="text-xs text-[#CCD4EC] leading-relaxed select-all">
                  {drafts[selectedTone]}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#171D30]">
                  <button
                    onClick={() => handleCopyDraft(drafts[selectedTone], selectedTone)}
                    className="px-3 py-1.5 rounded-lg bg-[#192138] hover:bg-[#253052] border border-[#2B385E] text-xs font-mono text-[#64D2FF] hover:text-white transition-all flex items-center gap-1.5"
                  >
                    {copiedTone === selectedTone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#30D158]" />
                        <span className="text-[#30D158]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#191F33]">
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-mono text-[#7A85A4] hover:text-white transition-colors"
              >
                Skip This Debt &rarr;
              </button>

              <button
                onClick={handleMarkPaid}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#30D158] to-[#25A244] hover:brightness-110 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-[#30D158]/25 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Mark Paid & Clear Score</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
