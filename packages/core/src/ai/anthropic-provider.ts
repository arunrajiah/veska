import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  CompletionParams,
  CompletionResult,
  CompletionChunk,
  ToolUseBlock,
} from './provider.js';

export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel?: string;
  defaultOpusModel?: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;
  private defaultOpusModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel ?? 'claude-sonnet-4-6';
    this.defaultOpusModel = config.defaultOpusModel ?? 'claude-opus-4-6';
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const model = params.model ?? this.defaultModel;
    const tools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }));

    const response = await this.client.messages.create({
      model,
      max_tokens: params.maxTokens ?? 8096,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: tools && tools.length > 0 ? tools : undefined,
      ...(params.thinking
        ? { thinking: { type: 'enabled', budget_tokens: params.thinking.budgetTokens } }
        : {}),
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const toolCalls: ToolUseBlock[] = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({
        type: 'tool_use' as const,
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      }));

    return {
      content: textContent,
      toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason ?? 'end_turn',
    };
  }

  async *stream(params: CompletionParams): AsyncIterable<CompletionChunk> {
    const model = params.model ?? this.defaultModel;
    const tools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }));

    const stream = await this.client.messages.stream({
      model,
      max_tokens: params.maxTokens ?? 8096,
      system: params.system,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { delta: event.delta.text };
      }
    }
  }

  /** Return the Opus model — used by the config agent for complex changes. */
  get opusModel(): string {
    return this.defaultOpusModel;
  }
}
