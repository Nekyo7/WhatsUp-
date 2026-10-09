"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2, Users, Shield, Cpu, UserCheck, ArrowRight } from "lucide-react";
import { parseChatFile } from "@/lib/parsers";
import { analyzeChat } from "@/lib/analytics";
import { calculateReplyDebt } from "@/lib/analytics/debt";
import { db } from "@/lib/db";
import { loadDemoChatsIntoDB } from "@/lib/demoLoader";
import type { Chat, Message, ChatStats, GhostEntry, PromiseItem, ReplyDebtBreakdown } from "@/types";

interface ChatImporterProps {
  onDataLoaded: (data: {
    chats: Chat[];
    stats: ChatStats[];
    ghosts: GhostEntry[];
    promises: PromiseItem[];
    replyDebt: ReplyDebtBreakdown;
    isDemo: boolean;
  }) => void;
}

export const ChatImporter: React.FC<ChatImporterProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [fileProgress, setFileProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staged parsed files waiting for identity confirmation
  const [stagedParsedChats, setStagedParsedChats] = useState<{ chat: Chat; messages: Message[] }[] | null>(null);
  const [detectedParticipants, setDetectedParticipants] = useState<string[]>([]);
  const [selectedSelfName, setSelectedSelfName] = useState<string>("");
  const [customSelfName, setCustomSelfName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNoPersistMode, setIsNoPersistMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("whatsup_no_persist") === "true";
    }
    return false;
  });

  const toggleNoPersistMode = (checked: boolean) => {
    setIsNoPersistMode(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("whatsup_no_persist", String(checked));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await stageUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await stageUploadedFiles(Array.from(e.target.files));
    }
  };

  const stageUploadedFiles = async (files: File[]) => {
    setIsProcessingFiles(true);
    setErrorMsg(null);
    setFileProgress({ current: 0, total: files.length });

    try {
      const parsedList: { chat: Chat; messages: Message[] }[] = [];
      const allParticipants = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgress({ current: i + 1, total: files.length });
        setProgressStatus(`Parsing ${file.name}...`);

        const textContent = await file.text();
        const parsed = parseChatFile(textContent, file.name);

        parsed.participants.forEach((p) => allParticipants.add(p));

        const chatObj: Chat = {
          id: parsed.chatId,
          title: parsed.title,
          platform: parsed.platform,
          isGroup: parsed.isGroup,
          participants: parsed.participants,
          messageCount: parsed.messages.length,
          firstMessageAt: parsed.firstMessageAt,
          lastMessageAt: parsed.lastMessageAt,
          selfName: parsed.detectedSelfNameCandidate || "You",
        };

        parsedList.push({
          chat: chatObj,
          messages: parsed.messages,
        });
      }

      const participantArray = Array.from(allParticipants);
      const savedSelf = typeof window !== "undefined" ? localStorage.getItem("whatsup_self_name") : null;
      const initialCandidate = savedSelf || participantArray.find((p) => p.toLowerCase() === "you") || participantArray[0] || "You";

      setStagedParsedChats(parsedList);
      setDetectedParticipants(participantArray);
      setSelectedSelfName(initialCandidate);
    } catch (err: any) {
      setErrorMsg(`Error parsing files: ${err.message || String(err)}`);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleConfirmIdentityAndAnalyze = async () => {
    if (!stagedParsedChats) return;
    setIsProcessingFiles(true);
    setProgressStatus("Computing local turn latencies, ghost classifications & reply debt...");

    try {
      const selfName = customSelfName.trim() || selectedSelfName || "You";
      if (typeof window !== "undefined") {
        localStorage.setItem("whatsup_self_name", selfName);
      }

      const allChats: Chat[] = [];
      const allStats: ChatStats[] = [];
      const allGhosts: GhostEntry[] = [];
      const allPromises: PromiseItem[] = [];
      const allMessages: Message[] = [];

      const totalChats = stagedParsedChats.length || 1;

      for (let i = 0; i < stagedParsedChats.length; i++) {
        const { chat, messages } = stagedParsedChats[i];
        chat.selfName = selfName;
        allChats.push(chat);

        const analysis = analyzeChat(chat.id, messages, selfName, (i + 1) / totalChats);

        allStats.push(analysis.stats);
        if (analysis.ghost) {
          allGhosts.push(analysis.ghost);
        }
        allPromises.push(...analysis.promises);
        allMessages.push(...messages);
      }

      const replyDebt = calculateReplyDebt(allGhosts, allChats, allPromises);

      // If not in no-persist mode, write to IndexedDB
      if (!isNoPersistMode) {
        await db.transaction("rw", [db.chats, db.messages, db.stats, db.ghosts, db.promises], async () => {
          await db.chats.bulkPut(allChats);
          await db.messages.bulkPut(allMessages);
          await db.stats.bulkPut(allStats);
          await db.ghosts.bulkPut(allGhosts);
          await db.promises.bulkPut(allPromises);
        });
      }

      onDataLoaded({
        chats: allChats,
        stats: allStats,
        ghosts: allGhosts,
        promises: allPromises,
        replyDebt,
        isDemo: false,
      });
    } catch (err: any) {
      setErrorMsg(`Error processing analytics: ${err.message || String(err)}`);
    } finally {
      setIsProcessingFiles(false);
      setStagedParsedChats(null);
    }
  };

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    setErrorMsg(null);
    try {
      const result = await loadDemoChatsIntoDB((curr, total, name) => {
        setProgressStatus(`Loading demo chats (${curr}/${total}): ${name}`);
      });

      onDataLoaded({
        chats: result.chats,
        stats: result.stats,
        ghosts: result.ghosts,
        promises: result.promises,
        replyDebt: result.replyDebt,
        isDemo: true,
      });
    } catch (err: any) {
      setErrorMsg(`Failed to load demo data: ${err.message || String(err)}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 space-y-6 text-left">
      {/* If files were parsed and identity confirmation is needed */}
      {stagedParsedChats ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#121626] via-[#0B0D18] to-[#07080F] border border-[#2B3554] shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 border-b border-[#1E253E] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#64D2FF]/15 border border-[#64D2FF]/40 flex items-center justify-center text-[#64D2FF]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-display">
                Step 2: Confirm Your Identity (&ldquo;I am...&rdquo;)
              </h3>
              <p className="text-xs text-[#8E99B8]">
                Select who <strong>You</strong> are in these {stagedParsedChats.length} uploaded chat(s) so ghosting, reply debt, and promises are accurately calculated.
              </p>
            </div>
          </div>

          {/* Uploaded Summary List */}
          <div className="p-3.5 rounded-xl bg-[#080A12] border border-[#161B2E] space-y-2">
            <span className="text-[11px] font-mono text-[#747E9E]">Parsed Conversations:</span>
            <div className="flex flex-wrap gap-2">
              {stagedParsedChats.map(({ chat }) => (
                <span
                  key={chat.id}
                  className="px-2.5 py-1 rounded-lg bg-[#101422] border border-[#1C243B] text-xs font-mono text-[#CCD2E3]"
                >
                  {chat.title} ({chat.messageCount} msgs)
                </span>
              ))}
            </div>
          </div>

          {/* Participant Selectors */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-[#8E99B8] block">
              Click your name from detected senders:
            </label>
            <div className="flex flex-wrap gap-2">
              {detectedParticipants.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedSelfName(name);
                    setCustomSelfName("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${
                    selectedSelfName === name && !customSelfName
                      ? "bg-[#64D2FF] text-black font-bold shadow-lg shadow-[#64D2FF]/20"
                      : "bg-[#0E1220] border border-[#1E253E] text-[#CCD2E3] hover:border-[#38456C]"
                  }`}
                >
                  <span>{name}</span>
                  {selectedSelfName === name && !customSelfName && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-mono text-[#6C7694] block mb-1">
                Or type your exact chat handle/alias if not listed:
              </span>
              <input
                type="text"
                placeholder="e.g. Nekyo or +91 98765 43210"
                value={customSelfName}
                onChange={(e) => setCustomSelfName(e.target.value)}
                className="w-full sm:max-w-md px-3.5 py-2 rounded-xl bg-[#080A12] border border-[#1E253E] text-xs font-mono text-white focus:outline-none focus:border-[#64D2FF]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1C2338]">
            <button
              onClick={() => setStagedParsedChats(null)}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#7A85A4] hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmIdentityAndAnalyze}
              disabled={isProcessingFiles}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF334B] to-[#FF5E7E] hover:brightness-110 text-white font-bold font-mono text-xs transition-all shadow-lg shadow-[#FF334B]/25 flex items-center gap-2"
            >
              <span>Run Local Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone (Hero Card) */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 lg:p-12 text-center transition-all duration-200 overflow-hidden shadow-2xl ${
            isDragging
              ? "border-[#FF334B] bg-[#FF334B]/10 scale-[1.01]"
              : "border-[#232A42] bg-gradient-to-b from-[#0F121E] via-[#0A0C14] to-[#07080C] hover:border-[#38456C] hover:bg-[#111524]"
          }`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#64D2FF]/5 rounded-full blur-3xl pointer-events-none" />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".txt,.json"
            className="hidden"
          />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-[#141A2B] border border-[#263152] flex items-center justify-center text-[#64D2FF] shadow-inner">
              <UploadCloud className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-black text-white font-display tracking-tight">
                Drop Exported Chat Files to Audit
              </h2>
              <p className="text-sm text-[#8E99B8] leading-relaxed">
                Upload exported <strong>WhatsApp</strong> (.txt), <strong>Telegram</strong> (JSON), or <strong>Discord</strong> (JSON) chats. Supports both 1-on-1 and Group chats.
              </p>
            </div>

            {/* Supported Format Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono text-[#7D88A6]">
              <span className="px-3 py-1.5 rounded-xl bg-[#111524] border border-[#1E253E] flex items-center gap-1.5 text-[#30D158]">
                <FileText className="w-3.5 h-3.5" /> WhatsApp .txt
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#111524] border border-[#1E253E] flex items-center gap-1.5 text-[#64D2FF]">
                <FileText className="w-3.5 h-3.5" /> Telegram .json
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#111524] border border-[#1E253E] flex items-center gap-1.5 text-[#FF9F0A]">
                <FileText className="w-3.5 h-3.5" /> Discord .json
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#111524] border border-[#1E253E] flex items-center gap-1.5 text-[#E879F9]">
                <Users className="w-3.5 h-3.5" /> Group Chats
              </span>
            </div>

            {/* Honest Privacy Statement */}
            <div className="pt-3 flex flex-col items-center gap-1.5 text-xs font-mono text-[#8894B3]">
              <div className="flex items-center gap-2 text-[#30D158]">
                <Shield className="w-4 h-4 text-[#30D158]" />
                <span>Analytics run 100% locally. AI is optional and sends only redacted excerpts, which you see first.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No-Persist Mode Toggle & Demo Loader */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* No-Persist Mode Card */}
        <div className="p-5 rounded-2xl bg-[#0B0D15] border border-[#1A1F30] flex items-center justify-between gap-3 text-left">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#64D2FF] flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" /> Don&apos;t save to this browser
            </div>
            <p className="text-[11px] text-[#7A85A4]">
              In-memory mode only. Nothing written to IndexedDB.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={isNoPersistMode}
              onChange={(e) => toggleNoPersistMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#161B2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#30D158]"></div>
          </label>
        </div>

        {/* Demo Sample Loader Card */}
        <div className="p-5 rounded-2xl bg-[#0B0D15] border border-[#1A1F30] flex items-center justify-between gap-3 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF9F0A]">
              <Sparkles className="w-3.5 h-3.5" /> Demo Dataset
            </div>
            <p className="text-[11px] text-[#7A85A4]">
              Load synthetic chats (WhatsApp, Telegram, Discord, Hinglish).
            </p>
          </div>

          <button
            onClick={handleLoadDemoData}
            disabled={isLoadingDemo || isProcessingFiles}
            className="px-4 py-2 rounded-xl bg-[#161B2E] hover:bg-[#202740] border border-[#2B3554] text-xs font-mono font-bold text-[#FF9F0A] hover:text-white transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            {isLoadingDemo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Demo Chats</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Processing Status Banner */}
      {(isProcessingFiles || isLoadingDemo) && (
        <div className="p-4 rounded-xl bg-[#101320] border border-[#2D3452] flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-[#FF9F0A] animate-spin flex-shrink-0" />
          <div className="text-xs font-mono text-[#CCD2E3]">
            <span className="text-white font-bold">{progressStatus}</span>
            {fileProgress.total > 0 && (
              <span className="text-[#8890A6] ml-2">
                [{fileProgress.current}/{fileProgress.total}]
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#2A0E14] border border-[#FF334B]/40 text-[#FF8595] text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF453A]" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
