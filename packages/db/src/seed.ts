import { createDb } from './client.js';
import { users, workspaces, memberships, creditAccounts, brandKits, templates } from './schema.js';

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const db = createDb(url);
  const [user] = await db.insert(users).values({
    email: process.env.DEV_USER_EMAIL ?? 'dev@lantern.local',
    name: process.env.DEV_USER_NAME ?? 'Director',
  }).onConflictDoNothing().returning();
  const [ws] = await db.insert(workspaces).values({
    name: 'Lantern Studio', slug: 'lantern-studio', planId: 'pro',
  }).onConflictDoNothing().returning();
  if (user && ws) {
    await db.insert(memberships).values({ workspaceId: ws.id, userId: user.id, role: 'owner' }).onConflictDoNothing();
    await db.insert(creditAccounts).values({ workspaceId: ws.id, balance: 12000, monthlyGrant: 12000 }).onConflictDoNothing();
    await db.insert(brandKits).values({
      workspaceId: ws.id, name: 'Lantern default',
      palette: { background: ['#12100E', '#F4EFE6'], accent: ['#C9893A', '#C23A2B'] },
      typefaces: { display: 'Fraunces', body: 'ABC Favorit' },
    }).onConflictDoNothing();
  }
  await db.insert(templates).values({
    slug: 'social-explainer-30s', name: '30s social explainer', craft: 'explainer', aspectRatio: '9:16',
    slotSchema: { headline: 'string', voice: 'voice_id', cta: 'string' },
    timelineJson: { fps: 30, tracks: [] },
  }).onConflictDoNothing();
  console.log('seeded');
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
