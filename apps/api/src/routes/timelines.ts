import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { timelines, timelineSnapshots } from '@lantern/db';
import { relayout } from '@lantern/editor';
import type { Env } from '../app.js';
import { randomUUID } from 'node:crypto';

export const timelinesRoute = new Hono<Env>()
  .get('/:id', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const [tl] = await db.select().from(timelines).where(and(eq(timelines.id, c.req.param('id')), eq(timelines.workspaceId, session.workspaceId)));
    if (!tl) return c.json({ error: { code: 'not_found', message: 'Timeline missing' } }, 404);
    const [snap] = await db.select().from(timelineSnapshots).where(eq(timelineSnapshots.id, tl.headSnapshotId ?? '')).limit(1);
    return c.json({ timeline: tl, document: snap?.document ?? null, version: snap?.version ?? 0 });
  })
  .post('/:id/snapshots', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({ document: z.any() }).parse(await c.req.json());
    const [tl] = await db.select().from(timelines).where(and(eq(timelines.id, c.req.param('id')), eq(timelines.workspaceId, session.workspaceId)));
    if (!tl) return c.json({ error: { code: 'not_found', message: 'Timeline missing' } }, 404);
    const [latest] = await db.select().from(timelineSnapshots).where(eq(timelineSnapshots.timelineId, tl.id)).orderBy(desc(timelineSnapshots.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const [snap] = await db.insert(timelineSnapshots).values({
      timelineId: tl.id, workspaceId: session.workspaceId, version, document: body.document, createdBy: session.user.id,
    }).returning();
    await db.update(timelines).set({ headSnapshotId: snap!.id, updatedAt: new Date() }).where(eq(timelines.id, tl.id));
    return c.json({ snapshot: snap }, 201);
  })
  .post('/:id/resize', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({ aspectRatio: z.enum(['16:9','9:16','1:1','4:5','4:3','21:9']), resolution: z.enum(['480p','720p','1080p','2k','4k']).default('1080p') }).parse(await c.req.json());
    const [tl] = await db.select().from(timelines).where(and(eq(timelines.id, c.req.param('id')), eq(timelines.workspaceId, session.workspaceId)));
    if (!tl || !tl.headSnapshotId) return c.json({ error: { code: 'not_found', message: 'Timeline missing' } }, 404);
    const [snap] = await db.select().from(timelineSnapshots).where(eq(timelineSnapshots.id, tl.headSnapshotId));
    const next = relayout(snap!.document as never, body.aspectRatio, body.resolution);
    const [latest] = await db.select().from(timelineSnapshots).where(eq(timelineSnapshots.timelineId, tl.id)).orderBy(desc(timelineSnapshots.version)).limit(1);
    const [created] = await db.insert(timelineSnapshots).values({
      timelineId: tl.id, workspaceId: session.workspaceId, version: (latest?.version ?? 0) + 1, document: next, createdBy: session.user.id,
    }).returning();
    await db.update(timelines).set({ headSnapshotId: created!.id, width: next.width, height: next.height }).where(eq(timelines.id, tl.id));
    return c.json({ snapshot: created, document: next });
  })
  .post('/:id/render', async (c) => {
    const { db, queue } = c.get('deps');
    const session = c.get('session')!;
    const [tl] = await db.select().from(timelines).where(and(eq(timelines.id, c.req.param('id')), eq(timelines.workspaceId, session.workspaceId)));
    if (!tl) return c.json({ error: { code: 'not_found', message: 'Timeline missing' } }, 404);
    const jobId = randomUUID();
    await queue.enqueue({ jobId, workspaceId: session.workspaceId, projectId: tl.projectId, kind: 'render', input: { timelineId: tl.id, snapshotId: tl.headSnapshotId } });
    return c.json({ jobId }, 202);
  });
