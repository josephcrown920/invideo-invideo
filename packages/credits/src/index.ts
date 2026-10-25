import { eq, sql } from 'drizzle-orm';
import { creditAccounts, creditLedger, type Db } from '@lantern/db';

export class InsufficientCredits extends Error {
  constructor(public needed: number, public balance: number) {
    super('Need ' + needed + ' credits, have ' + balance);
    this.name = 'InsufficientCredits';
  }
}

export class CreditLedger {
  constructor(private db: Db) {}

  async balance(workspaceId: string) {
    const [row] = await this.db.select().from(creditAccounts).where(eq(creditAccounts.workspaceId, workspaceId));
    return row?.balance ?? 0;
  }

  async reserve(workspaceId: string, amount: number, reason: string, jobId?: string) {
    if (amount <= 0) return { id: 'noop', amount: 0 };
    const [account] = await this.db.select().from(creditAccounts).where(eq(creditAccounts.workspaceId, workspaceId));
    const bal = account?.balance ?? 0;
    if (bal < amount) throw new InsufficientCredits(amount, bal);
    const [row] = await this.db.insert(creditLedger).values({
      workspaceId, type: 'reserve', amount: -amount, jobId, reason,
    }).returning();
    await this.db.update(creditAccounts).set({
      balance: sql`${creditAccounts.balance} - ${amount}`, updatedAt: new Date(),
    }).where(eq(creditAccounts.workspaceId, workspaceId));
    return { id: row!.id, amount };
  }

  async capture(workspaceId: string, reservationId: string, actual: number, reason: string, jobId?: string) {
    await this.db.insert(creditLedger).values({
      workspaceId, type: 'capture', amount: 0, reservationId, jobId, reason: reason + ' actual=' + actual,
    });
  }

  async release(workspaceId: string, reservationId: string, amount: number, reason: string, jobId?: string) {
    if (amount <= 0) return;
    await this.db.insert(creditLedger).values({
      workspaceId, type: 'release', amount, reservationId, jobId, reason,
    });
    await this.db.update(creditAccounts).set({
      balance: sql`${creditAccounts.balance} + ${amount}`, updatedAt: new Date(),
    }).where(eq(creditAccounts.workspaceId, workspaceId));
  }

  async grant(workspaceId: string, amount: number, reason: string) {
    await this.db.insert(creditLedger).values({ workspaceId, type: 'grant', amount, reason });
    const [existing] = await this.db.select().from(creditAccounts).where(eq(creditAccounts.workspaceId, workspaceId));
    if (existing) {
      await this.db.update(creditAccounts).set({
        balance: sql`${creditAccounts.balance} + ${amount}`, updatedAt: new Date(),
      }).where(eq(creditAccounts.workspaceId, workspaceId));
    } else {
      await this.db.insert(creditAccounts).values({ workspaceId, balance: amount, monthlyGrant: amount });
    }
  }
}
