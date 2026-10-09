import { db } from "@/lib/db";
import type { CachedTranslation } from "@/types";

/**
 * Fast string hash for translation caching key.
 */
export function hashTranslationKey(text: string, targetLang: string, provider: string): string {
  let hash = 0;
  const str = `${text}_${targetLang}_${provider}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `trans_${Math.abs(hash).toString(36)}`;
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
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  // 3. Cache result in IndexedDB
  try {
    const cacheRecord: CachedTranslation = {
      id: hash,
      hash,
      originalText: text,
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
