import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import type { AppConfig } from '@lantern/config';
import type { Db } from '@lantern/db';
import type { AuthProvider } from '@lantern/auth';
import { bearer } from '@lantern/auth';
import type { CreditLedger } from '@lantern/credits';
import type { ModelRouter } from '@lantern/providers';
import type { JobQueue } from '@lantern/queue';
import type { ObjectStore } from '@lantern/storage';
import type { Logger } from '@lantern/observability';
import { projectsRoute } from './routes/projects.js';
import { assetsRoute } from './routes/assets.js';
import { jobsRoute } from './routes/jobs.js';
import { timelinesRoute } from './routes/timelines.js';
import { agentRoute } from './routes/agent.js';
import { billingRoute } from './routes/billing.js';
import { brandRoute } from './routes/brand.js';
import { healthRoute } from './routes/health.js';
import { devRoute } from './routes/dev.js';
import { locksRoute } from './routes/locks.js';
import { templatesRoute } from './routes/templates.js';
import { stockRoute } from './routes/stock.js';
import { captionsRoute } from './routes/captions.js';

export interface Deps {
  cfg: AppConfig;
  db: Db;
  auth: AuthProvider;
  credits: CreditLedger;
  router: ModelRouter;
  queue: JobQueue;
  store: ObjectStore;
  log: Logger;
}

export type Env = { Variables: { deps: Deps; session: Awaited<ReturnType<AuthProvider['verify']>> } };

export function createApp(deps: Deps) {
  const app = new Hono<Env>();
  app.use('*', cors({ origin: deps.cfg.WEB_URL, credentials: true }));
  app.use('*', honoLogger());
  app.use('*', async (c, next) => {
    c.set('deps', deps);
    await next();
  });
  app.route('/health', healthRoute);
  app.route('/v1/dev', devRoute);
  app.use('/v1/*', async (c, next) => {
    if (c.req.path === '/v1/dev/token') return next();
    const token = bearer(c.req.header('authorization'));
    const session = token ? await deps.auth.verify(token) : null;
    if (!session) return c.json({ error: { code: 'unauthorized', message: 'Sign in.' } }, 401);
    c.set('session', session);
    await next();
  });
  app.route('/v1/projects', projectsRoute);
  app.route('/v1/assets', assetsRoute);
  app.route('/v1/jobs', jobsRoute);
  app.route('/v1/timelines', timelinesRoute);
  app.route('/v1/agent', agentRoute);
  app.route('/v1/billing', billingRoute);
  app.route('/v1/brand-kits', brandRoute);
  app.route('/v1/locks', locksRoute);
  app.route('/v1/templates', templatesRoute);
  app.route('/v1/stock', stockRoute);
  app.route('/v1/captions', captionsRoute);
  app.onError((err, c) => {
    deps.log.error(err.message, { stack: (err as Error).stack });
    return c.json({ error: { code: 'internal', message: err.message } }, 500);
  });
  return app;
}
