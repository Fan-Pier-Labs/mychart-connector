/**
 * Provider-agnostic AI types.
 * Designed so we can swap Gemini for another provider later.
 */

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiRequest {
  messages: AiMessage[];
  model?: string;
}

export interface AiResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AiProvider {
  chat(request: AiRequest): Promise<AiResponse>;
  defaultModel: string;
}
