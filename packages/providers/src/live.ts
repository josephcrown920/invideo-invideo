import type { AppConfig } from '@lantern/config';
import { hasLiveKey } from '@lantern/config';
import type { GenerationTask, ProviderResult } from '@lantern/types';
import { ProviderError, type GenerationProvider } from './types.js';

function liveAdapter(id: string, kinds: GenerationProvider['capabilities']['kinds'], key: string | undefined, modelId: string): GenerationProvider {
  return {
    id,
    capabilities: {
      kinds,
      aspects: ['16:9','9:16','1:1','4:5'],
      resolutions: ['720p','1080p'],
      maxDurationMs: 15000,
      maxRefs: 9,
      nativeAudio: id.includes('seedance') || id.includes('kling'),
      identityLocks: true,
    },
    available: () => hasLiveKey(key),
    estimate: (task) => {
      const base = task.kind.startsWith('video') ? 40 : task.kind.startsWith('audio') ? 8 : 12;
      return { min: base, max: base * 2, expected: base };
    },
    async run(_task: GenerationTask): Promise<ProviderResult> {
      throw new ProviderError('not_wired', id + ' adapter is registered but the HTTP client is not wired. Add the vendor SDK in packages/providers/src/live.ts.', false);
    },
  };
}

export function liveProviders(cfg: AppConfig): GenerationProvider[] {
  return [
    liveAdapter('openai-gpt-image', ['image.generate','image.edit'], cfg.OPENAI_API_KEY, 'gpt_image_2'),
    liveAdapter('openai-script', ['script.generate','storyboard.generate'], cfg.OPENAI_API_KEY, 'gpt-4.1'),
    liveAdapter('seedance', ['video.generate','video.edit','video.extend'], cfg.SEEDANCE_API_KEY, 'seedance_2'),
    liveAdapter('kling', ['video.generate','video.lipsync'], cfg.KLING_API_KEY, 'kling_v3_video'),
    liveAdapter('google-image', ['image.generate'], cfg.GOOGLE_API_KEY, 'nanobanana_pro'),
    liveAdapter('elevenlabs', ['audio.tts','audio.dialogue','audio.music','audio.sfx','audio.clone','audio.design'], cfg.ELEVENLABS_API_KEY, 'eleven_v3'),
    liveAdapter('heygen', ['avatar.speak','video.lipsync'], cfg.HEYGEN_API_KEY, 'heygen_photo_avatar'),
    liveAdapter('shutterstock', ['stock.search'], cfg.STOCK_SHUTTERSTOCK_KEY, 'shutterstock'),
  ];
}
