import type { AppConfig } from '@lantern/config';
import { mockProvider } from './mock.js';
import { liveProviders } from './live.js';
import { ModelRouter } from './router.js';

export * from './types.js';
export * from './mock.js';
export * from './live.js';
export * from './router.js';

export function createRouter(cfg: AppConfig): ModelRouter {
  return new ModelRouter([mockProvider, ...liveProviders(cfg)]);
}
