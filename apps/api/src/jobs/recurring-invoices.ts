import { Queue, Worker } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function startRecurringInvoicesWorker(apiBaseUrl: string) {
  const queue = new Queue('recurring-invoices', { connection: { url: REDIS_URL } });

  // Schedule daily check
  queue.add('check-due', {}, {
    repeat: { pattern: '0 6 * * *' }, // 6 AM daily
    jobId: 'daily-recurring-check',
  }).catch(() => {}); // Ignore if Redis not available

  const worker = new Worker('recurring-invoices', async () => {
    try {
      await fetch(`${apiBaseUrl}/api/v1/recurring-invoices/run-due`, { method: 'POST' });
    } catch (err) {
      console.error('[recurring-invoices] Failed to run due invoices:', err);
    }
  }, { connection: { url: REDIS_URL } });

  worker.on('failed', (job, err) => console.error('[recurring-invoices] Job failed:', err));

  return { queue, worker };
}
