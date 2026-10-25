import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users, workspaces, memberships } from '@lantern/db';
import type { Env } from '../app.js';

export const devRoute = new Hono<Env>().post('/token', async (c) => {
  const { db, auth, cfg } = c.get('deps');
  if (cfg.AUTH_DRIVER !== 'dev') return c.json({ error: { code: 'forbidden', message: 'Dev tokens disabled' } }, 403);
  const [user] = await db.select().from(users).where(eq(users.email, cfg.DEV_USER_EMAIL));
  const [ws] = await db.select().from(workspaces).limit(1);
  if (!user || !ws) return c.json({ error: { code: 'not_ready', message: 'Run pnpm db:seed' } }, 400);
  const [mem] = await db.select().from(memberships).where(eq(memberships.userId, user.id));
  const token = auth.issueDevToken({ id: user.id, email: user.email, name: user.name }, ws.id, mem?.role ?? 'owner');
  return c.json({ token, workspaceId: ws.id, user });
});
