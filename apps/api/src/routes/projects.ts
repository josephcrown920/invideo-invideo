import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { projects, timelines, timelineSnapshots } from '@lantern/db';
import { emptyTimeline } from '@lantern/editor';
import type { Env } from '../app.js';

const Create = z.object({
  title: z.string().min(1),
  craft: z.string().default('other'),
  aspectRatio: z.enum(['16:9','9:16','1:1','4:5','4:3','21:9']).default('16:9'),
  resolution: z.enum(['480p','720p','1080p','2k','4k']).default('1080p'),
  targetDurationMs: z.number().int().positive().optional(),
});

export const projectsRoute = new Hono<Env>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const rows = await db.select().from(projects).where(and(eq(projects.workspaceId, session.workspaceId), isNull(projects.archivedAt)));
    return c.json({ projects: rows });
  })
  .post('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = Create.parse(await c.req.json());
    const [project] = await db.insert(projects).values({ ...body, workspaceId: session.workspaceId }).returning();
    const doc = emptyTimeline(project!.id, body.aspectRatio, body.resolution);
    const [timeline] = await db.insert(timelines).values({
      workspaceId: session.workspaceId, projectId: project!.id, width: doc.width, height: doc.height,
    }).returning();
    const [snap] = await db.insert(timelineSnapshots).values({
      timelineId: timeline!.id, workspaceId: session.workspaceId, version: 1, document: doc, createdBy: session.user.id,
    }).returning();
    await db.update(timelines).set({ headSnapshotId: snap!.id }).where(eq(timelines.id, timeline!.id));
    return c.json({ project, timelineId: timeline!.id }, 201);
  })
  .get('/:id', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const [project] = await db.select().from(projects).where(and(eq(projects.id, c.req.param('id')), eq(projects.workspaceId, session.workspaceId)));
    if (!project) return c.json({ error: { code: 'not_found', message: 'Project missing' } }, 404);
    return c.json({ project });
  });
