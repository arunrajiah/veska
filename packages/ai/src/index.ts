// @veska-cloud/ai — cloud AI package for Veska
//
// Exports the cloud ActionAgent (HTTP-based), cloud-only tools, and all provider
// implementations. Also re-exports OSS core AI exports for convenience.

export { AnthropicProvider } from './llm-provider.js';
export type { LLMProvider, LLMMessage } from './llm-provider.js';

export { ActionAgent } from './action-agent.js';
export type { AgentContext, AgentResponse } from './action-agent.js';

export { ConfigAgent } from './config-agent.js';

export { ERP_TOOLS } from './erp-tools.js';
export { CLOUD_TOOLS } from './cloud-tools.js';

export { OllamaProvider } from './providers/ollama.provider.js';
export type { OllamaConfig } from './providers/ollama.provider.js';

export { OpenAICompatProvider } from './providers/openai-compat.provider.js';
export type { OpenAICompatConfig } from './providers/openai-compat.provider.js';

export { createLLMProvider } from './providers/provider.factory.js';
export type { ProviderName } from './providers/provider.factory.js';
