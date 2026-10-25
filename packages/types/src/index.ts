/** Shared contracts. Apps depend on this, never the reverse. */

export type Uuid = string;
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer';
export type PlanId = 'free' | 'starter' | 'pro' | 'ultra';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';
export type ResolutionName = '480p' | '720p' | '1080p' | '2k' | '4k';
export type AssetKind = 'image' | 'video' | 'audio' | 'text' | 'json';
export type AssetOrigin = 'upload' | 'generated' | 'stock' | 'render' | 'proxy';
export type JobState = 'queued' | 'running' | 'awaiting_user' | 'succeeded' | 'failed' | 'cancelled';
export type LockKind = 'character' | 'location' | 'product' | 'prop' | 'visual_style' | 'voice' | 'presenter';
export type LockStatus = 'draft' | 'ready';
export type Craft =
  | 'ad' | 'social' | 'explainer' | 'documentary' | 'short_film' | 'music_video'
  | 'product' | 'tutorial' | 'avatar' | 'slideshow' | 'event_edit' | 'other';

export type TaskKind =
  | 'image.generate' | 'image.edit'
  | 'video.generate' | 'video.edit' | 'video.extend' | 'video.lipsync'
  | 'avatar.speak'
  | 'audio.tts' | 'audio.dialogue' | 'audio.music' | 'audio.sfx' | 'audio.clone' | 'audio.design'
  | 'stock.search'
  | 'caption.transcribe' | 'caption.translate'
  | 'enhance.bg_remove' | 'enhance.upscale'
  | 'script.generate' | 'storyboard.generate';

export interface User { id: Uuid; email: string; name: string | null; imageUrl: string | null }
export interface Workspace { id: Uuid; name: string; slug: string; planId: PlanId }
export interface Project {
  id: Uuid; workspaceId: Uuid; title: string; craft: Craft;
  aspectRatio: AspectRatio; resolution: ResolutionName;
  targetDurationMs: number | null; brandKitId: Uuid | null;
}

export interface Asset {
  id: Uuid; workspaceId: Uuid; projectId: Uuid | null;
  kind: AssetKind; origin: AssetOrigin; storageKey: string; proxyKey: string | null;
  mimeType: string; width: number | null; height: number | null; durationMs: number | null;
  checksum: string | null; license: 'none' | 'stock' | 'user'; provenanceId: Uuid | null;
}

export interface Provenance {
  id: Uuid; taskKind: TaskKind; providerId: string; modelId: string;
  prompt: string | null; negativePrompt: string | null; seed: number | null;
  refs: string[]; rawRequest: unknown; rawResponse: unknown; creditCost: number;
}

export interface ContinuityLock {
  id: Uuid; workspaceId: Uuid; projectId: Uuid | null; handle: string;
  kind: LockKind; status: LockStatus; masterAssetId: Uuid | null; descriptor: Record<string, unknown>;
}

export interface BrandKit {
  id: Uuid; workspaceId: Uuid; name: string;
  palette: { background: string[]; accent: string[] };
  typefaces: { display: string; body: string };
  logoLightAssetId: Uuid | null; logoDarkAssetId: Uuid | null;
  voiceId: string | null; captionPreset: Record<string, unknown>;
  introAssetId: Uuid | null; outroAssetId: Uuid | null; doNotUse: string[];
}

export type TrackKind = 'video' | 'audio' | 'caption' | 'title';
export interface TimelineClip {
  id: Uuid; assetId: Uuid | null; startMs: number; endMs: number; inMs: number; outMs: number;
  transform: { x: number; y: number; scale: number; rotate: number; opacity: number };
  volume: number; speed: number; text?: string; style?: Record<string, unknown>;
  effects: Array<{ id: string; params: Record<string, unknown> }>;
}
export interface TimelineTrack {
  id: Uuid; kind: TrackKind; name: string; muted: boolean; locked: boolean; clips: TimelineClip[];
}
export interface TimelineTransition {
  id: Uuid; fromClipId: Uuid; toClipId: Uuid; type: string; durationMs: number;
}
export interface TimelineDocument {
  id: Uuid; projectId: Uuid; fps: number; width: number; height: number; sampleRate: number;
  tracks: TimelineTrack[]; transitions: TimelineTransition[];
}

export interface Job {
  id: Uuid; workspaceId: Uuid; projectId: Uuid | null; kind: string; state: JobState;
  progress: number; input: unknown; output: unknown;
  error: { code: string; message: string } | null; parentId: Uuid | null;
  idempotencyKey: string | null; creditReservationId: Uuid | null; attempts: number;
}

export interface GenerationTask {
  kind: TaskKind; prompt: string; negativePrompt?: string;
  refs?: Array<{ url: string; role: string }>;
  constraints: { aspectRatio?: AspectRatio; resolution?: ResolutionName; durationMs?: number; language?: string; seed?: number };
  lockHandles?: string[]; pinProviderId?: string; budgetCredits?: number;
}

export interface ProviderCapabilities {
  kinds: TaskKind[]; aspects: AspectRatio[]; resolutions: ResolutionName[];
  maxDurationMs: number; maxRefs: number; nativeAudio: boolean; identityLocks: boolean;
}
export interface CreditEstimate { min: number; max: number; expected: number }
export interface ProviderResult {
  bytes?: Uint8Array; storageKey?: string; mimeType: string;
  width?: number; height?: number; durationMs?: number; text?: string;
  provenance: Omit<Provenance, 'id'>;
}

export type AgentNodeType =
  | 'classify' | 'script' | 'storyboard' | 'lock' | 'generate' | 'stock'
  | 'voice' | 'music' | 'assemble' | 'captions' | 'qa' | 'revise' | 'render' | 'ask_user';
export interface AgentNode { id: string; type: AgentNodeType; dependsOn: string[]; input: unknown; fallback?: { providerId?: string; rewrite?: boolean } }
export interface AgentGraph { id: Uuid; projectId: Uuid; craft: Craft; nodes: AgentNode[] }

export const ASPECT_PIXELS: Record<AspectRatio, Record<ResolutionName, { w: number; h: number }>> = {
  '16:9': { '480p': { w: 854, h: 480 }, '720p': { w: 1280, h: 720 }, '1080p': { w: 1920, h: 1080 }, '2k': { w: 2560, h: 1440 }, '4k': { w: 3840, h: 2160 } },
  '9:16': { '480p': { w: 480, h: 854 }, '720p': { w: 720, h: 1280 }, '1080p': { w: 1080, h: 1920 }, '2k': { w: 1440, h: 2560 }, '4k': { w: 2160, h: 3840 } },
  '1:1': { '480p': { w: 480, h: 480 }, '720p': { w: 720, h: 720 }, '1080p': { w: 1080, h: 1080 }, '2k': { w: 1440, h: 1440 }, '4k': { w: 2160, h: 2160 } },
  '4:5': { '480p': { w: 384, h: 480 }, '720p': { w: 576, h: 720 }, '1080p': { w: 864, h: 1080 }, '2k': { w: 1152, h: 1440 }, '4k': { w: 1728, h: 2160 } },
  '4:3': { '480p': { w: 640, h: 480 }, '720p': { w: 960, h: 720 }, '1080p': { w: 1440, h: 1080 }, '2k': { w: 1920, h: 1440 }, '4k': { w: 2880, h: 2160 } },
  '21:9': { '480p': { w: 1120, h: 480 }, '720p': { w: 1680, h: 720 }, '1080p': { w: 2560, h: 1080 }, '2k': { w: 3440, h: 1440 }, '4k': { w: 5120, h: 2160 } },
};
