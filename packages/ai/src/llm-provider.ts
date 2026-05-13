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

  constructor(apiKey?: string, model = 'claude-sonnet-4-5') {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
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
    return block.type === 'text' ? block.text : '';
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
