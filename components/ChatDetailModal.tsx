"use client";

import React, { useState } from "react";
import { Sparkles, MessageSquareReply, Languages, Clock, Users, X, Check, Filter } from "lucide-react";
import type { Chat, Message, ChatStats, GhostEntry } from "@/types";

interface ChatDetailModalProps {
  isOpen: boolean;
  chat: Chat | null;
  messages: Message[];
  stat: ChatStats | null;
  ghost: GhostEntry | null;
  onOpenBriefing: (chat: Chat) => void;
  onOpenReplyDraft: (chat: Chat) => void;
  onClose: () => void;
}

export const ChatDetailModal: React.FC<ChatDetailModalProps> = ({
  isOpen,
  chat,
  messages,
  stat,
  ghost,
  onOpenBriefing,
  onOpenReplyDraft,
  onClose,
}) => {
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [selectedSenderFilter, setSelectedSenderFilter] = useState<string>("all");

  if (!isOpen || !chat) return null;

  const handleTranslateMessage = async (msg: Message) => {
    setTranslatingMsgId(msg.id);
    try {
      const apiKey = localStorage.getItem("whatsup_custom_api_key") || undefined;
      const provider = localStorage.getItem("whatsup_custom_provider") || undefined;

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.text, apiKey, provider }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTranslations((prev) => ({ ...prev, [msg.id]: data.translatedText }));
      }
    } catch (err) {
      console.error("Translate error:", err);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const uniqueSenders = Array.from(new Set(messages.filter((m) => !m.isSystem).map((m) => m.sender)));
  const filteredMessages =
    selectedSenderFilter === "all"
      ? messages
      : messages.filter((m) => m.sender === selectedSenderFilter || m.isSystem);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left">
      <div className="w-full max-w-4xl bg-[#0D101C] border border-[#232B45] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 bg-[#111424] border-b border-[#1D243B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white font-display">
                {chat.title}
              </h3>
              <span className="stamp-badge stamp-cyan text-[10px] capitalize">
                {chat.platform}
              </span>
              {chat.isGroup ? (
                <span className="stamp-badge stamp-amber text-[10px] flex items-center gap-1">
                  <Users className="w-3 h-3" /> Group ({chat.participants.length} members)
                </span>
              ) : (
                <span className="stamp-badge stamp-emerald text-[10px]">1-on-1</span>
              )}
              {ghost && (
                <span className="stamp-badge stamp-crimson text-[10px]">
                  {ghost.type.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-xs text-[#7B87A8] font-mono">
              {messages.length} total messages • Self: &ldquo;{chat.selfName}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => onOpenBriefing(chat)}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF334B] hover:bg-[#E0243C] text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#FF334B]/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Briefing</span>
            </button>

            <button
              onClick={() => onOpenReplyDraft(chat)}
              className="px-3.5 py-1.5 rounded-xl bg-[#1A233D] hover:bg-[#253259] text-[#64D2FF] font-mono text-xs flex items-center gap-1.5 border border-[#2B3963] transition-all"
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              <span>Draft Reply</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-[#8890A6] hover:text-white ml-2 rounded-lg hover:bg-[#1A2035] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Group / Participant Filter Bar */}
        {uniqueSenders.length > 2 && (
          <div className="px-6 py-2.5 bg-[#090B12] border-b border-[#1A1F33] flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <span className="text-[#647192] flex items-center gap-1 whitespace-nowrap">
              <Filter className="w-3 h-3" /> Filter by sender:
            </span>
            <button
              onClick={() => setSelectedSenderFilter("all")}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                selectedSenderFilter === "all"
                  ? "bg-[#1E253D] text-white font-bold"
                  : "text-[#7682A0] hover:text-white"
              }`}
            >
              All ({messages.length})
            </button>
            {uniqueSenders.map((sender) => (
              <button
                key={sender}
                onClick={() => setSelectedSenderFilter(sender)}
                className={`px-2.5 py-0.5 rounded-lg transition-all whitespace-nowrap ${
                  selectedSenderFilter === sender
                    ? "bg-[#64D2FF]/20 text-[#64D2FF] border border-[#64D2FF]/40 font-bold"
                    : "text-[#7682A0] hover:text-white"
                }`}
              >
                {sender} ({messages.filter((m) => m.sender === sender).length})
              </button>
            ))}
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#080A12]">
          {filteredMessages.map((msg) => {
            const isYou = msg.sender === chat.selfName || msg.sender === "You";
            const isSystem = msg.isSystem;
            const translation = translations[msg.id];

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#121626] text-[#717C9B] border border-[#1C233D]">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isYou ? "items-end" : "items-start"} space-y-1`}
              >
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#636E8B]">
                  <span className="font-semibold text-[#8B97B5]">{msg.sender}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {msg.lang === "hinglish" && (
                    <span className="text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 rounded">Hinglish</span>
                  )}
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-xl text-xs leading-relaxed space-y-2 ${
                    isYou
                      ? "bg-[#1E253D] text-[#E2E6F2] rounded-tr-sm border border-[#2B3554]"
                      : "bg-[#101322] text-[#CCD4EA] rounded-tl-sm border border-[#1B2138]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Inline Translation Result */}
                  {translation && (
                    <div className="p-2.5 rounded-xl bg-[#080910] border border-[#202947] text-[11px] text-[#64D2FF] space-y-1">
                      <span className="font-bold text-[#8897BE] block text-[9px] uppercase font-mono">
                        Translated to English:
                      </span>
                      <p>{translation}</p>
                    </div>
                  )}

                  {/* Translation Trigger for non-English or Hinglish */}
                  {msg.lang === "hinglish" && !translation && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleTranslateMessage(msg)}
                        disabled={translatingMsgId === msg.id}
                        className="text-[10px] font-mono text-[#FF9F0A] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Languages className="w-3 h-3" />
                        <span>{translatingMsgId === msg.id ? "Translating..." : "Translate to English"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0A0C14] border-t border-[#1C2138] flex items-center justify-between text-xs font-mono text-[#687391]">
          <span>Stored locally in Dexie IndexedDB • Zero server logging</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#161B2E] text-white hover:bg-[#202740] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
