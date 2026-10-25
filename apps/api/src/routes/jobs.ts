import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { jobs } from '@lantern/db';
import type { Env } from '../app.js';

const Enqueue = z.object({
  kind: z.enum(['generate','render','agent','caption','proxy']),
  projectId: z.string().uuid().optional(),
  input: z.unknown(),
  idempotencyKey: z.string().optional(),
});

export const jobsRoute = new Hono<Env>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const rows = await db.select().from(jobs).where(eq(jobs.workspaceId, session.workspaceId));
    return c.json({ jobs: rows });
  })
  .get('/:id', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, c.req.param('id')), eq(jobs.workspaceId, session.workspaceId)));
    if (!job) return c.json({ error: { code: 'not_found', message: 'Job missing' } }, 404);
    return c.json({ job });
  })
  .post('/', async (c) => {
    const { db, queue, router, credits } = c.get('deps');
    const session = c.get('session')!;
    const body = Enqueue.parse(await c.req.json());
    let reservationId: string | null = null;
    if (body.kind === 'generate') {
      const estimate = router.estimate(body.input as never);
      const res = await credits.reserve(session.workspaceId, estimate.expected, 'generate', undefined);
      reservationId = res.id;
    }
    const [job] = await db.insert(jobs).values({
      workspaceId: session.workspaceId, projectId: body.projectId, kind: body.kind,
      input: body.input as object, idempotencyKey: body.idempotencyKey, creditReservationId: reservationId,
    }).returning();
    await queue.enqueue({ jobId: job!.id, workspaceId: session.workspaceId, projectId: body.projectId, kind: body.kind, input: body.input, idempotencyKey: body.idempotencyKey });
    return c.json({ job, estimatedCredits: body.kind === 'generate' ? router.estimate(body.input as never) : { expected: 0 } }, 202);
  });
