import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Mock provider modules before importing the factory ──────────────────────
// We mock the concrete provider classes so the factory can be tested in
// isolation — no real API calls or Ollama process required.

vi.mock('../anthropic-provider.js', () => ({
  AnthropicProvider: vi.fn().mockImplementation(function (this: { name: string }) {
    this.name = 'anthropic';
  }),
}));

vi.mock('../ollama-provider.js', () => ({
  OllamaProvider: vi.fn().mockImplementation(function (this: { name: string }) {
    this.name = 'ollama';
  }),
}));

vi.mock('../openai-compat-provider.js', () => ({
  OpenAICompatProvider: vi.fn().mockImplementation(function (this: { name: string }) {
    this.name = 'openai-compat';
  }),
}));

// Import AFTER mocks are registered
import { createLLMProvider } from '../provider-factory.js';
import { AnthropicProvider } from '../anthropic-provider.js';
import { OllamaProvider } from '../ollama-provider.js';
import { OpenAICompatProvider } from '../openai-compat-provider.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createLLMProvider()', () => {
  it('returns AnthropicProvider when LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY is set', () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(AnthropicProvider).toHaveBeenCalledWith({ apiKey: 'sk-ant-test' });
  });

  it('falls back to OllamaProvider when LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing', () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    vi.stubEnv('ANTHROPIC_API_KEY', '');   // empty string treated as falsy inside the factory

    const provider = createLLMProvider();

    // The factory checks `if (!apiKey)` — empty string is falsy, so falls back
    // The result will be OllamaProvider in this case
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('returns OllamaProvider when LLM_PROVIDER=ollama', () => {
    vi.stubEnv('LLM_PROVIDER', 'ollama');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('returns OllamaProvider when LLM_PROVIDER=local (alias)', () => {
    vi.stubEnv('LLM_PROVIDER', 'local');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('returns OpenAICompatProvider for LLM_PROVIDER=groq', () => {
    vi.stubEnv('LLM_PROVIDER', 'groq');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OpenAICompatProvider);
    // Groq uses the Groq base URL
    const callArg = (OpenAICompatProvider as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as
      | { baseUrl?: string }
      | undefined;
    expect(callArg?.baseUrl).toBe('https://api.groq.com/openai/v1');
  });

  it('returns OpenAICompatProvider for LLM_PROVIDER=openai', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OpenAICompatProvider);
  });

  it('returns OpenAICompatProvider for LLM_PROVIDER=together', () => {
    vi.stubEnv('LLM_PROVIDER', 'together');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OpenAICompatProvider);
    const callArg = (OpenAICompatProvider as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as
      | { baseUrl?: string }
      | undefined;
    expect(callArg?.baseUrl).toBe('https://api.together.xyz/v1');
  });

  it('falls back to OllamaProvider for an unknown LLM_PROVIDER value', () => {
    vi.stubEnv('LLM_PROVIDER', 'unknown-provider-xyz');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OllamaProvider);
  });
});
