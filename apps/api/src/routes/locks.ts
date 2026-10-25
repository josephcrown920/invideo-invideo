import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { locks } from '@lantern/db';
import type { Env } from '../app.js';

export const locksRoute = new Hono<Env>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const rows = await db.select().from(locks).where(eq(locks.workspaceId, session.workspaceId));
    return c.json({ locks: rows });
  })
  .post('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({
      handle: z.string().min(2),
      kind: z.enum(['character','location','product','prop','visual_style','voice','presenter']),
      projectId: z.string().uuid().optional(),
      descriptor: z.record(z.unknown()).default({}),
    }).parse(await c.req.json());
    const [row] = await db.insert(locks).values({ ...body, workspaceId: session.workspaceId, status: 'draft' }).returning();
    return c.json({ lock: row }, 201);
  })
  .post('/:id/ready', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({ masterAssetId: z.string().uuid() }).parse(await c.req.json());
    const [row] = await db.update(locks).set({ status: 'ready', masterAssetId: body.masterAssetId, updatedAt: new Date() })
      .where(and(eq(locks.id, c.req.param('id')), eq(locks.workspaceId, session.workspaceId))).returning();
    if (!row) return c.json({ error: { code: 'not_found', message: 'Lock missing' } }, 404);
    return c.json({ lock: row });
  });
