import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { assets } from '@lantern/db';
import { assetKey } from '@lantern/storage';
import type { Env } from '../app.js';

export const assetsRoute = new Hono<Env>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const session = c.get('session')!;
    const projectId = c.req.query('projectId');
    const rows = await db.select().from(assets).where(eq(assets.workspaceId, session.workspaceId));
    return c.json({ assets: projectId ? rows.filter((r) => r.projectId === projectId) : rows });
  })
  .post('/upload', async (c) => {
    const { db, store, queue } = c.get('deps');
    const session = c.get('session')!;
    const form = await c.req.formData();
    const file = form.get('file');
    const projectId = String(form.get('projectId') ?? '') || null;
    if (!(file instanceof File)) return c.json({ error: { code: 'bad_request', message: 'file required' } }, 400);
    const id = randomUUID();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : 'json';
    const key = assetKey(session.workspaceId, kind, id, ext);
    await store.put(key, new Uint8Array(await file.arrayBuffer()), file.type || 'application/octet-stream');
    const [row] = await db.insert(assets).values({
      id, workspaceId: session.workspaceId, projectId, kind, origin: 'upload', storageKey: key,
      mimeType: file.type || 'application/octet-stream', filename: file.name, license: 'user',
    }).returning();
    await queue.enqueue({ jobId: randomUUID(), workspaceId: session.workspaceId, projectId: projectId ?? undefined, kind: 'proxy', input: { assetId: row!.id } });
    return c.json({ asset: row }, 201);
  });
