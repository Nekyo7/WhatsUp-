"use client";

import React, { useState, useEffect } from "react";
import { MessageSquareReply, Copy, Check, Sparkles, X, Shield, Loader2 } from "lucide-react";
import type { Chat, Message, ReplyDraftOptions } from "@/types";
import { redactMessages, unredactText, type RedactionResult } from "@/lib/redact";
import { RedactionPreviewModal } from "./RedactionPreviewModal";

interface ReplyDraftModalProps {
  isOpen: boolean;
  chat: Chat | null;
  messages: Message[];
  onClose: () => void;
}

export const ReplyDraftModal: React.FC<ReplyDraftModalProps> = ({
  isOpen,
  chat,
  messages,
  onClose,
}) => {
  const [drafts, setDrafts] = useState<ReplyDraftOptions | null>(null);
  const [activeTone, setActiveTone] = useState<"warm" | "direct" | "apologetic" | "professional" | "casual">("warm");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTone, setCopiedTone] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showRedactionPreview, setShowRedactionPreview] = useState(false);
  const [pendingRedaction, setPendingRedaction] = useState<RedactionResult | null>(null);

  useEffect(() => {
    if (isOpen && chat) {
      loadOrFetchDrafts();
    }
  }, [isOpen, chat]);

  if (!isOpen || !chat) return null;

  const loadOrFetchDrafts = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const recent = messages.slice(-15);
    const redaction = redactMessages(recent, chat.selfName, chat.participants);
    setPendingRedaction(redaction);

    const privacyConfirmed = localStorage.getItem("whatsup_privacy_acknowledged");
    if (!privacyConfirmed) {
      setShowRedactionPreview(true);
      setIsLoading(false);
      return;
    }

    await executeDraftFetch(redaction);
  };

  const executeDraftFetch = async (redaction: RedactionResult) => {
    setIsLoading(true);
    try {
      const apiKey = localStorage.getItem("whatsup_custom_api_key") || undefined;
      const provider = localStorage.getItem("whatsup_custom_provider") || undefined;

      const res = await fetch("/api/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          contactName: chat.title,
          lastMessagesText: redaction.redactedExcerptText,
          apiKey,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate reply drafts");
      }

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

      const rawDrafts: ReplyDraftOptions = data.drafts;

      setDrafts({
        apologetic: unredactText(rawDrafts.apologetic, redaction.reverseNameMapping),
        casual: unredactText(rawDrafts.casual, redaction.reverseNameMapping),
        short: unredactText(rawDrafts.short, redaction.reverseNameMapping),
        warm: unredactText(rawDrafts.warm || rawDrafts.casual, redaction.reverseNameMapping),
        direct: unredactText(rawDrafts.direct || rawDrafts.short, redaction.reverseNameMapping),
        professional: unredactText(rawDrafts.professional || rawDrafts.apologetic, redaction.reverseNameMapping),
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate drafts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, tone: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTone(tone);
    setTimeout(() => setCopiedTone(null), 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-[#0E111C] border border-[#232A42] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
          {/* Header */}
          <div className="p-6 border-b border-[#1E253E] bg-[#111524] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquareReply className="w-5 h-5 text-[#64D2FF]" />
                <h3 className="text-xl font-black text-white font-display">
                  Guilt-Free Reply Drafter
                </h3>
              </div>
              <p className="text-xs text-[#828BA5]">
                Generate 5 context-aware response variations for {chat.title}
              </p>
            </div>
            <button onClick={onClose} className="text-[#7E89A6] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tone Tabs */}
          <div className="px-6 py-3 bg-[#0A0C14] border-b border-[#1A1F33] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono text-[#7682A0]">Select Tone:</span>
            <div className="flex items-center gap-1.5 bg-[#121626] p-1 rounded-xl border border-[#202740] flex-wrap">
              {[
                { id: "warm", label: "🌸 Warm" },
                { id: "direct", label: "🎯 Direct" },
                { id: "apologetic", label: "🙏 Apologetic" },
                { id: "professional", label: "💼 Professional" },
                { id: "casual", label: "☕ Casual" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTone(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all ${
                    activeTone === t.id
                      ? "bg-[#64D2FF] text-black shadow-md shadow-[#64D2FF]/20"
                      : "text-[#828CA8] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 text-[#64D2FF] animate-spin" />
                <p className="text-xs font-mono text-[#7B87A8]">
                  Crafting guilt-relief reply options...
                </p>
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-[#2D0F16] border border-[#FF334B]/40 text-[#FF8595] text-xs">
                {errorMsg}
              </div>
            ) : drafts ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#080A12] border border-[#1E253E] relative group">
                  <p className="text-sm text-[#E2E6F2] leading-relaxed whitespace-pre-wrap">
                    {drafts[activeTone]}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7B85A1] font-mono">
                    ⚠️ Never auto-sent: copy & paste into your messaging app.
                  </span>

                  <button
                    onClick={() => handleCopy(drafts[activeTone] || "", activeTone)}
                    className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28B84B] text-black font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#30D158]/20 transition-all"
                  >
                    {copiedTone === activeTone ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Redaction Confirmation Modal */}
      <RedactionPreviewModal
        isOpen={showRedactionPreview}
        redaction={pendingRedaction}
        featureName="Reply Draft Generation"
        onConfirm={() => {
          localStorage.setItem("whatsup_privacy_acknowledged", "true");
          setShowRedactionPreview(false);
          if (pendingRedaction) {
            executeDraftFetch(pendingRedaction);
          }
        }}
        onCancel={() => {
          setShowRedactionPreview(false);
          setIsLoading(false);
        }}
      />
    </>
  );
};
