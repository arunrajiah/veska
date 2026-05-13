/**
 * BullMQ-based async notification queue.
 * Uses REDIS_URL env var (falls back to localhost:6379).
 *
 * Usage:
 *   import { enqueueNotification } from '@veska-cloud/notifications';
 *   await enqueueNotification(payload, channels);
 */
import type { NotificationPayload, ChannelConfig } from './types';

let Queue: typeof import('bullmq').Queue | null = null;

async function getQueue() {
  if (!Queue) {
    const bullmq = await import('bullmq');
    Queue = bullmq.Queue;
  }
  return new Queue('notifications', {
    connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  });
}

export async function enqueueNotification(
  payload: NotificationPayload,
  channels: ChannelConfig[]
): Promise<void> {
  try {
    const q = await getQueue();
    await q.add('send', { payload, channels }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  } catch {
    // Redis not available — fire synchronously as fallback
    const { dispatch } = await import('./dispatcher');
    await dispatch(payload, channels);
  }
}
