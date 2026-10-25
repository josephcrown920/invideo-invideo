import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { creditAccounts, creditLedger } from '@lantern/db';
import type { Env } from '../app.js';

export const billingRoute = new Hono<Env>()
  .get('/credits', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const [account] = await db.select().from(creditAccounts).where(eq(creditAccounts.workspaceId, session.workspaceId));
    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.workspaceId, session.workspaceId));
    return c.json({ account: account ?? { balance: 0 }, ledger });
  });
