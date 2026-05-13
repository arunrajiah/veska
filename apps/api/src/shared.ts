// Singleton services shared across the API process.
// Initialized once at startup in index.ts.

import {
  createDatabase,
  AnthropicProvider,
  MagicLinkService,
  AuditService,
  QueueService,
  type Database,
} from '@veska/core';
import { Redis } from 'ioredis';

if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL is required');
if (!process.env['ANTHROPIC_API_KEY']) throw new Error('ANTHROPIC_API_KEY is required');

export const sharedDb: Database = createDatabase(process.env['DATABASE_URL']);

export const sharedRedis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const sharedLlm = new AnthropicProvider({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

export const sharedMagicLinkService = new MagicLinkService(
  sharedDb,
  process.env['MAGIC_LINK_SECRET'] ?? 'dev-secret-change-me-in-production-32ch',
  process.env['MAGIC_LINK_BASE_URL'] ?? 'http://localhost:3001',
);

export const sharedAuditService = new AuditService(sharedDb);

export const sharedQueueService = new QueueService(sharedRedis);
