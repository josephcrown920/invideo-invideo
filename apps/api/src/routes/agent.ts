import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { conversations, messages, jobs } from '@lantern/db';
import { planGraph, classifyCraft } from '@lantern/agent';
import type { Env } from '../app.js';

export const agentRoute = new Hono<Env>()
  .post('/run', async (c) => {
    const { db, queue } = c.get('deps');
    const session = c.get('session')!;
    const body = z.object({
      projectId: z.string().uuid(),
      brief: z.string().min(1),
      hasFootage: z.boolean().optional(),
      hasTrack: z.boolean().optional(),
      hasScript: z.boolean().optional(),
    }).parse(await c.req.json());
    const craft = classifyCraft(body.brief);
    const graph = planGraph(body.projectId, body.brief, body);
    const [convo] = await db.insert(conversations).values({
      workspaceId: session.workspaceId, projectId: body.projectId, title: body.brief.slice(0, 80),
    }).returning();
    await db.insert(messages).values({ conversationId: convo!.id, role: 'user', content: body.brief });
    await db.insert(messages).values({
      conversationId: convo!.id, role: 'assistant',
      content: 'Planned a ' + craft + ' graph with ' + graph.nodes.length + ' nodes.',
      meta: { graph },
    });
    const [job] = await db.insert(jobs).values({
      workspaceId: session.workspaceId, projectId: body.projectId, kind: 'agent', input: { graph, conversationId: convo!.id },
    }).returning();
    await queue.enqueue({ jobId: job!.id, workspaceId: session.workspaceId, projectId: body.projectId, kind: 'agent', input: { graph } });
    return c.json({ conversationId: convo!.id, jobId: job!.id, craft, graph }, 202);
  });
