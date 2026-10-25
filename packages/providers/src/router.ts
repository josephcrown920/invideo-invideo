import type { CreditEstimate, GenerationTask, ProviderResult } from '@lantern/types';
import { ProviderError, type GenerationProvider } from './types.js';

export class ModelRouter {
  constructor(private providers: GenerationProvider[]) {}

  list() {
    return this.providers.map((p) => ({
      id: p.id,
      available: p.available(),
      kinds: p.capabilities.kinds,
      nativeAudio: p.capabilities.nativeAudio,
    }));
  }

  pick(task: GenerationTask): GenerationProvider {
    const candidates = this.providers.filter((p) => p.available() && p.capabilities.kinds.includes(task.kind));
    if (task.pinProviderId) {
      const pinned = candidates.find((p) => p.id === task.pinProviderId);
      if (pinned) return pinned;
    }
    const live = candidates.filter((p) => p.id !== 'mock');
    const pool = live.length ? live : candidates;
    if (!pool.length) throw new ProviderError('no_provider', 'No provider available for ' + task.kind, false);
    if (task.constraints.durationMs) {
      const fit = pool.find((p) => p.capabilities.maxDurationMs >= (task.constraints.durationMs ?? 0));
      if (fit) return fit;
    }
    return pool[0]!;
  }

  estimate(task: GenerationTask): CreditEstimate {
    return this.pick(task).estimate(task);
  }

  async run(task: GenerationTask): Promise<{ providerId: string; result: ProviderResult }> {
    const primary = this.pick(task);
    try {
      const result = await primary.run(task);
      return { providerId: primary.id, result };
    } catch (err) {
      const fallback = this.providers.find((p) => p.id !== primary.id && p.available() && p.capabilities.kinds.includes(task.kind));
      if (!fallback) throw err;
      const result = await fallback.run(task);
      return { providerId: fallback.id, result };
    }
  }
}
