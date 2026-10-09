"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ArrowUpRight, Activity } from "lucide-react";
import type { NetworkLedgerState } from "@/types";

export const NetworkLedgerBadge: React.FC = () => {
  const [ledger, setLedger] = useState<NetworkLedgerState>({
    apiCalls: 0,
    bytesSent: 0,
    lastCallAt: null,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateFromStorage = () => {
      try {
        const stored = localStorage.getItem("whatsup_network_ledger");
        if (stored) {
          setLedger(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    };

    updateFromStorage();
    window.addEventListener("storage", updateFromStorage);
    const interval = setInterval(updateFromStorage, 1000);
    return () => {
      window.removeEventListener("storage", updateFromStorage);
      clearInterval(interval);
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 bytes";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isPureLocal = ledger.apiCalls === 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
          isPureLocal
            ? "bg-[#0A1713] border-[#30D158]/40 text-[#30D158] hover:bg-[#0E201B]"
            : "bg-[#1E1710] border-[#FF9F0A]/40 text-[#FF9F0A] hover:bg-[#2A1F13]"
        }`}
        title="Click to inspect outbound network ledger"
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">
          {isPureLocal ? "100% Local (0 bytes sent)" : `${ledger.apiCalls} API calls (${formatBytes(ledger.bytesSent)})`}
        </span>
        <Activity className="w-3 h-3 opacity-70 animate-pulse" />
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 p-4 rounded-xl bg-[#0F121E] border border-[#262C45] shadow-2xl z-50 text-left text-xs font-sans">
          <div className="flex items-center justify-between border-b border-[#20263D] pb-2 mb-3">
            <h4 className="font-bold text-white flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#30D158]" /> Privacy & Network Ledger
            </h4>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1B2138] text-[#8890A6]">
              Realtime
            </span>
          </div>

          <div className="space-y-2 mb-3 font-mono">
            <div className="flex justify-between text-[#8890A6]">
              <span>Outbound LLM Calls:</span>
              <span className="text-white font-bold">{ledger.apiCalls}</span>
            </div>
            <div className="flex justify-between text-[#8890A6]">
              <span>Payload Transmitted:</span>
              <span className="text-white font-bold">{formatBytes(ledger.bytesSent)}</span>
            </div>
            <div className="flex justify-between text-[#8890A6]">
              <span>Core Analytics:</span>
              <span className="text-[#30D158] font-bold">100% Local IndexedDB</span>
            </div>
          </div>

          <p className="text-[11px] text-[#7C86A2] leading-relaxed border-t border-[#20263D] pt-2">
            All parsing, metrics, reply debts, and ghost radar classifications run strictly in your browser. Server calls only occur upon explicit user request with client-side PII redaction.
          </p>
        </div>
      )}
    </div>
  );
};
