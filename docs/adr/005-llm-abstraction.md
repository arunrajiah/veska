# ADR 005 — LLM Abstraction

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

Anthropic Claude as the default provider, accessed through an `LLMProvider` interface in `packages/core/src/ai/provider.ts`. Default models: `claude-sonnet-4-6` for routine work, `claude-opus-4-6` for complex configuration changes.

## Rationale

- Claude's tool use (function calling) is best-in-class for the structured config-agent and action-agent patterns Veska requires.
- Extended thinking on Opus enables the deep multi-step reasoning needed for onboarding and complex workflow generation.
- The `LLMProvider` interface allows self-hosters to swap in OpenAI, Gemini, or local Ollama/vLLM without touching core logic.
- Prompt caching (Anthropic's 5-minute cache) significantly reduces costs for the config agent, which re-reads the same system prompt on every interaction.

## Provider Interface

```typescript
interface LLMProvider {
  complete(params: CompletionParams): Promise<CompletionResult>;
  stream(params: CompletionParams): AsyncIterable<CompletionChunk>;
}
```

## Alternatives Considered

- **OpenAI GPT-4o** — strong alternative, but weaker tool-use reliability for complex multi-tool chains in our testing.
- **Google Gemini 1.5 Pro** — long context is useful; add as a provider adapter in v1.
- **Local Ollama** — great for privacy-first self-hosters; expose as `OllamaProvider` via the same interface.

## Consequences

- Anthropic SDK is a direct dependency of `packages/core`. Other providers are optional peer dependencies.
- All LLM calls are logged (prompt + response + token counts) in the audit log for debugging and cost tracking.
- The system must degrade gracefully when the LLM is unavailable — no core CRUD operations should require a live LLM call.
