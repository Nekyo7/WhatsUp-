"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Clock,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Pin,
  VolumeX,
  Languages,
  Save,
  Quote,
  TrendingUp,
  FileText
} from "lucide-react";
import type { PersonProfile, Message } from "@/types";
import { translateTextWithCache } from "@/lib/translationCache";

interface PersonalTabModalProps {
  isOpen: boolean;
  profile: PersonProfile | null;
  onClose: () => void;
  onSelectMessage?: (messageId: string) => void;
}

export const PersonalTabModal: React.FC<PersonalTabModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSelectMessage,
}) => {
  const [activeTab, setActiveTab] = useState<"highlights" | "stats" | "promises" | "briefing" | "notes">("highlights");
  const [notesText, setNotesText] = useState<string>(profile?.notes || "");
  const [isSavedNotes, setIsSavedNotes] = useState(false);
  const [translatedQuotes, setTranslatedQuotes] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  if (!isOpen || !profile) return null;

  const handleSaveNotes = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`whatsup_notes_${profile.name}`, notesText);
      setIsSavedNotes(true);
      setTimeout(() => setIsSavedNotes(false), 2000);
    }
  };

  const handleTranslateQuote = async (msgId: string, text: string) => {
    if (translatedQuotes[msgId]) {
      // Toggle off
      const next = { ...translatedQuotes };
      delete next[msgId];
      setTranslatedQuotes(next);
      return;
    }

    setTranslatingId(msgId);
    try {
      const res = await translateTextWithCache({ text, targetLanguage: "English" });
      setTranslatedQuotes((prev) => ({ ...prev, [msgId]: res.translatedText }));
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslatingId(null);
    }
  };

  const formatSecs = (secs: number | null) => {
    if (secs === null) return "N/A";
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}:00 ${period}`;
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0D18] border border-[#232C46] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Header with Person Avatar and At-a-glance banner */}
        <div className="p-6 border-b border-[#1A2238] bg-gradient-to-r from-[#11172A] via-[#0E1322] to-[#0A0D18] flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#64D2FF]/20 to-[#A78BFA]/20 border border-[#64D2FF]/40 flex items-center justify-center text-xl font-bold font-mono text-[#64D2FF] shadow-lg">
              {profile.avatarInitials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white font-display">{profile.name}</h2>
                {profile.ghostStatus && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    profile.ghostStatus.type === "you_ghosted"
                      ? "bg-[#FF334B]/20 text-[#FF334B] border border-[#FF334B]/40"
                      : "bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40"
                  }`}>
                    {profile.ghostStatus.type === "you_ghosted" ? "You Owe Reply" : "They Ghosted"}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#8C98BA]">
                {profile.totalMessages} total messages • First: {new Date(profile.firstMessageAt).toLocaleDateString()} • Last: {new Date(profile.lastMessageAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-[#64D2FF] font-medium">
                {profile.messageShareThem >= 0.55
                  ? `${profile.name} talks more (${Math.round(profile.messageShareThem * 100)}% of messages)`
                  : `You talk more (${Math.round((1 - profile.messageShareThem) * 100)}% of messages)`}
                {" • "}
                {profile.conversationStarterShare >= 0.55 ? `${profile.name} initiates more` : `You initiate more`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#727E9E] hover:text-white hover:bg-[#1C253E] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#161C2E] bg-[#070912] text-xs font-mono">
          <button
            onClick={() => setActiveTab("highlights")}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-2 ${
              activeTab === "highlights"
                ? "border-[#64D2FF] text-[#64D2FF] bg-[#0E1322]"
                : "border-transparent text-[#7682A4] hover:text-[#CCD4EC]"
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>What {profile.name} Said ({profile.highlights.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-2 ${
              activeTab === "stats"
                ? "border-[#64D2FF] text-[#64D2FF] bg-[#0E1322]"
                : "border-transparent text-[#7682A4] hover:text-[#CCD4EC]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Relationship Dynamics</span>
          </button>

          <button
            onClick={() => setActiveTab("promises")}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-2 ${
              activeTab === "promises"
                ? "border-[#64D2FF] text-[#64D2FF] bg-[#0E1322]"
                : "border-transparent text-[#7682A4] hover:text-[#CCD4EC]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Promises ({profile.promisesIOwe.length + profile.promisesTheyOwe.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("briefing")}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-2 ${
              activeTab === "briefing"
                ? "border-[#64D2FF] text-[#64D2FF] bg-[#0E1322]"
                : "border-transparent text-[#7682A4] hover:text-[#CCD4EC]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>What Did I Miss?</span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-2 ${
              activeTab === "notes"
                ? "border-[#64D2FF] text-[#64D2FF] bg-[#0E1322]"
                : "border-transparent text-[#7682A4] hover:text-[#CCD4EC]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Private Notes</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ATTRIBUTED HIGHLIGHTS ("What Riya Said") */}
          {activeTab === "highlights" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#8E9BB8]">
                  Key questions, requests, and statements from <strong>{profile.name}</strong>:
                </span>
                <span className="text-[11px] font-mono text-[#64D2FF]">
                  Attributed Quotes
                </span>
              </div>

              {profile.highlights.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-[#586380] border border-dashed border-[#1A2238] rounded-2xl">
                  No explicit requests or questions detected from {profile.name}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.highlights.map((h) => {
                    const isTranslated = !!translatedQuotes[h.messageId];
                    return (
                      <div
                        key={h.messageId}
                        className="p-4 rounded-2xl bg-[#0D1220] border border-[#1A233C] hover:border-[#2C3B64] transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                            h.type === "question"
                              ? "bg-[#FF334B]/15 text-[#FF334B] border border-[#FF334B]/30"
                              : h.type === "request"
                              ? "bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30"
                              : h.type === "plan"
                              ? "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30"
                              : "bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30"
                          }`}>
                            {h.type}
                          </span>
                          <span className="text-[#6A7694]">
                            {new Date(h.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <blockquote className="text-sm font-semibold text-[#CCD4EC] leading-relaxed italic border-l-2 border-[#64D2FF]/40 pl-3">
                          &ldquo;{isTranslated ? translatedQuotes[h.messageId] : h.text}&rdquo;
                        </blockquote>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleTranslateQuote(h.messageId, h.text)}
                            disabled={translatingId === h.messageId}
                            className="text-[11px] font-mono text-[#64D2FF] hover:underline flex items-center gap-1"
                          >
                            <Languages className="w-3 h-3" />
                            {translatingId === h.messageId
                              ? "Translating..."
                              : isTranslated
                              ? "Show Original"
                              : "Translate"}
                          </button>

                          {onSelectMessage && (
                            <button
                              type="button"
                              onClick={() => onSelectMessage(h.messageId)}
                              className="text-[11px] font-mono text-[#8C98B6] hover:text-white underline"
                            >
                              Jump to Message &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RELATIONSHIP STATS */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-1">
                  <span className="text-[11px] font-mono text-[#7682A4] block">Message Split</span>
                  <div className="text-lg font-bold text-white font-mono">
                    {Math.round(profile.messageShareThem * 100)}% / {Math.round((1 - profile.messageShareThem) * 100)}%
                  </div>
                  <span className="text-[10px] text-[#8C98B6]">Them vs You</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-1">
                  <span className="text-[11px] font-mono text-[#7682A4] block">Reply Time (Them)</span>
                  <div className="text-lg font-bold text-[#30D158] font-mono">
                    {formatSecs(profile.medianReplyTimeThemSecs)}
                  </div>
                  <span className="text-[10px] text-[#8C98B6]">Median turnaround</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-1">
                  <span className="text-[11px] font-mono text-[#7682A4] block">Reply Time (You)</span>
                  <div className="text-lg font-bold text-[#64D2FF] font-mono">
                    {formatSecs(profile.medianReplyTimeMeSecs)}
                  </div>
                  <span className="text-[10px] text-[#8C98B6]">Your turnaround</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-1">
                  <span className="text-[11px] font-mono text-[#7682A4] block">Longest Silence</span>
                  <div className="text-lg font-bold text-[#FF9F0A] font-mono">
                    {profile.longestSilenceDays} days
                  </div>
                  <span className="text-[10px] text-[#8C98B6]">Max conversation gap</span>
                </div>
              </div>

              {/* Busiest Hours & Topics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-3">
                  <h4 className="text-xs font-mono font-bold text-[#64D2FF] uppercase">Busiest Chatting Hours</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.busiestHours.map((h) => (
                      <span key={h} className="px-3 py-1.5 rounded-xl bg-[#141B2D] border border-[#232F4E] text-xs font-mono text-[#CCD4EC]">
                        {formatHour(h)}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-[#7682A4] block">
                    Busiest Days: {profile.busiestDays.map((d) => daysOfWeek[d]).join(", ")}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-3">
                  <h4 className="text-xs font-mono font-bold text-[#64D2FF] uppercase">Shared Themes & Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.sharedTopics.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-lg bg-[#11172A] border border-[#1E294B] text-xs font-mono text-[#A8B4D4]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROMISES */}
          {activeTab === "promises" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-[#FF334B] uppercase">Promises You Owe {profile.name} ({profile.promisesIOwe.length})</h4>
                {profile.promisesIOwe.length === 0 ? (
                  <p className="text-xs font-mono text-[#6A7694]">No outstanding commitments owed by you.</p>
                ) : (
                  profile.promisesIOwe.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-[#140F14] border border-[#3A1B28]/60 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[#FF334B]">&ldquo;{p.text}&rdquo;</span>
                        <span className="text-[#8C98B6]">{p.status}</span>
                      </div>
                      {p.evidence && <p className="text-[11px] font-mono text-[#7A85A4]">{p.evidence}</p>}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-[#161C2E]">
                <h4 className="text-xs font-mono font-bold text-[#64D2FF] uppercase">Promises {profile.name} Owes You ({profile.promisesTheyOwe.length})</h4>
                {profile.promisesTheyOwe.length === 0 ? (
                  <p className="text-xs font-mono text-[#6A7694]">No tracked commitments from {profile.name}.</p>
                ) : (
                  profile.promisesTheyOwe.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-[#0A131C] border border-[#162A3D]/60 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[#64D2FF]">&ldquo;{p.text}&rdquo;</span>
                        <span className="text-[#8C98B6]">{p.status}</span>
                      </div>
                      {p.evidence && <p className="text-[11px] font-mono text-[#7A85A4]">{p.evidence}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PER-PERSON BRIEFING */}
          {activeTab === "briefing" && (
            <div className="p-6 rounded-2xl bg-[#0D1220] border border-[#1A233C] space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#64D2FF]">
                <Sparkles className="w-4 h-4" />
                <span>Executive Catch-Up: {profile.name}</span>
              </div>

              <div className="space-y-2 text-xs text-[#CCD4EC] leading-relaxed font-sans">
                <p>
                  • <strong>Current Status:</strong> {profile.ghostStatus ? profile.ghostStatus.explanation : `Reciprocal conversation pace. Last message sent on ${new Date(profile.lastMessageAt).toLocaleDateString()}.`}
                </p>
                <p>
                  • <strong>Open Loops:</strong> {profile.promisesIOwe.length > 0 ? `You have ${profile.promisesIOwe.length} open commitment(s) waiting for feedback.` : "No open promises pending from you."}
                </p>
                <p>
                  • <strong>Recent Discussion:</strong> Top themes centered on {profile.sharedTopics.slice(0, 3).join(", ") || "daily catch-ups and logistics"}.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVATE NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white">Private Notes for {profile.name}</h4>
                <p className="text-[11px] text-[#7A85A4]">
                  These notes are stored 100% locally on your browser and are never sent to any server.
                </p>
              </div>

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder={`Write private context about ${profile.name} (e.g. birthday, project role, favorite cafe)...`}
                rows={6}
                className="w-full p-4 rounded-2xl bg-[#090C16] border border-[#1C253E] text-xs font-mono text-white placeholder-[#535D7A] focus:outline-none focus:border-[#64D2FF] resize-none"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-2 rounded-xl bg-[#64D2FF] hover:bg-[#52BCE6] text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shadow-[#64D2FF]/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavedNotes ? "Saved Locally!" : "Save Notes"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
