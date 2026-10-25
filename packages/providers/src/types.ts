import type { CreditEstimate, GenerationTask, ProviderCapabilities, ProviderResult, TaskKind } from '@lantern/types';

export interface GenerationProvider {
  id: string;
  capabilities: ProviderCapabilities;
  available(): boolean;
  estimate(task: GenerationTask): CreditEstimate;
  run(task: GenerationTask): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  constructor(public code: string, message: string, public retryable = false) {
    super(message);
    this.name = 'ProviderError';
  }
}

export const ALL_KINDS: TaskKind[] = [
  'image.generate','image.edit','video.generate','video.edit','video.extend','video.lipsync',
  'avatar.speak','audio.tts','audio.dialogue','audio.music','audio.sfx','audio.clone','audio.design',
  'stock.search','caption.transcribe','caption.translate','enhance.bg_remove','enhance.upscale',
  'script.generate','storyboard.generate',
];
