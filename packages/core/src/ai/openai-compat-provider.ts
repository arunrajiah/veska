// OpenAI-compatible LLM provider — works with any OpenAI-spec endpoint:
// OpenAI, Azure OpenAI, Groq, Together.ai, LM Studio, vLLM, Jan, Anyscale.
// Uses pure fetch — no openai npm package required.

import type {
  LLMProvider,
  CompletionParams,
  CompletionResult,
  CompletionChunk,
} from './provider.js';

export interface OpenAICompatProviderConfig {
  /** e.g. 'https://api.openai.com/v1' or 'http://localhost:1234/v1' */
  baseUrl?: string;
  /** Required for cloud providers; optional for local servers. */
  apiKey?: string;
  /** e.g. 'gpt-4o', 'llama-3.1-70b-versatile', 'mixtral-8x7b' */
  model?: string;
  timeout?: number;
}

// ── Internal wire types ────────────────────────────────────────────────────

interface OAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
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
    finish_reason?: string;
  }>;
}

interface OAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────

export class OpenAICompatProvider implements LLMProvider {
  readonly name = 'openai-compat';
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config: OpenAICompatProviderConfig = {}) {
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

  private buildMessages(params: CompletionParams): OAIMessage[] {
    return [
      ...(params.system
        ? [{ role: 'system' as const, content: params.system }]
        : []),
      ...params.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const messages = this.buildMessages(params);
    const tools: OAITool[] | undefined = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const body: Record<string, unknown> = {
      model: params.model ?? this.model,
      messages,
      max_tokens: params.maxTokens ?? 8096,
      ...(params.temperature !== undefined
        ? { temperature: params.temperature }
        : {}),
      ...(tools && tools.length > 0
        ? { tools, tool_choice: 'auto' }
        : {}),
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeout),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI-compat error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as OAIResponse;
    const choice = data.choices?.[0];
    const message = choice?.message;

    const toolCalls: CompletionResult['toolCalls'] = [];
    for (const tc of message?.tool_calls ?? []) {
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        input = {};
      }
      toolCalls.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input,
      });
    }

    const stopReason =
      choice?.finish_reason === 'tool_calls'
        ? 'tool_use'
        : choice?.finish_reason === 'length'
        ? 'max_tokens'
        : 'end_turn';

    return {
      content: message?.content ?? '',
      toolCalls,
      // Token counts are available in the response but vary by provider
      inputTokens: 0,
      outputTokens: 0,
      stopReason,
    };
  }

  async *stream(params: CompletionParams): AsyncIterable<CompletionChunk> {
    const messages = this.buildMessages(params);

    const body: Record<string, unknown> = {
      model: params.model ?? this.model,
      messages,
      max_tokens: params.maxTokens ?? 8096,
      stream: true,
      ...(params.temperature !== undefined
        ? { temperature: params.temperature }
        : {}),
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeout),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`OpenAI-compat stream error: ${res.status}`);
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
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        const raw = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
        try {
          const chunk = JSON.parse(raw) as OAIStreamChunk;
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            yield { delta: delta.content };
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
