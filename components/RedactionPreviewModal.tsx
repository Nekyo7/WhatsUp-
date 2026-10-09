"use client";

import React from "react";
import { ShieldAlert, Check, X, Lock } from "lucide-react";
import type { RedactionResult } from "@/lib/redact";

interface RedactionPreviewModalProps {
  isOpen: boolean;
  redaction: RedactionResult | null;
  featureName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RedactionPreviewModal: React.FC<RedactionPreviewModalProps> = ({
  isOpen,
  redaction,
  featureName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !redaction) return null;

  const totalMasked =
    redaction.stats.namesMaskedCount +
    redaction.stats.phonesMaskedCount +
    redaction.stats.emailsMaskedCount +
    redaction.stats.urlsMaskedCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0E111C] border border-[#262E4A] rounded-2xl p-6 lg:p-7 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E253E] pb-3">
          <div className="flex items-center gap-2.5 text-white font-bold font-display text-lg">
            <Lock className="w-5 h-5 text-[#30D158]" />
            <span>Redaction Preview & AI Transmission</span>
          </div>
          <button onClick={onCancel} className="text-[#7E89A6] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational callout */}
        <div className="p-3.5 rounded-xl bg-[#141A2D] border border-[#253258] text-xs text-[#CCD4EC] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-[#64D2FF]">
            <ShieldAlert className="w-4 h-4" />
            <span>Best-Effort PII Sanitization Active</span>
          </div>
          <p className="text-[#8E9BBF] leading-relaxed">
            Before executing <strong>{featureName}</strong>, contact names have been replaced with anonymous tokens (e.g. <em>Person A</em>, <em>Person B</em>) and all detected phone numbers, emails, and URLs have been masked. Only an excerpt (capped at 150 messages) is transmitted.
          </p>
        </div>

        {/* Redaction Stats Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="stamp-badge stamp-emerald">
            {redaction.stats.namesMaskedCount} names masked
          </span>
          <span className="stamp-badge stamp-cyan">
            {redaction.stats.phonesMaskedCount} phones masked
          </span>
          <span className="stamp-badge stamp-amber">
            {redaction.stats.emailsMaskedCount} emails masked
          </span>
          <span className="stamp-badge stamp-crimson">
            {redaction.stats.urlsMaskedCount} URLs sanitized
          </span>
        </div>

        {/* Exact Redacted Payload Code Preview */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono text-[#7B87A6]">
            <span>Exact Payload to be Sent:</span>
            <span>{redaction.redactedExcerptText.length} characters</span>
          </div>

          <pre className="p-4 rounded-xl bg-[#08090E] border border-[#191F33] text-xs font-mono text-[#4ADE80] overflow-y-auto max-h-60 whitespace-pre-wrap leading-relaxed">
            {redaction.redactedExcerptText}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-mono text-[#8E9AB8] hover:bg-[#161C2E] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#30D158] hover:bg-[#28B84B] text-black shadow-lg shadow-[#30D158]/20 flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4 text-black" />
            <span>Confirm & Transmit to AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
