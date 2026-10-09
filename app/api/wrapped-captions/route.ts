import { NextResponse } from "next/server";
import { callLLMWithSchema, WrappedCaptionResponseSchema, type AIProvider } from "@/lib/llm";
import { generateLocalWrappedCaption } from "@/lib/localAi";
import { checkApiRateLimitAndPayload } from "@/lib/apiSecurity";

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    const body = JSON.parse(rawText || "{}");
    const { topPersonName, totalTalkHours, longestSilenceDays, replyDebtScore, apiKey, provider, model } = body;

    const customKey = apiKey || req.headers.get("x-ai-key") || undefined;
    const customProvider = (provider || req.headers.get("x-ai-provider") || undefined) as AIProvider | undefined;

    const rateLimitError = checkApiRateLimitAndPayload(req, rawText, Boolean(customKey));
    if (rateLimitError) return rateLimitError;

    const systemPrompt = `You are the witty, slightly roasty copywriter for "WhatsUP? Guilt Wrapped".
Craft a funny, insightful, self-aware Instagram/Twitter caption summarizing the user's messaging habits and conversational guilt.`;

    const userPrompt = `Stats:
- Top Chat: ${topPersonName} (${totalTalkHours} hours of conversation)
- Longest Ghost / Silence: ${longestSilenceDays} days
- Current Reply Debt Score: ${replyDebtScore} / 100

Generate JSON with fields: caption, subtitle, vibeTag.`;

    const result = await callLLMWithSchema({
      task: "wrapped_caption",
      systemPrompt,
      userPrompt,
      schema: WrappedCaptionResponseSchema,
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

    // Dynamic Local Roast Generator
    const dynamicVerdict = generateLocalWrappedCaption({
      topPersonName,
      totalTalkHours,
      longestSilenceDays,
      replyDebtScore,
    });

    return NextResponse.json({
      success: true,
      data: dynamicVerdict,
      bytesUsed: 0,
      isDemoCached: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate wrapped caption" }, { status: 500 });
  }
}
