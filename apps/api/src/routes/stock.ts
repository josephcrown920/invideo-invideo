import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../app.js';

export const stockRoute = new Hono<Env>().post('/search', async (c) => {
  const { router } = c.get('deps');
  const body = z.object({ query: z.string().min(1), mediaType: z.enum(['image','video','audio']).default('video') }).parse(await c.req.json());
  const { result } = await router.run({ kind: 'stock.search', prompt: body.query + ' ' + body.mediaType, constraints: {} });
  return c.json({ results: result.text ? JSON.parse(result.text) : { hits: [] }, note: 'Licensed stock may only land on the timeline, never as a generation reference.' });
});
