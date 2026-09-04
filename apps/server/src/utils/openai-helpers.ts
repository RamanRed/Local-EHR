/**
 * openai-helpers.ts - Singleton Ollama client (OpenAI-compatible API) + chat wrappers.
 *
 * All LLM calls (entity extraction, reranking, response generation) go through
 * Ollama's /v1/chat/completions endpoint, which is fully OpenAI-API compatible.
 * No OpenAI key or internet connection required.
 */

import OpenAI from "openai";
import { CHAT_MODEL } from "./medical-prompts.js";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey:  "ollama",   // Required by the SDK but ignored by Ollama
      baseURL: (process.env.OLLAMA_BASE_URL || "http://localhost:11434") + "/v1",
    });
  }
  return _client;
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

  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: CHAT_MODEL,
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
  const raw     = await openaiChatText(messages, temperature, max_tokens);
  let cleaned   = raw.trim().replace(/^```(?:json)?\s*/, "");
  cleaned       = cleaned.replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("[ollama] JSON parse error | raw[:400]:", cleaned.slice(0, 400));
    return {};
  }
}
