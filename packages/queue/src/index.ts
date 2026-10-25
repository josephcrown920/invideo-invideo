import { Queue, Worker, type Job as BullJob, type Processor } from 'bullmq';
import IORedis from 'ioredis';

export type JobKind = 'generate' | 'proxy' | 'render' | 'agent' | 'caption' | 'stock-license';

export interface JobPayload {
  jobId: string;
  workspaceId: string;
  projectId?: string;
  kind: JobKind;
  input: unknown;
  idempotencyKey?: string;
}

export interface JobQueue {
  enqueue(payload: JobPayload): Promise<string>;
  process(kind: JobKind, handler: (payload: JobPayload) => Promise<unknown>): void;
  close(): Promise<void>;
}

export class BullmqQueue implements JobQueue {
  private connection: IORedis;
  private queues = new Map<JobKind, Queue>();
  private workers: Worker[] = [];
  constructor(private redisUrl: string, private prefix: string) {
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }
  private q(kind: JobKind) {
    let queue = this.queues.get(kind);
    if (!queue) {
      queue = new Queue(kind, { connection: this.connection, prefix: this.prefix });
      this.queues.set(kind, queue);
    }
    return queue;
  }
  async enqueue(payload: JobPayload) {
    const job = await this.q(payload.kind).add(payload.kind, payload, {
      jobId: payload.idempotencyKey ?? payload.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return String(job.id);
  }
  process(kind: JobKind, handler: (payload: JobPayload) => Promise<unknown>) {
    const processor: Processor<JobPayload> = async (job: BullJob<JobPayload>) => handler(job.data);
    const worker = new Worker(kind, processor, { connection: this.connection, prefix: this.prefix, concurrency: 4 });
    this.workers.push(worker);
  }
  async close() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.connection.disconnect();
  }
}

export class MemoryQueue implements JobQueue {
  private handlers = new Map<JobKind, (payload: JobPayload) => Promise<unknown>>();
  async enqueue(payload: JobPayload) {
    const handler = this.handlers.get(payload.kind);
    if (handler) queueMicrotask(() => { void handler(payload); });
    return payload.jobId;
  }
  process(kind: JobKind, handler: (payload: JobPayload) => Promise<unknown>) {
    this.handlers.set(kind, handler);
  }
  async close() {}
}

export function createQueue(redisUrl: string | undefined, prefix: string): JobQueue {
  if (!redisUrl || redisUrl === 'memory') return new MemoryQueue();
  return new BullmqQueue(redisUrl, prefix);
}
