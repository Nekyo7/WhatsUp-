"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Trash2, Check, Sparkles, Filter, Calendar } from "lucide-react";
import type { PromiseItem, Chat, PromiseStatus } from "@/types";
import { db } from "@/lib/db";
import { RedactionPreviewModal } from "./RedactionPreviewModal";
import { redactMessages, type RedactionResult } from "@/lib/redact";

interface PromiseLedgerProps {
  promises: PromiseItem[];
  chats: Chat[];
  onPromisesUpdated: (updated: PromiseItem[]) => void;
  onSelectChat?: (chatId: string) => void;
}

export const PromiseLedger: React.FC<PromiseLedgerProps> = ({
  promises,
  chats,
  onPromisesUpdated,
  onSelectChat,
}) => {
  const [activeTab, setActiveTab] = useState<"i_owe" | "they_owe_me" | "overdue" | "kept" | "all">("i_owe");
  const [confirmingPromiseId, setConfirmingPromiseId] = useState<string | null>(null);

  // Redaction preview state for promise confirmation
  const [showRedactionPreview, setShowRedactionPreview] = useState(false);
  const [pendingRedaction, setPendingRedaction] = useState<RedactionResult | null>(null);
  const [targetPromiseForAI, setTargetPromiseForAI] = useState<PromiseItem | null>(null);

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  const isPromiseOverdue = (p: PromiseItem): boolean => {
    if (p.status === "done" || p.userOverride === "dismissed") return false;
    if (p.resolution === "overdue") return true;
    if (p.dueAt) {
      const chat = chatMap.get(p.chatId);
      const refDate = chat?.lastMessageAt ? new Date(chat.lastMessageAt) : new Date();
      return new Date(p.dueAt).getTime() < refDate.getTime();
    }
    return false;
  };

  const filteredPromises = promises.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "i_owe") return p.direction === "i_owe" && p.status !== "done";
    if (activeTab === "they_owe_me") return p.direction === "they_owe_me" && p.status !== "done";
    if (activeTab === "overdue") return isPromiseOverdue(p);
    if (activeTab === "kept") return p.status === "done" || p.resolution === "kept";
    return true;
  });

  const handleToggleStatus = async (promise: PromiseItem, newStatus: PromiseStatus) => {
    const updated = promises.map((p) =>
      p.id === promise.id
        ? {
            ...p,
            status: newStatus,
            resolution: newStatus === "done" ? ("kept" as const) : ("open" as const),
            userOverride: newStatus === "done" ? ("kept" as const) : null,
          }
        : p
    );
    await db.promises.update(promise.id, {
      status: newStatus,
      resolution: newStatus === "done" ? ("kept" as const) : ("open" as const),
      userOverride: newStatus === "done" ? ("kept" as const) : null,
    });
    onPromisesUpdated(updated);
  };

  const handleDeletePromise = async (promiseId: string) => {
    const updated = promises.filter((p) => p.id !== promiseId);
    await db.promises.delete(promiseId);
    onPromisesUpdated(updated);
  };

  const handleTriggerAIConfirm = (promise: PromiseItem) => {
    const chat = chatMap.get(promise.chatId);
    setTargetPromiseForAI(promise);

    const syntheticMsg = {
      id: promise.messageId,
      chatId: promise.chatId,
      sender: promise.sender,
      timestamp: promise.createdAt,
      text: promise.text,
      isSystem: false,
      isMedia: false,
    };

    const redaction = redactMessages([syntheticMsg], chat?.selfName || "You", chat?.participants || []);
    setPendingRedaction(redaction);

    const privacyConfirmed = localStorage.getItem("whatsup_privacy_acknowledged");
    if (!privacyConfirmed) {
      setShowRedactionPreview(true);
    } else {
      executePromiseAIConfirm(promise, redaction);
    }
  };

  const executePromiseAIConfirm = async (promise: PromiseItem, redaction: RedactionResult) => {
    setConfirmingPromiseId(promise.id);
    try {
      const res = await fetch("/api/confirm-promise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText: redaction.redactedMessages[0]?.text || promise.text,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const aiData = data.data;
        const updated = promises.map((p) =>
          p.id === promise.id
            ? {
                ...p,
                confidence: aiData.confidence || 0.95,
                dueAt: aiData.dueAt || p.dueAt,
              }
            : p
        );
        await db.promises.update(promise.id, {
          confidence: aiData.confidence || 0.95,
          dueAt: aiData.dueAt || promise.dueAt,
        });
        onPromisesUpdated(updated);
      }
    } catch (err) {
      console.error("AI confirm error:", err);
    } finally {
      setConfirmingPromiseId(null);
    }
  };

  const formatDueDate = (iso: string | null) => {
    if (!iso) return "No strict deadline";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const iOweCount = promises.filter((p) => p.direction === "i_owe" && p.status !== "done").length;
  const theyOweCount = promises.filter((p) => p.direction === "they_owe_me" && p.status !== "done").length;
  const overdueCount = promises.filter(isPromiseOverdue).length;
  const keptCount = promises.filter((p) => p.status === "done" || p.resolution === "kept").length;

  return (
    <div className="rounded-2xl bg-[#0B0D15] border border-[#191E30] p-6 lg:p-7 shadow-xl space-y-5 text-left">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171B2B] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <span>Promise Ledger</span>
            <span className="text-xs font-mono text-[#828CA8] font-normal">
              ({iOweCount} you owe • {theyOweCount} they owe)
            </span>
          </h3>
          <p className="text-xs text-[#828BA5] mt-0.5">
            Two-way commitments, Hinglish promises, and evidence-backed resolutions
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#101320] p-1 rounded-xl border border-[#1E2338] text-xs font-mono">
          <button
            onClick={() => setActiveTab("i_owe")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "i_owe"
                ? "bg-[#FF334B] text-white font-bold shadow-md shadow-[#FF334B]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            I Owe ({iOweCount})
          </button>
          <button
            onClick={() => setActiveTab("they_owe_me")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "they_owe_me"
                ? "bg-[#64D2FF] text-black font-bold shadow-md shadow-[#64D2FF]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            They Owe Me ({theyOweCount})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "overdue"
                ? "bg-[#FF9F0A] text-black font-bold shadow-md shadow-[#FF9F0A]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            Overdue ({overdueCount})
          </button>
          <button
            onClick={() => setActiveTab("kept")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "kept"
                ? "bg-[#30D158] text-black font-bold shadow-md shadow-[#30D158]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            Kept ({keptCount})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "all" ? "bg-[#1E253D] text-white font-bold" : "text-[#828CA8] hover:text-white"
            }`}
          >
            All ({promises.length})
          </button>
        </div>
      </div>

      {/* Promises List */}
      <div className="space-y-3">
        {filteredPromises.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#586380] border border-dashed border-[#1A1F33] rounded-xl">
            No promises found in this category.
          </div>
        ) : (
          filteredPromises.map((p) => {
            const chat = chatMap.get(p.chatId);
            const chatTitle = chat?.title || "Conversation";
            const isDone = p.status === "done" || p.resolution === "kept";
            const isOverdue = p.resolution === "overdue";
            const isIOwe = p.direction === "i_owe";

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDone
                    ? "bg-[#0A120E] border-[#1C3D25]/40 opacity-75"
                    : isOverdue
                    ? "bg-[#180E10] border-[#5E1F29]/60"
                    : isIOwe
                    ? "bg-[#140F12] border-[#3B1F2A]/40 hover:border-[#5C2B3F]"
                    : "bg-[#0A131C] border-[#162B3D]/40 hover:border-[#224461]"
                }`}
              >
                {/* Left: Chat info & promise statement */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      onClick={() => onSelectChat?.(p.chatId)}
                      className="font-bold text-xs text-white hover:text-[#64D2FF] cursor-pointer underline-offset-2 hover:underline font-display"
                    >
                      {chatTitle}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      isIOwe ? "bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/40" : "bg-[#64D2FF]/20 text-[#64D2FF] border border-[#64D2FF]/40"
                    }`}>
                      {isIOwe ? "You Promised" : `${p.promiser || p.sender} Promised`}
                    </span>

                    {isOverdue && (
                      <span className="stamp-badge stamp-crimson text-[9px]">OVERDUE</span>
                    )}
                    {isDone && (
                      <span className="stamp-badge stamp-emerald text-[9px]">KEPT</span>
                    )}
                    {!isDone && !isOverdue && (
                      <span className="stamp-badge stamp-amber text-[9px]">OPEN</span>
                    )}

                    <span className="text-[10px] font-mono text-[#7682A0]">
                      Confidence: {(p.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#CCD4EC] leading-relaxed">
                    &ldquo;{p.text}&rdquo;
                  </p>

                  {p.evidence && (
                    <div className="text-[11px] font-mono text-[#8C98B6] bg-[#000000]/30 px-2.5 py-1 rounded-lg border border-[#161C2C] inline-block">
                      Evidence: {p.evidence}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono text-[#6C7796] pt-0.5">
                    <span className="flex items-center gap-1 text-[#FF9F0A]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDueDate(p.dueAt)}
                    </span>
                    <span>
                      Logged: {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleToggleStatus(p, isDone ? "open" : "done")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                      isDone
                        ? "bg-[#1E253D] text-[#CCD2E3] hover:bg-[#283252]"
                        : "bg-[#30D158] text-black hover:bg-[#28B84B] shadow-md shadow-[#30D158]/20"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDone ? "Reopen" : "Mark Kept"}</span>
                  </button>

                  <button
                    onClick={() => handleDeletePromise(p.id)}
                    className="p-1.5 rounded-lg text-[#55607E] hover:text-[#FF334B] hover:bg-[#1A1F30] transition-all"
                    title="Dismiss promise"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Redaction Confirmation Modal */}
      <RedactionPreviewModal
        isOpen={showRedactionPreview}
        redaction={pendingRedaction}
        featureName="Promise Verification"
        onConfirm={() => {
          localStorage.setItem("whatsup_privacy_acknowledged", "true");
          setShowRedactionPreview(false);
          if (targetPromiseForAI && pendingRedaction) {
            executePromiseAIConfirm(targetPromiseForAI, pendingRedaction);
          }
        }}
        onCancel={() => setShowRedactionPreview(false)}
      />
    </div>
  );
};
