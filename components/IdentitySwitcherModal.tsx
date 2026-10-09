"use client";

import React, { useState } from "react";
import { X, UserCheck, CheckCircle2, User, Sparkles } from "lucide-react";

interface IdentitySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelfName: string;
  availableSenders: { name: string; messageCount: number }[];
  onSelectIdentity: (newName: string) => void;
}

export const IdentitySwitcherModal: React.FC<IdentitySwitcherModalProps> = ({
  isOpen,
  onClose,
  currentSelfName,
  availableSenders,
  onSelectIdentity,
}) => {
  const [customName, setCustomName] = useState("");

  if (!isOpen) return null;

  const handleSelect = (name: string) => {
    onSelectIdentity(name);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      handleSelect(customName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#121626] via-[#0B0D18] to-[#07080F] border border-[#2B3554] shadow-2xl p-6 sm:p-8 space-y-6 text-left overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E253E] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#64D2FF]/15 border border-[#64D2FF]/40 flex items-center justify-center text-[#64D2FF]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-display">
                Switch Active Identity
              </h3>
              <p className="text-xs text-[#8E99B8]">
                Currently analyzing as: <strong className="text-[#64D2FF]">{currentSelfName}</strong>
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

        {/* Senders List */}
        <div className="space-y-3">
          <label className="text-xs font-mono text-[#8E99B8] block">
            Select your sender identity across imported chats:
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {availableSenders.length === 0 ? (
              <div className="text-xs font-mono text-[#5A6380] text-center py-4">
                No senders detected yet.
              </div>
            ) : (
              availableSenders.map(({ name, messageCount }) => (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  className={`w-full p-3 rounded-xl border text-xs font-mono transition-all flex items-center justify-between group ${
                    currentSelfName.toLowerCase() === name.toLowerCase()
                      ? "bg-[#14263D] border-[#64D2FF] text-white font-bold"
                      : "bg-[#0A0C16] border-[#1C243B] text-[#CCD2E3] hover:border-[#38456C] hover:bg-[#101424]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-[#64D2FF]" />
                    <span className="text-sm">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7884A4] font-normal">
                      {messageCount} msgs
                    </span>
                    {currentSelfName.toLowerCase() === name.toLowerCase() && (
                      <CheckCircle2 className="w-4 h-4 text-[#64D2FF]" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="space-y-2 pt-2 border-t border-[#1C2338]">
          <label className="text-[11px] font-mono text-[#7884A4] block">
            Or type your exact chat handle if different:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Rohan or +91 98765 43210"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#080A12] border border-[#1E253E] text-xs font-mono text-white focus:outline-none focus:border-[#64D2FF]"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-4 py-2 rounded-xl bg-[#64D2FF] hover:bg-[#52BFE8] disabled:opacity-40 text-black font-bold font-mono text-xs transition-all"
            >
              Switch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
