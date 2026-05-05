import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

/**
 * Lightweight client for the Groq chat-completions API.
 * Uses the OpenAI-compatible endpoint.
 *
 * Docs: https://console.groq.com/docs
 *
 * Modelos relevantes (mayo 2026):
 *   - llama-3.3-70b-versatile  → recomendado, soporta JSON mode
 *   - llama-3.1-8b-instant     → más rápido, menor calidad
 *   - mixtral-8x7b-32768       → contextos largos
 *   - deepseek-r1-distill-llama-70b → razonamiento (no JSON mode)
 */

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  responseJson?: boolean;
  /** Override del modelo configurado por defecto */
  model?: string;
}

export interface GroqCompletionResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export function isAiConfigured(): boolean {
  return !!config.GROQ_API_KEY;
}

export async function aiChat(opts: GroqCompletionOptions): Promise<GroqCompletionResponse> {
  if (!config.GROQ_API_KEY) {
    throw new AppError(
      'IA no configurada. Define GROQ_API_KEY en tu .env. Obtén una key gratis en https://console.groq.com',
      500,
      'AI_NOT_CONFIGURED'
    );
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? config.GROQ_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1500,
  };
  if (opts.responseJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new AppError(
      `Error al llamar a la IA (HTTP ${res.status}): ${errText.slice(0, 300)}`,
      502,
      'AI_ERROR'
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError('La IA devolvió una respuesta vacía', 502, 'AI_EMPTY');
  }

  return {
    content,
    promptTokens: json.usage?.prompt_tokens,
    completionTokens: json.usage?.completion_tokens,
  };
}
