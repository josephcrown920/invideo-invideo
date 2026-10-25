import { Hono } from 'hono';
import type { Env } from '../app.js';

export const healthRoute = new Hono<Env>().get('/', (c) => {
  const { router } = c.get('deps');
  return c.json({ ok: true, service: 'lantern-api', providers: router.list() });
});
