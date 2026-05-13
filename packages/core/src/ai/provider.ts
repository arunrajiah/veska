// LLM provider abstraction — swap between Anthropic, OpenAI, Gemini, Ollama
// without touching call sites.

export interface CompletionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
}

export interface CompletionParams {
  model?: string;
  system?: string;
  messages: CompletionMessage[];
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
  // Enable extended thinking (Anthropic-specific; ignored by other providers)
  thinking?: { type: 'enabled'; budgetTokens: number };
}

export interface CompletionResult {
  content: string;
  toolCalls: ToolUseBlock[];
  inputTokens: number;
  outputTokens: number;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
}

export interface CompletionChunk {
  delta: string;
  toolCall?: ToolUseBlock;
}

export interface LLMProvider {
  readonly name: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  stream(params: CompletionParams): AsyncIterable<CompletionChunk>;
}
