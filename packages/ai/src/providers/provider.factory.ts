// LLM provider factory for the @veska/ai package.
// Selects a provider based on the LLM_PROVIDER environment variable.
//
// LLM_PROVIDER values:
//   anthropic  → Anthropic Claude  (requires ANTHROPIC_API_KEY)
//   ollama     → Local Ollama      (requires Ollama at OLLAMA_BASE_URL)
//   local      → Alias for ollama  (LM Studio / Jan)
//   openai     → OpenAI API        (requires OPENAI_API_KEY)
//   azure      → Azure OpenAI      (requires OPENAI_API_KEY + OPENAI_BASE_URL)
//   groq       → Groq              (requires OPENAI_API_KEY)
//   together   → Together.ai       (requires OPENAI_API_KEY)

import type { LLMProvider } from '../llm-provider.js';
import { AnthropicProvider } from '../llm-provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { OpenAICompatProvider } from './openai-compat.provider.js';

export type ProviderName =
  | 'anthropic'
  | 'ollama'
  | 'local'
  | 'openai'
  | 'azure'
  | 'groq'
  | 'together';

/** Helper: returns value only if defined, so we don't violate exactOptionalPropertyTypes. */
function env(key: string): string | undefined {
  const v = process.env[key];
  return v !== undefined ? v : undefined;
}

export function createLLMProvider(): LLMProvider {
  const provider = (process.env['LLM_PROVIDER'] ?? 'anthropic') as ProviderName;

  switch (provider) {
    case 'anthropic': {
      const apiKey = env('ANTHROPIC_API_KEY');
      if (!apiKey) {
        console.warn(
          '[LLM] LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — ' +
            'falling back to Ollama. Set LLM_PROVIDER=ollama to silence this warning.',
        );
        return new OllamaProvider();
      }
      return new AnthropicProvider(apiKey);
    }

    case 'ollama':
    case 'local': {
      const cfg: ConstructorParameters<typeof OllamaProvider>[0] = {};
      const baseUrl = env('OLLAMA_BASE_URL');
      const model = env('OLLAMA_MODEL');
      if (baseUrl !== undefined) cfg.baseUrl = baseUrl;
      if (model !== undefined) cfg.model = model;
      return new OllamaProvider(cfg);
    }

    case 'openai': {
      const cfg: ConstructorParameters<typeof OpenAICompatProvider>[0] = {
        baseUrl: env('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
        model: env('OPENAI_MODEL') ?? 'gpt-4o-mini',
      };
      const apiKey = env('OPENAI_API_KEY');
      if (apiKey !== undefined) cfg.apiKey = apiKey;
      return new OpenAICompatProvider(cfg);
    }

    case 'azure': {
      const cfg: ConstructorParameters<typeof OpenAICompatProvider>[0] = {
        model: env('OPENAI_MODEL') ?? 'gpt-4o',
      };
      const baseUrl = env('OPENAI_BASE_URL');
      const apiKey = env('OPENAI_API_KEY');
      if (baseUrl !== undefined) cfg.baseUrl = baseUrl;
      if (apiKey !== undefined) cfg.apiKey = apiKey;
      return new OpenAICompatProvider(cfg);
    }

    case 'groq': {
      const cfg: ConstructorParameters<typeof OpenAICompatProvider>[0] = {
        baseUrl: 'https://api.groq.com/openai/v1',
        model: env('OPENAI_MODEL') ?? 'llama-3.1-70b-versatile',
      };
      const apiKey = env('OPENAI_API_KEY');
      if (apiKey !== undefined) cfg.apiKey = apiKey;
      return new OpenAICompatProvider(cfg);
    }

    case 'together': {
      const cfg: ConstructorParameters<typeof OpenAICompatProvider>[0] = {
        baseUrl: 'https://api.together.xyz/v1',
        model:
          env('OPENAI_MODEL') ??
          'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      };
      const apiKey = env('OPENAI_API_KEY');
      if (apiKey !== undefined) cfg.apiKey = apiKey;
      return new OpenAICompatProvider(cfg);
    }

    default:
      console.warn(
        `[LLM] Unknown LLM_PROVIDER="${String(provider)}", defaulting to Ollama.`,
      );
      return new OllamaProvider();
  }
}
