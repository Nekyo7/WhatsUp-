import { db } from "@/lib/db";
import type { CachedTranslation } from "@/types";

/**
 * Fast string hash for translation caching key.
 */
/**
 * Collision-resistant 64-bit dual-hash for translation caching key.
 */
export function hashTranslationKey(text: string, targetLang: string, provider: string): string {
  const str = `${text}_${targetLang}_${provider}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ (ch * 31), 2166136261);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `trans_${hex1}${hex2}`;
}

export interface TranslateOptions {
  text: string;
  targetLanguage?: string;
  apiKey?: string;
  provider?: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
  toneNotes?: string;
  isCached: boolean;
}

/**
 * Translates chat text with IndexedDB caching and fallback.
 */
export async function translateTextWithCache({
  text,
  targetLanguage = "English",
  apiKey,
  provider = "local",
}: TranslateOptions): Promise<TranslateResult> {
  const hash = hashTranslationKey(text, targetLanguage, provider);

  // 1. Check IndexedDB cache
  try {
    const cached = await db.translations.get(hash);
    if (cached) {
      return {
        translatedText: cached.translatedText,
        detectedLanguage: cached.detectedSourceLang,
        isCached: true,
      };
    }
  } catch {
    // IndexedDB read failed or in-memory mode, continue to network/local
  }

  // 2. Call translation API
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-ai-key"] = apiKey;
  if (provider) headers["x-ai-provider"] = provider;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      targetLanguage,
      apiKey,
      provider,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to translate message");
  }

  // 3. Cache result in IndexedDB (store truncated snippet to minimize PII at rest)
  try {
    const preview = text.length > 50 ? `${text.slice(0, 47)}...` : text;
    const cacheRecord: CachedTranslation = {
      id: hash,
      hash,
      originalText: preview,
      targetLang: targetLanguage,
      translatedText: data.translatedText,
      detectedSourceLang: data.detectedLanguage || "unknown",
      provider,
      timestamp: new Date().toISOString(),
    };
    await db.translations.put(cacheRecord);
  } catch {
    // Ignore cache write error in private browsing/in-memory mode
  }

  return {
    translatedText: data.translatedText,
    detectedLanguage: data.detectedLanguage,
    toneNotes: data.toneNotes,
    isCached: false,
  };
}
