"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2, Users, Shield, Cpu } from "lucide-react";
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processUploadedFiles(Array.from(e.target.files));
    }
  };

  const processUploadedFiles = async (files: File[]) => {
    setIsProcessingFiles(true);
    setErrorMsg(null);
    setFileProgress({ current: 0, total: files.length });

    try {
      const parsedChats: { chat: Chat; messages: Message[] }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgress({ current: i + 1, total: files.length });
        setProgressStatus(`Parsing ${file.name}...`);

        const textContent = await file.text();
        const parsed = parseChatFile(textContent, file.name);

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

        parsedChats.push({
          chat: chatObj,
          messages: parsed.messages,
        });
      }

      setProgressStatus("Analyzing conversational patterns, commitments & reply debt...");

      const allChats = parsedChats.map((p) => p.chat);
      const allStats: ChatStats[] = [];
      const allGhosts: GhostEntry[] = [];
      const allPromises: PromiseItem[] = [];
      const allMessages: Message[] = [];

      const totalChats = parsedChats.length || 1;

      for (let i = 0; i < parsedChats.length; i++) {
        const { chat, messages } = parsedChats[i];
        const analysis = analyzeChat(chat.id, messages, chat.selfName, (i + 1) / totalChats);

        allStats.push(analysis.stats);
        if (analysis.ghost) {
          allGhosts.push(analysis.ghost);
        }
        allPromises.push(...analysis.promises);
        allMessages.push(...messages);
      }

      const replyDebt = calculateReplyDebt(allGhosts, allChats, allPromises);

      // Save to Dexie DB
      await db.transaction("rw", [db.chats, db.messages, db.stats, db.ghosts, db.promises], async () => {
        await db.chats.bulkPut(allChats);
        await db.messages.bulkPut(allMessages);
        await db.stats.bulkPut(allStats);
        await db.ghosts.bulkPut(allGhosts);
        await db.promises.bulkPut(allPromises);
      });

      onDataLoaded({
        chats: allChats,
        stats: allStats,
        ghosts: allGhosts,
        promises: allPromises,
        replyDebt,
        isDemo: false,
      });
    } catch (err: any) {
      setErrorMsg(`Error processing files: ${err.message || String(err)}`);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    setErrorMsg(null);
    try {
      const result = await loadDemoChatsIntoDB((curr, total, name) => {
        setProgressStatus(`Loading benchmark dataset (${curr}/${total}): ${name}`);
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
      setErrorMsg(`Failed to load benchmark data: ${err.message || String(err)}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 space-y-6 text-left">
      {/* Drag & Drop Upload Zone (Hero Card) */}
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

          <div className="pt-3 flex items-center gap-4 text-xs font-mono text-[#6C7694]">
            <span className="flex items-center gap-1 text-[#30D158]">
              <Shield className="w-3.5 h-3.5" /> 100% Client-Side Ingestion
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#64D2FF]">
              <Cpu className="w-3.5 h-3.5" /> Local IndexedDB
            </span>
          </div>
        </div>
      </div>

      {/* Benchmark Sample Loader Card */}
      <div className="p-6 rounded-2xl bg-[#0B0D15] border border-[#1A1F30] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF9F0A]">
            <Sparkles className="w-3.5 h-3.5" /> Instant Benchmark Dataset
          </div>
          <p className="text-xs text-[#828BA5]">
            Want to test immediately? Load 9 synthetic benchmark chats across WhatsApp, Telegram, and Discord.
          </p>
        </div>

        <button
          onClick={handleLoadDemoData}
          disabled={isLoadingDemo || isProcessingFiles}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#161B2E] hover:bg-[#202740] border border-[#2B3554] text-xs font-mono font-bold text-[#64D2FF] hover:text-white transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          {isLoadingDemo ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Dataset...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Benchmark Dataset (1-Click)</span>
            </>
          )}
        </button>
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
