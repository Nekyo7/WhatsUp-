import { NextResponse } from "next/server";
import { callLLMWithSchema, BriefingResponseSchema, type AIProvider } from "@/lib/llm";
import { generateLocalBriefing } from "@/lib/localAi";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      chatId,
      timeBudget = "2min",
      redactedExcerptText,
      chatTitle = "Conversation",
      isGroup = false,
      messages = [],
      apiKey,
      provider,
      model,
    } = body;

    // Check custom headers for BYOK API keys
    const customKey = apiKey || req.headers.get("x-ai-key") || undefined;
    const customProvider = (provider || req.headers.get("x-ai-provider") || undefined) as AIProvider | undefined;

    const systemPrompt = `You are WhatsUP? Guilt Briefing Engine. You analyze overwhelming chat excerpts to triage conversational debt.
Strict constraints:
1. ONLY extract information directly stated in the messages. Do NOT hallucinate names, promises, or dates.
2. The user is "Person A (You)". Other participants are "Person B", "Person C", etc.
3. Output format must match the time budget:
   - "15s": Ultra-punchy 3 bullet points, 1 topic, immediate blockers.
   - "2min": 3 bullets TL;DR, 2-3 structured topics, decisions, action items, explicit deadlines.
   - "10min": Detailed deep-dive analysis, complete chronological commitment breakdown, recovery strategy.`;

    const userPrompt = `Chat Title: ${chatTitle}
Is Group Chat: ${isGroup ? "Yes" : "No"}
Time Budget: ${timeBudget}
Redacted Chat Excerpt (Recent messages):
${redactedExcerptText || ""}

Generate the structured briefing JSON object adhering strictly to the schema.`;

    const result = await callLLMWithSchema({
      task: `briefing_${timeBudget}` as any,
      systemPrompt,
      userPrompt,
      schema: BriefingResponseSchema,
      apiKey: customKey,
      provider: customProvider,
      model,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        briefing: {
          chatId,
          timeBudget,
          ...result.data,
          generatedAt: new Date().toISOString(),
          isDemoCached: false,
        },
        bytesUsed: result.bytesUsed,
      });
    }

    // Dynamic Local NLP Engine Synthesis on actual messages
    const parsedMessages = Array.isArray(messages) && messages.length > 0
      ? messages
      : (redactedExcerptText || "").split("\n").map((line: string, i: number) => {
          const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
          return {
            sender: match ? match[2] : "Participant",
            text: match ? match[3] : line,
            timestamp: new Date().toISOString(),
          };
        });

    const dynamicBriefing = generateLocalBriefing({
      chatId,
      chatTitle,
      messages: parsedMessages,
      timeBudget: timeBudget as any,
      isGroup,
    });

    return NextResponse.json({
      success: true,
      briefing: dynamicBriefing,
      bytesUsed: 0,
      isDemoCached: false,
      fallbackNotice: "Generated via Local Real-Time NLP Synthesizer (No API Key Required)",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate briefing" }, { status: 500 });
  }
}
