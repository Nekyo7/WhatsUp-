"use client";

import React, { useState } from "react";
import { Trash2, AlertOctagon, X, Check } from "lucide-react";
import { wipeAllData } from "@/lib/db";

interface WipeDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWiped: () => void;
}

export const WipeDataModal: React.FC<WipeDataModalProps> = ({ isOpen, onClose, onWiped }) => {
  const [isWiping, setIsWiping] = useState(false);

  if (!isOpen) return null;

  const handleConfirmWipe = async () => {
    setIsWiping(true);
    try {
      await wipeAllData();
      onWiped();
      onClose();
    } catch (err) {
      console.error("Failed to wipe data:", err);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0F121E] border border-[#2D161B] rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-[#25181F] pb-3">
          <div className="flex items-center gap-2 text-[#FF334B] font-bold">
            <AlertOctagon className="w-5 h-5" />
            <span>Wipe All Local Data</span>
          </div>
          <button onClick={onClose} className="text-[#8890A6] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-[#B3BACD]">
          <p>
            This action will <strong>permanently delete</strong> all stored chat messages, analytics, reply debt records, and generated briefings from your browser&apos;s IndexedDB.
          </p>
          <div className="p-3 rounded-xl bg-[#1C0D12] border border-[#FF334B]/30 text-xs font-mono text-[#FF8595]">
            ⚠️ Your network ledger counters and local caches will be reset to 0.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isWiping}
            className="px-4 py-2 rounded-xl text-xs font-mono text-[#8E97B2] hover:bg-[#161B2E] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmWipe}
            disabled={isWiping}
            className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#FF334B] hover:bg-[#D92038] text-white shadow-lg shadow-[#FF334B]/25 flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isWiping ? "Wiping..." : "Yes, Wipe Everything"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
