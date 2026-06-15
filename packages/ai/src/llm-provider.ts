// Cloud LLM provider interface for @veska/ai.
//
// Note: this interface uses chat()/chatWithTools() which is distinct from the OSS
// core LLMProvider (complete()/stream()). The cloud package keeps its own interface
// because it directly surfaces Anthropic tool format and supports multi-provider
// adapters (Ollama, OpenAI-compat) that are specific to the admin app context.

import Anthropic from '@anthropic-ai/sdk';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  chat(messages: LLMMessage[], systemPrompt?: string): Promise<string>;
  chatWithTools(
    messages: LLMMessage[],
    tools: Anthropic.Tool[],
    systemPrompt?: string
  ): Promise<{ content: string; toolCalls: Array<{ name: string; input: unknown }> }>;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'] });
    this.model = model;
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });
    const block = response.content[0];
    return block && block.type === 'text' ? block.text : '';
  }

  async chatWithTools(
    messages: LLMMessage[],
    tools: Anthropic.Tool[],
    systemPrompt?: string
  ): Promise<{ content: string; toolCalls: Array<{ name: string; input: unknown }> }> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    const toolCalls: Array<{ name: string; input: unknown }> = [];
    let textContent = '';

    for (const block of response.content) {
      if (block.type === 'text') textContent += block.text;
      if (block.type === 'tool_use') {
        toolCalls.push({ name: block.name, input: block.input });
      }
    }

    return { content: textContent, toolCalls };
  }
}
