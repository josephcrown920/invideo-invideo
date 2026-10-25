import { Hono } from 'hono';
import { templates } from '@lantern/db';
import type { Env } from '../app.js';

export const templatesRoute = new Hono<Env>().get('/', async (c) => {
  const { db } = c.get('deps');
  const rows = await db.select().from(templates);
  return c.json({ templates: rows });
});
