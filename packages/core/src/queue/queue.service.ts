import { Queue, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import type { JobName, JobPayload } from './jobs.js';

export class QueueService {
  private queues = new Map<string, Queue>();

  constructor(private redis: IORedis) {}

  private getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.redis });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue<T extends JobName>(
    jobName: T,
    payload: JobPayload<T>,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
      jobId?: string;
    },
  ): Promise<string> {
    // Route jobs to queues by prefix (e.g. "process.*" → "process" queue)
    const queueName = jobName.split('.')[0] ?? 'default';
    const queue = this.getQueue(queueName);

    const job = await queue.add(jobName, payload, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts ?? 3,
      backoff: { type: 'exponential', delay: 2000 },
      jobId: options?.jobId,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    });

    return job.id ?? jobName;
  }

  registerWorker<T extends JobName>(
    queueName: string,
    handler: (job: Job<JobPayload<T>>) => Promise<void>,
    concurrency = 5,
  ): Worker {
    return new Worker(queueName, handler, {
      connection: this.redis,
      concurrency,
    });
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
