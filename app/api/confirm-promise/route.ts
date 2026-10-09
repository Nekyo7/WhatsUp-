import { NextResponse } from "next/server";
import { callLLMWithSchema, PromiseConfirmationResponseSchema, type AIProvider } from "@/lib/llm";
import { analyzePromiseCandidate } from "@/lib/analytics/promises";
import { checkApiRateLimitAndPayload } from "@/lib/apiSecurity";

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    const body = JSON.parse(rawText || "{}");
    const { messageText, contextText = "", apiKey, provider, model } = body;

    const customKey = apiKey || req.headers.get("x-ai-key") || undefined;
    const customProvider = (provider || req.headers.get("x-ai-provider") || undefined) as AIProvider | undefined;

    const rateLimitError = checkApiRateLimitAndPayload(req, rawText, Boolean(customKey));
    if (rateLimitError) return rateLimitError;

    if (!messageText) {
      return NextResponse.json({ error: "Missing message text" }, { status: 400 });
    }

    const systemPrompt = `You are an AI task and promise validator. You determine whether a statement is an explicit first-person commitment to do work or deliver something in the future.
Constraints:
- "isPromise": boolean
- "promiseText": normalized description of the task
- "dueAt": ISO deadline or null
- "confidence": number between 0 and 1
- "reasoning": brief explanation`;

    const userPrompt = `Context: ${contextText}
Message: "${messageText}"

Analyze this promise and return JSON adhering to schema.`;

    const result = await callLLMWithSchema({
      task: "confirm_promise",
      systemPrompt,
      userPrompt,
      schema: PromiseConfirmationResponseSchema,
      apiKey: customKey,
      provider: customProvider,
      model,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        bytesUsed: result.bytesUsed,
      });
    }

    // Heuristic analysis fallback
    const heuristicData = analyzePromiseCandidate(messageText);

    return NextResponse.json({
      success: true,
      data: heuristicData,
      bytesUsed: 0,
      isDemoCached: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to confirm promise" }, { status: 500 });
  }
}
