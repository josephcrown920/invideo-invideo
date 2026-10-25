import { serve } from '@hono/node-server';
import { loadConfig } from '@lantern/config';
import { createDb } from '@lantern/db';
import { createAuth } from '@lantern/auth';
import { CreditLedger } from '@lantern/credits';
import { createRouter } from '@lantern/providers';
import { createQueue } from '@lantern/queue';
import { createStore } from '@lantern/storage';
import { createLogger } from '@lantern/observability';
import { createApp } from './app.js';

const cfg = loadConfig();
const log = createLogger(cfg.LOG_LEVEL, { service: 'api' });
const db = createDb(cfg.DATABASE_URL);
const app = createApp({
  cfg,
  db,
  auth: createAuth(cfg, db),
  credits: new CreditLedger(db),
  router: createRouter(cfg),
  queue: createQueue(cfg.REDIS_URL, cfg.QUEUE_PREFIX),
  store: createStore(cfg),
  log,
});

serve({ fetch: app.fetch, port: cfg.API_PORT }, (info) => {
  log.info('api listening', { port: info.port });
});
