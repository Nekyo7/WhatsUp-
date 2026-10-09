import { NextResponse } from "next/server";
import { callLLMWithSchema, ReplyDraftsResponseSchema, type AIProvider } from "@/lib/llm";
import { generateLocalReplyDrafts } from "@/lib/localAi";
import { checkApiRateLimitAndPayload } from "@/lib/apiSecurity";

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    const body = JSON.parse(rawText || "{}");
    const { chatId, lastMessagesText, contactName = "Friend", apiKey, provider, model } = body;

    const customKey = apiKey || req.headers.get("x-ai-key") || undefined;
    const customProvider = (provider || req.headers.get("x-ai-provider") || undefined) as AIProvider | undefined;

    const rateLimitError = checkApiRateLimitAndPayload(req, rawText, Boolean(customKey));
    if (rateLimitError) return rateLimitError;

    if (!lastMessagesText) {
      return NextResponse.json({ error: "Missing lastMessagesText" }, { status: 400 });
    }

    const systemPrompt = `You are a conversational AI assistant generating guilt-free response drafts for people who accidentally left a friend or colleague on read.
Generate drafts across the following tones:
1. "apologetic": Sincere apology, honest brief reason (busy/swamped), and immediate answer/deliverable.
2. "casual": Friendly, chill, acknowledging delay without excessive groveling.
3. "short": Ultra-concise, punchy 1-sentence reply with immediate answer.
4. "warm": Kind, empathetic, appreciative, caring check-in tone.
5. "direct": Straight-to-the-point, clear and actionable without excuses.
6. "professional": Courteous, structured, polite workplace tone.`;

    const userPrompt = `Contact: ${contactName}
Pending unanswered context:
${lastMessagesText}

Generate the drafts JSON object containing apologetic, casual, short, warm, direct, and professional replies.`;

    const result = await callLLMWithSchema({
      task: "draft_reply",
      systemPrompt,
      userPrompt,
      schema: ReplyDraftsResponseSchema,
      apiKey: customKey,
      provider: customProvider,
      model,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        drafts: result.data,
        bytesUsed: result.bytesUsed,
      });
    }

    // Dynamic Context-Aware Local Reply Drafter on actual messages
    const localDrafts = generateLocalReplyDrafts(contactName, lastMessagesText);

    return NextResponse.json({
      success: true,
      drafts: localDrafts,
      bytesUsed: 0,
      isDemoCached: false,
      fallbackNotice: "Generated via Local Contextual Drafter",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate drafts" }, { status: 500 });
  }
}
