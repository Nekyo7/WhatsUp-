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
  const [activeTab, setActiveTab] = useState<PromiseStatus | "all">("open");
  const [confirmingPromiseId, setConfirmingPromiseId] = useState<string | null>(null);

  // Redaction preview state for promise confirmation
  const [showRedactionPreview, setShowRedactionPreview] = useState(false);
  const [pendingRedaction, setPendingRedaction] = useState<RedactionResult | null>(null);
  const [targetPromiseForAI, setTargetPromiseForAI] = useState<PromiseItem | null>(null);

  const chatMap = new Map<string, Chat>();
  chats.forEach((c) => chatMap.set(c.id, c));

  const filteredPromises = activeTab === "all" ? promises : promises.filter((p) => p.status === activeTab);

  const handleToggleStatus = async (promise: PromiseItem, newStatus: PromiseStatus) => {
    const updated = promises.map((p) => (p.id === promise.id ? { ...p, status: newStatus } : p));
    await db.promises.update(promise.id, { status: newStatus });
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

  const openCount = promises.filter((p) => p.status === "open").length;
  const doneCount = promises.filter((p) => p.status === "done").length;
  const staleCount = promises.filter((p) => p.status === "stale").length;

  return (
    <div className="rounded-2xl bg-[#0B0D15] border border-[#191E30] p-6 lg:p-7 shadow-xl space-y-5 text-left">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171B2B] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <span>Promise Ledger</span>
            <span className="text-xs font-mono text-[#828CA8] font-normal">
              ({openCount} unfulfilled commitments)
            </span>
          </h3>
          <p className="text-xs text-[#828BA5] mt-0.5">
            Explicit commitments, Hinglish promises, and deadlines detected locally
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#101320] p-1 rounded-xl border border-[#1E2338] text-xs font-mono">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "open"
                ? "bg-[#FF334B] text-white font-bold shadow-md shadow-[#FF334B]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setActiveTab("done")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "done"
                ? "bg-[#30D158] text-black font-bold shadow-md shadow-[#30D158]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            Fulfilled ({doneCount})
          </button>
          <button
            onClick={() => setActiveTab("stale")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "stale"
                ? "bg-[#FF9F0A] text-black font-bold shadow-md shadow-[#FF9F0A]/20"
                : "text-[#828CA8] hover:text-white"
            }`}
          >
            Stale ({staleCount})
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
            No promises found in this status category.
          </div>
        ) : (
          filteredPromises.map((p) => {
            const chat = chatMap.get(p.chatId);
            const chatTitle = chat?.title || "Conversation";
            const isDone = p.status === "done";
            const isStale = p.status === "stale";

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDone
                    ? "bg-[#0A120E] border-[#1C3D25]/40 opacity-75"
                    : isStale
                    ? "bg-[#14100B] border-[#3D2C12]/40"
                    : "bg-[#0F121E] border-[#1D2238] hover:border-[#313B61]"
                }`}
              >
                {/* Left: Chat info & promise statement */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => onSelectChat?.(p.chatId)}
                      className="font-bold text-xs text-white hover:text-[#64D2FF] cursor-pointer underline-offset-2 hover:underline font-display"
                    >
                      {chatTitle}
                    </span>

                    {p.status === "open" && (
                      <span className="stamp-badge stamp-crimson text-[9px]">Open</span>
                    )}
                    {p.status === "done" && (
                      <span className="stamp-badge stamp-emerald text-[9px]">Fulfilled</span>
                    )}
                    {p.status === "stale" && (
                      <span className="stamp-badge stamp-amber text-[9px]">Stale &gt;14d</span>
                    )}

                    <span className="text-[10px] font-mono text-[#7682A0]">
                      Confidence: {(p.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#CCD4EC] leading-relaxed">
                    &ldquo;{p.text}&rdquo;
                  </p>

                  <div className="flex items-center gap-4 text-xs font-mono text-[#6C7796]">
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
                  {p.confidence < 0.9 && p.status === "open" && (
                    <button
                      onClick={() => handleTriggerAIConfirm(p)}
                      disabled={confirmingPromiseId === p.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141A2D] hover:bg-[#1E2845] border border-[#26355C] text-[#64D2FF] text-xs font-mono flex items-center gap-1.5 transition-colors"
                      title="Validate commitment with server AI"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{confirmingPromiseId === p.id ? "Checking..." : "AI Verify"}</span>
                    </button>
                  )}

                  {p.status !== "done" ? (
                    <button
                      onClick={() => handleToggleStatus(p, "done")}
                      className="px-3 py-1.5 rounded-lg bg-[#163820] hover:bg-[#20522E] text-[#30D158] border border-[#30D158]/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(p, "open")}
                      className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1E2438] text-[#8890A6] border border-[#20273D] text-xs font-mono transition-colors"
                    >
                      Reopen
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePromise(p.id)}
                    className="p-1.5 rounded-lg hover:bg-[#2A1016] text-[#78829C] hover:text-[#FF334B] transition-colors"
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
