import { Hono } from 'hono';
import { z } from 'zod';
import { jobs } from '@lantern/db';
import type { Env } from '../app.js';

export const captionsRoute = new Hono<Env>().post('/', async (c) => {
  const { db, queue } = c.get('deps');
  const session = c.get('session')!;
  const body = z.object({ projectId: z.string().uuid(), assetId: z.string().uuid(), language: z.string().default('en'), translateTo: z.string().optional() }).parse(await c.req.json());
  const [job] = await db.insert(jobs).values({ workspaceId: session.workspaceId, projectId: body.projectId, kind: 'caption', input: body }).returning();
  await queue.enqueue({ jobId: job!.id, workspaceId: session.workspaceId, projectId: body.projectId, kind: 'caption', input: body });
  return c.json({ jobId: job!.id }, 202);
});
