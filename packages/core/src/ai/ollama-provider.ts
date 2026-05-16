// Ollama LLM provider — pure fetch, no npm package required.
// Compatible with llama3.1, mistral, phi3, and any Ollama-served model.

import type {
  LLMProvider,
  CompletionParams,
  CompletionResult,
  CompletionChunk,
} from './provider.js';

export interface OllamaProviderConfig {
  baseUrl?: string;   // default: 'http://localhost:11434'
  model?: string;     // default: 'llama3.1'
  timeout?: number;   // default: 120000ms
}

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

interface OllamaResponse {
  message?: {
    content?: string;
    tool_calls?: Array<{
      function: { name: string; arguments: string | Record<string, unknown> };
    }>;
  };
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: OllamaProviderConfig = {}) {
    this.baseUrl = (
      config.baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
    ).replace(/\/$/, '');
    this.model = config.model ?? process.env['OLLAMA_MODEL'] ?? 'llama3.1';
    this.timeout = config.timeout ?? 120_000;
  }

  private buildMessages(params: CompletionParams): OllamaMessage[] {
    return [
      ...(params.system ? [{ role: 'system', content: params.system }] : []),
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const messages = this.buildMessages(params);
    const tools: OllamaTool[] | undefined = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let data: OllamaResponse;
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(tools && tools.length > 0 ? { tools } : {}),
          stream: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama error: ${res.status} ${text}`);
      }
      data = (await res.json()) as OllamaResponse;
    } finally {
      clearTimeout(timer);
    }

    const toolCalls: CompletionResult['toolCalls'] = [];
    let idCounter = 0;

    for (const tc of data.message?.tool_calls ?? []) {
      const rawArgs = tc.function.arguments;
      const input =
        typeof rawArgs === 'string'
          ? (JSON.parse(rawArgs) as Record<string, unknown>)
          : (rawArgs as Record<string, unknown>);
      toolCalls.push({
        type: 'tool_use',
        id: `ollama-tool-${idCounter++}`,
        name: tc.function.name,
        input,
      });
    }

    return {
      content: data.message?.content ?? '',
      toolCalls,
      // Ollama does not expose token counts in all versions
      inputTokens: 0,
      outputTokens: 0,
      stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(params: CompletionParams): AsyncIterable<CompletionChunk> {
    const messages = this.buildMessages(params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama stream error: ${res.status}`);
      }
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as {
              message?: { content?: string };
              done?: boolean;
            };
            if (chunk.message?.content) {
              yield { delta: chunk.message.content };
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Check if Ollama is reachable. */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** List models available in Ollama. */
  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return data.models?.map((m) => m.name) ?? [];
    } catch {
      return [];
    }
  }
}
