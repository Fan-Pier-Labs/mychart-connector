/**
 * Gemini AI provider implementation.
 * Swap this file out to change providers.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../mcp/config';
import type { AiProvider, AiRequest, AiResponse } from './types';

const DEFAULT_MODEL = 'gemini-2.5-flash';

let client: GoogleGenerativeAI | null = null;

async function getClient(): Promise<GoogleGenerativeAI> {
  if (client) return client;
  const apiKey = await getGeminiApiKey();
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

export const geminiProvider: AiProvider = {
  defaultModel: DEFAULT_MODEL,

  async chat(request: AiRequest): Promise<AiResponse> {
    const ai = await getClient();
    const modelName = request.model ?? DEFAULT_MODEL;
    const model = ai.getGenerativeModel({
      model: modelName,
      ...(request.system
        ? { systemInstruction: { role: 'system', parts: [{ text: request.system }] } }
        : {}),
    });

    // Convert messages to Gemini format: history + final user message
    const history = request.messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: msg.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    const usage = response.usageMetadata;

    return {
      content: response.text(),
      model: modelName,
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
    };
  },
};
