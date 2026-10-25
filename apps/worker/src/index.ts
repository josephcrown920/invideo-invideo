import { eq } from 'drizzle-orm';
import { loadConfig } from '@lantern/config';
import { createDb, jobs, assets, provenances, timelineSnapshots, timelines } from '@lantern/db';
import { CreditLedger } from '@lantern/credits';
import { createRouter } from '@lantern/providers';
import { createQueue, type JobPayload } from '@lantern/queue';
import { createStore, assetKey } from '@lantern/storage';
import { createLogger, reportError } from '@lantern/observability';
import { ffmpegArgs, durationMs } from '@lantern/editor';
import { readyNodes } from '@lantern/agent';
import type { AgentGraph } from '@lantern/types';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cfg = loadConfig();
const log = createLogger(cfg.LOG_LEVEL, { service: 'worker' });
const db = createDb(cfg.DATABASE_URL);
const credits = new CreditLedger(db);
const router = createRouter(cfg);
const store = createStore(cfg);
const queue = createQueue(cfg.REDIS_URL, cfg.QUEUE_PREFIX);

async function setJob(id: string, patch: Record<string, unknown>) {
  await db.update(jobs).set({ ...patch, updatedAt: new Date() }).where(eq(jobs.id, id));
}

async function handleGenerate(p: JobPayload) {
  await setJob(p.jobId, { state: 'running', progress: 0.1 });
  const task = p.input as Parameters<typeof router.run>[0];
  try {
    const { providerId, result } = await router.run(task);
    const [prov] = await db.insert(provenances).values({ workspaceId: p.workspaceId, ...result.provenance, providerId }).returning();
    let storageKey: string | null = null;
    if (result.bytes) {
      const ext = result.mimeType.includes('png') ? 'png' : result.mimeType.includes('wav') ? 'wav' : result.mimeType.includes('mp4') ? 'mp4' : 'bin';
      storageKey = assetKey(p.workspaceId, task.kind.split('.')[0] ?? 'gen', randomUUID(), ext);
      await store.put(storageKey, result.bytes, result.mimeType);
    }
    const kind = task.kind.startsWith('audio') ? 'audio' : task.kind.startsWith('image') ? 'image' : task.kind.startsWith('video') ? 'video' : 'text';
    const [asset] = await db.insert(assets).values({
      workspaceId: p.workspaceId, projectId: p.projectId, kind, origin: 'generated',
      storageKey: storageKey ?? assetKey(p.workspaceId, 'text', randomUUID(), 'json'),
      mimeType: result.mimeType, width: result.width ?? null, height: result.height ?? null,
      durationMs: result.durationMs ?? null, provenanceId: prov!.id, license: 'none',
    }).returning();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, p.jobId));
    if (job?.creditReservationId) await credits.capture(p.workspaceId, job.creditReservationId, result.provenance.creditCost, 'generate', p.jobId);
    await setJob(p.jobId, { state: 'succeeded', progress: 1, output: { assetId: asset!.id, text: result.text ?? null, providerId } });
  } catch (err) {
    reportError(err, log, { jobId: p.jobId });
    await setJob(p.jobId, { state: 'failed', error: { code: 'generate_failed', message: (err as Error).message } });
    throw err;
  }
}

async function handleProxy(p: JobPayload) {
  await setJob(p.jobId, { state: 'succeeded', progress: 1, output: { note: 'proxy stub' } });
}

async function handleCaption(p: JobPayload) {
  const { result } = await router.run({ kind: 'caption.transcribe', prompt: JSON.stringify(p.input), constraints: {} });
  await setJob(p.jobId, { state: 'succeeded', progress: 1, output: { cues: result.text } });
}

async function handleRender(p: JobPayload) {
  await setJob(p.jobId, { state: 'running', progress: 0.2 });
  const input = p.input as { timelineId: string; snapshotId?: string };
  const [tl] = await db.select().from(timelines).where(eq(timelines.id, input.timelineId));
  if (!tl) throw new Error('timeline missing');
  const [snap] = await db.select().from(timelineSnapshots).where(eq(timelineSnapshots.id, input.snapshotId ?? tl.headSnapshotId ?? ''));
  const doc = snap?.document as Parameters<typeof ffmpegArgs>[0];
  const outKey = assetKey(p.workspaceId, 'render', randomUUID(), 'mp4');
  const dir = join(tmpdir(), 'lantern-render-' + p.jobId);
  await mkdir(dir, { recursive: true });
  const outFile = join(dir, 'out.mp4');
  const args = ffmpegArgs(doc, {}, outFile);
  await new Promise<void>((resolve) => {
    const ff = spawn('ffmpeg', ['-y', ...args], { stdio: 'ignore' });
    ff.on('error', () => resolve());
    ff.on('close', () => resolve());
  });
  const bytes = await readFile(outFile).catch(() => new Uint8Array());
  if (bytes.length) await store.put(outKey, bytes, 'video/mp4');
  const [asset] = await db.insert(assets).values({
    workspaceId: p.workspaceId, projectId: p.projectId, kind: 'video', origin: 'render',
    storageKey: outKey, mimeType: 'video/mp4', durationMs: durationMs(doc), license: 'none',
  }).returning();
  await setJob(p.jobId, { state: 'succeeded', progress: 1, output: { assetId: asset!.id } });
}

async function handleAgent(p: JobPayload) {
  await setJob(p.jobId, { state: 'running', progress: 0.05 });
  const graph = (p.input as { graph: AgentGraph }).graph;
  const done = new Set<string>();
  const failed = new Set<string>();
  const outputs: Record<string, unknown> = {};
  let guard = 0;
  while (guard++ < 50) {
    const ready = readyNodes(graph, done, failed);
    if (!ready.length) break;
    for (const node of ready) {
      if (node.type === 'ask_user') {
        await setJob(p.jobId, { state: 'awaiting_user', output: { node, outputs } });
        return;
      }
      const kindMap: Record<string, Parameters<typeof router.run>[0]['kind']> = {
        voice: 'audio.tts', music: 'audio.music', script: 'script.generate', storyboard: 'storyboard.generate',
        captions: 'caption.transcribe', stock: 'stock.search', generate: 'video.generate',
      };
      const kind = kindMap[node.type];
      if (kind) {
        const { result } = await router.run({ kind, prompt: JSON.stringify(node.input), constraints: {} });
        outputs[node.id] = { text: result.text, provider: result.provenance.providerId };
      }
      done.add(node.id);
    }
    await setJob(p.jobId, { progress: done.size / graph.nodes.length, output: { done: [...done], outputs } });
  }
  await setJob(p.jobId, { state: 'succeeded', progress: 1, output: { done: [...done], outputs } });
}

queue.process('generate', handleGenerate);
queue.process('proxy', handleProxy);
queue.process('caption', handleCaption);
queue.process('render', handleRender);
queue.process('agent', handleAgent);
queue.process('stock-license', async (p) => { log.info('stock license stub', { jobId: p.jobId }); });
log.info('worker listening');
