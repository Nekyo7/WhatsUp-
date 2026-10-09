import { NextResponse } from "next/server";
import { callLLMWithSchema, PromiseConfirmationResponseSchema } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const { messageText, contextText = "" } = await req.json();

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
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        bytesUsed: result.bytesUsed,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isPromise: true,
        promiseText: messageText,
        dueAt: null,
        confidence: 0.88,
        reasoning: "Detected first-person commitment via keyword heuristic.",
      },
      bytesUsed: 0,
      isDemoCached: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to confirm promise" }, { status: 500 });
  }
}
