import { z } from "zod";

// --- Zod Schemas for LLM JSON Responses ---

export const BriefingResponseSchema = z.object({
  tldr: z.tuple([z.string(), z.string(), z.string()]),
  topics: z.array(
    z.object({
      title: z.string(),
      bullets: z.array(z.string()),
      sourceMessageIds: z.array(z.string()).default([]),
    })
  ),
  decisions: z.array(z.string()).default([]),
  actionItems: z.array(z.string()).default([]),
  deadlines: z.array(
    z.object({
      title: z.string(),
      dueAt: z.string().nullable().default(null),
      context: z.string().optional(),
    })
  ).default([]),
});

export const TranslationResponseSchema = z.object({
  translatedText: z.string(),
  detectedLanguage: z.string(),
  toneNotes: z.string().optional(),
});

export const PromiseConfirmationResponseSchema = z.object({
  isPromise: z.boolean(),
  promiseText: z.string(),
  dueAt: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const ReplyDraftsResponseSchema = z.object({
  apologetic: z.string(),
  casual: z.string(),
  short: z.string(),
  warm: z.string().optional(),
  direct: z.string().optional(),
  professional: z.string().optional(),
});

export const WrappedCaptionResponseSchema = z.object({
  caption: z.string(),
  subtitle: z.string(),
  vibeTag: z.string(),
});

export type LLMTask =
  | "briefing_15s"
  | "briefing_2min"
  | "briefing_10min"
  | "translate"
  | "confirm_promise"
  | "draft_reply"
  | "wrapped_caption";

export type AIProvider = "gemini" | "anthropic" | "openai" | "local";

interface LLMRequestOptions<T> {
  task: LLMTask;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  apiKey?: string;
  provider?: AIProvider;
  model?: string;
}

/**
 * Detects the AI provider based on key format or environment variables
 */
export function detectAIProvider(key?: string): AIProvider {
  if (key) {
    if (key.startsWith("AIza")) return "gemini";
    if (key.startsWith("sk-ant-")) return "anthropic";
    if (key.startsWith("sk-")) return "openai";
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";

  return "local";
}

/**
 * Universal LLM invoker supporting Google Gemini, Anthropic Claude, and OpenAI
 * with automatic retries and strict Zod validation.
 */
export async function callLLMWithSchema<T>({
  task,
  systemPrompt,
  userPrompt,
  schema,
  apiKey,
  provider,
  model,
}: LLMRequestOptions<T>): Promise<{ success: true; data: T; bytesUsed: number } | { success: false; error: string }> {
  // Resolve provider & key
  const activeProvider = provider || detectAIProvider(apiKey);
  const resolvedKey =
    apiKey ||
    (activeProvider === "gemini"
      ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      : activeProvider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : activeProvider === "openai"
      ? process.env.OPENAI_API_KEY
      : undefined);

  if (!resolvedKey || activeProvider === "local") {
    return {
      success: false,
      error: "No AI API key configured. Utilizing local extractive AI engine.",
    };
  }

  try {
    if (activeProvider === "gemini") {
      return await callGeminiAPI({ systemPrompt, userPrompt, schema, apiKey: resolvedKey, model });
    } else if (activeProvider === "anthropic") {
      return await callAnthropicAPI({ systemPrompt, userPrompt, schema, apiKey: resolvedKey, model });
    } else if (activeProvider === "openai") {
      return await callOpenAIAPI({ systemPrompt, userPrompt, schema, apiKey: resolvedKey, model });
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to execute LLM request" };
  }

  return { success: false, error: "Unsupported AI provider" };
}

/**
 * Call Google Gemini REST API
 */
async function callGeminiAPI<T>({
  systemPrompt,
  userPrompt,
  schema,
  apiKey,
  model = process.env.GEMINI_MODEL || "gemini-1.5-flash",
}: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  apiKey: string;
  model?: string;
}): Promise<{ success: true; data: T; bytesUsed: number } | { success: false; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANT: Respond with ONLY a single valid JSON object matching the required schema without backticks or markdown fences.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  const payloadBytes = JSON.stringify(payload).length;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { success: false, error: `Gemini API error (${res.status}): ${errText}` };
  }

  const rawJson = await res.json();
  const textOutput = rawJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleanedText = cleanJsonText(textOutput);

  const parsed = JSON.parse(cleanedText);
  const validation = schema.safeParse(parsed);

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      bytesUsed: payloadBytes + JSON.stringify(rawJson).length,
    };
  }

  return { success: false, error: `Schema validation failed: ${validation.error.message}` };
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropicAPI<T>({
  systemPrompt,
  userPrompt,
  schema,
  apiKey,
  model = process.env.LLM_MODEL || "claude-3-5-haiku-20241022",
}: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  apiKey: string;
  model?: string;
}): Promise<{ success: true; data: T; bytesUsed: number } | { success: false; error: string }> {
  const payload = {
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${userPrompt}\n\nIMPORTANT: Respond with ONLY a single valid JSON object matching the required schema. Do not enclose in markdown code fences or add commentary.`,
      },
    ],
  };

  const payloadBytes = JSON.stringify(payload).length;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { success: false, error: `Anthropic API error (${res.status}): ${errorText}` };
  }

  const rawJson = await res.json();
  const rawText = rawJson.content?.[0]?.text || "";
  const cleanedText = cleanJsonText(rawText);

  const parsed = JSON.parse(cleanedText);
  const validation = schema.safeParse(parsed);

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      bytesUsed: payloadBytes + JSON.stringify(rawJson).length,
    };
  }

  return { success: false, error: `Schema validation failed: ${validation.error.message}` };
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI<T>({
  systemPrompt,
  userPrompt,
  schema,
  apiKey,
  model = "gpt-4o-mini",
}: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  apiKey: string;
  model?: string;
}): Promise<{ success: true; data: T; bytesUsed: number } | { success: false; error: string }> {
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${userPrompt}\n\nRespond with a valid JSON object matching the schema.` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  };

  const payloadBytes = JSON.stringify(payload).length;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { success: false, error: `OpenAI API error (${res.status}): ${errorText}` };
  }

  const rawJson = await res.json();
  const rawText = rawJson.choices?.[0]?.message?.content || "";
  const cleanedText = cleanJsonText(rawText);

  const parsed = JSON.parse(cleanedText);
  const validation = schema.safeParse(parsed);

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      bytesUsed: payloadBytes + JSON.stringify(rawJson).length,
    };
  }

  return { success: false, error: `Schema validation failed: ${validation.error.message}` };
}

function cleanJsonText(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
