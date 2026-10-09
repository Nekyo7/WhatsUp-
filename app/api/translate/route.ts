import { NextResponse } from "next/server";
import { callLLMWithSchema, TranslationResponseSchema, type AIProvider } from "@/lib/llm";
import { translateHinglishLocal } from "@/lib/localAi";

export async function POST(req: Request) {
  try {
    const { text, apiKey, provider, model } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text to translate" }, { status: 400 });
    }

    const customKey = apiKey || req.headers.get("x-ai-key") || undefined;
    const customProvider = (provider || req.headers.get("x-ai-provider") || undefined) as AIProvider | undefined;

    const systemPrompt = `You are an expert translator specializing in Hinglish (Hindi-English colloquial mix) and informal chat messaging.
Translate the message into clear, natural English while preserving the emotional tone, urgency, and colloquial humor.`;

    const userPrompt = `Translate this message to English:\n"${text}"`;

    const result = await callLLMWithSchema({
      task: "translate",
      systemPrompt,
      userPrompt,
      schema: TranslationResponseSchema,
      apiKey: customKey,
      provider: customProvider,
      model,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        ...result.data,
        bytesUsed: result.bytesUsed,
      });
    }

    // Dynamic Local Hinglish Translator
    const localResult = translateHinglishLocal(text);

    return NextResponse.json({
      success: true,
      translatedText: localResult.translatedText,
      detectedLanguage: localResult.detectedLanguage,
      toneNotes: localResult.toneNotes || "Translated via Local NLP dictionary",
      bytesUsed: 0,
      isDemoCached: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to translate" }, { status: 500 });
  }
}
