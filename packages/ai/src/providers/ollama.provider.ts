// Ollama provider for the @veska/ai LLMProvider interface.
// Uses pure fetch — no npm package required.

import type { LLMProvider, LLMMessage } from '../llm-provider.js';
import type Anthropic from '@anthropic-ai/sdk';

export interface OllamaConfig {
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
  function: { name: string; description: string; parameters: unknown };
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
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = (
      config.baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
    ).replace(/\/$/, '');
    this.model = config.model ?? process.env['OLLAMA_MODEL'] ?? 'llama3.1';
    this.timeout = config.timeout ?? 120_000;
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const ollamaMessages: OllamaMessage[] = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ model: this.model, messages: ollamaMessages, stream: false }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama error: ${res.status} ${text}`);
      }
      const data = (await res.json()) as OllamaResponse;
      return data.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }

  async chatWithTools(
    messages: LLMMessage[],
    tools: Anthropic.Tool[],
    systemPrompt?: string,
  ): Promise<{ content: string; toolCalls: Array<{ name: string; input: unknown }> }> {
    const ollamaTools: OllamaTool[] = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters: t.input_schema,
      },
    }));

    const ollamaMessages: OllamaMessage[] = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
          tools: ollamaTools,
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
      const data = (await res.json()) as OllamaResponse;

      const toolCalls: Array<{ name: string; input: unknown }> = [];
      for (const tc of data.message?.tool_calls ?? []) {
        const args = tc.function.arguments;
        const input =
          typeof args === 'string'
            ? (JSON.parse(args) as unknown)
            : args;
        toolCalls.push({ name: tc.function.name, input });
      }

      return { content: data.message?.content ?? '', toolCalls };
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
