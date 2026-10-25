import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { brandKits } from '@lantern/db';
import type { Env } from '../app.js';

export const brandRoute = new Hono<Env>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const rows = await db.select().from(brandKits).where(eq(brandKits.workspaceId, session.workspaceId));
    return c.json({ brandKits: rows });
  })
  .post('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({
      name: z.string().min(1),
      palette: z.object({ background: z.array(z.string()), accent: z.array(z.string()) }),
      typefaces: z.object({ display: z.string(), body: z.string() }),
    }).parse(await c.req.json());
    const [row] = await db.insert(brandKits).values({ ...body, workspaceId: session.workspaceId }).returning();
    return c.json({ brandKit: row }, 201);
  });
