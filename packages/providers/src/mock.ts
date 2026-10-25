import type { GenerationTask, ProviderResult } from '@lantern/types';
import { ALL_KINDS, type GenerationProvider } from './types.js';

function stubText(task: GenerationTask): string {
  if (task.kind === 'script.generate') {
    return JSON.stringify({ title: 'Untitled', runtimeSec: 30, scenes: [
      { id: 's1', heading: 'HOOK', vo: 'Open on the problem in one line.', durationMs: 4000 },
      { id: 's2', heading: 'BODY', vo: 'Show the turn. One proof. No filler.', durationMs: 18000 },
      { id: 's3', heading: 'CTA', vo: 'Name the next step.', durationMs: 8000 },
    ]});
  }
  if (task.kind === 'storyboard.generate') {
    return JSON.stringify({ shots: [
      { id: '1', size: 'wide', camera: 'static', action: 'Establish.', durationMs: 3000 },
      { id: '2', size: 'medium', camera: 'handheld', action: 'Move in.', durationMs: 4000 },
      { id: '3', size: 'close', camera: 'locked', action: 'Land the line.', durationMs: 3000 },
    ]});
  }
  if (task.kind.startsWith('caption')) return JSON.stringify({ cues: [{ startMs: 0, endMs: 2000, text: task.prompt.slice(0, 80) }] });
  if (task.kind === 'stock.search') return JSON.stringify({ hits: [] });
  return task.prompt;
}

export const mockProvider: GenerationProvider = {
  id: 'mock',
  capabilities: {
    kinds: ALL_KINDS,
    aspects: ['16:9','9:16','1:1','4:5','4:3','21:9'],
    resolutions: ['480p','720p','1080p'],
    maxDurationMs: 30000,
    maxRefs: 8,
    nativeAudio: true,
    identityLocks: true,
  },
  available: () => true,
  estimate: () => ({ min: 0, max: 0, expected: 0 }),
  async run(task): Promise<ProviderResult> {
    const text = stubText(task);
    const isText = task.kind.startsWith('script') || task.kind.startsWith('storyboard') || task.kind.startsWith('caption') || task.kind === 'stock.search';
    return {
      mimeType: isText ? 'application/json' : task.kind.startsWith('audio') ? 'audio/wav' : task.kind.startsWith('image') ? 'image/png' : 'video/mp4',
      text: isText ? text : undefined,
      width: 1280,
      height: 720,
      durationMs: task.constraints.durationMs ?? 4000,
      provenance: {
        taskKind: task.kind, providerId: 'mock', modelId: 'mock-dev',
        prompt: task.prompt, negativePrompt: task.negativePrompt ?? null,
        seed: task.constraints.seed ?? null, refs: (task.refs ?? []).map((r) => r.url),
        rawRequest: task, rawResponse: { stub: true }, creditCost: 0,
      },
    };
  },
};
