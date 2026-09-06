/**
 * openai-helpers.ts — LLM client wrapper.
 *
 * Priority:
 *   1. Groq  (GROK_API_KEY set)  — fast, free tier, supports function calling
 *   2. Ollama (OLLAMA_BASE_URL)  — local fallback if Groq key absent
 *
 * All services (entity extraction, reranking, response generation) call through here.
 */

import OpenAI from "openai";
import { CHAT_MODEL, GROQ_FUNCTION_CALL_MODEL } from "./medical-prompts.js";

function buildClient(): OpenAI {
  const groqKey = process.env.GROK_API_KEY?.trim();
  if (groqKey) {
    console.log("[llm] Using Groq API (model:", GROQ_FUNCTION_CALL_MODEL, ")");
    return new OpenAI({
      apiKey:  groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  // Fallback: local Ollama
  console.log("[llm] GROK_API_KEY not set — falling back to Ollama:", CHAT_MODEL);
  return new OpenAI({
    apiKey:  "ollama",
    baseURL: (process.env.OLLAMA_BASE_URL || "http://localhost:11434") + "/v1",
  });
}

// Lazy singleton — rebuilt only once per process start
let _client: OpenAI | null = null;
export function getOpenAIClient(): OpenAI {
  if (!_client) _client = buildClient();
  return _client;
}

// Return the correct model string for the active backend
export function getActiveModel(needsFunctionCalling = false): string {
  const groqKey = process.env.GROK_API_KEY?.trim();
  if (groqKey) return needsFunctionCalling ? GROQ_FUNCTION_CALL_MODEL : GROQ_FUNCTION_CALL_MODEL;
  return CHAT_MODEL;
}

export async function openaiChat(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    temperature?: number;
    max_tokens?: number;
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  } = {},
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
  const client = getOpenAIClient();
  const { temperature = 0.2, max_tokens = 2048, tools, tool_choice } = options;

  const model = getActiveModel(!!tools);

  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  if (tools) {
    params.tools       = tools;
    params.tool_choice = tool_choice ?? "auto";
  }

  const resp = await client.chat.completions.create(params);
  return resp.choices[0].message;
}

export async function openaiChatText(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature = 0.2,
  max_tokens  = 2048,
): Promise<string> {
  const msg = await openaiChat(messages, { temperature, max_tokens });
  return msg.content ?? "";
}

export async function openaiChatJson(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature = 0.1,
  max_tokens  = 4000,
): Promise<Record<string, any>> {
  const raw   = await openaiChatText(messages, temperature, max_tokens);
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    console.error("[llm] JSON parse error | raw[:400]:", clean.slice(0, 400));
    return {};
  }
}
