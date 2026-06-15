// OpenAI-compatible provider for the @veska/ai LLMProvider interface.
// Works with: OpenAI, Azure OpenAI, Groq, Together.ai, LM Studio, vLLM, Jan.
// Uses pure fetch — no openai npm package required.

import type { LLMProvider, LLMMessage } from '../llm-provider.js';
import type Anthropic from '@anthropic-ai/sdk';

export interface OpenAICompatConfig {
  /** e.g. 'https://api.openai.com/v1' or 'http://localhost:1234/v1' */
  baseUrl?: string;
  /** Required for cloud providers; optional for local servers. */
  apiKey?: string;
  /** e.g. 'gpt-4o', 'llama-3.1-70b-versatile', 'mixtral-8x7b' */
  model?: string;
  timeout?: number;
}

interface OAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OAITool {
  type: 'function';
  function: { name: string; description?: string; parameters: unknown };
}

interface OAIResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
  }>;
}

export class OpenAICompatProvider implements LLMProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config: OpenAICompatConfig = {}) {
    this.baseUrl = (
      config.baseUrl ??
      process.env['OPENAI_BASE_URL'] ??
      'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    this.apiKey = config.apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
    this.model = config.model ?? process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
    this.timeout = config.timeout ?? 120_000;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const oaiMessages: OAIMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeout),
      body: JSON.stringify({ model: this.model, messages: oaiMessages }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI-compat error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as OAIResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }

  async chatWithTools(
    messages: LLMMessage[],
    tools: Anthropic.Tool[],
    systemPrompt?: string,
  ): Promise<{ content: string; toolCalls: Array<{ name: string; input: unknown }> }> {
    const oaiTools: OAITool[] = tools.map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));

    const oaiMessages: OAIMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeout),
      body: JSON.stringify({
        model: this.model,
        messages: oaiMessages,
        tools: oaiTools,
        tool_choice: 'auto',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI-compat error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as OAIResponse;
    const message = data.choices?.[0]?.message;

    const toolCalls: Array<{ name: string; input: unknown }> = [];
    for (const tc of message?.tool_calls ?? []) {
      let input: unknown;
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {
        input = {};
      }
      toolCalls.push({ name: tc.function.name, input });
    }

    return { content: message?.content ?? '', toolCalls };
  }
}
