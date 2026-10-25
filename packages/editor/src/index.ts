import { randomUUID } from 'node:crypto';
import type { AspectRatio, ResolutionName, TimelineClip, TimelineDocument, TimelineTrack } from '@lantern/types';
import { ASPECT_PIXELS } from '@lantern/types';

export function emptyTimeline(projectId: string, aspect: AspectRatio, resolution: ResolutionName, fps = 30): TimelineDocument {
  const px = ASPECT_PIXELS[aspect][resolution];
  return {
    id: randomUUID(),
    projectId,
    fps,
    width: px.w,
    height: px.h,
    sampleRate: 48000,
    tracks: [
      emptyTrack('video', 'V1'),
      emptyTrack('audio', 'A1'),
      emptyTrack('caption', 'Captions'),
      emptyTrack('title', 'Titles'),
    ],
    transitions: [],
  };
}

export function emptyTrack(kind: TimelineTrack['kind'], name: string): TimelineTrack {
  return { id: randomUUID(), kind, name, muted: false, locked: false, clips: [] };
}

export function clipFromAsset(assetId: string, startMs: number, durationMs: number): TimelineClip {
  return {
    id: randomUUID(),
    assetId,
    startMs,
    endMs: startMs + durationMs,
    inMs: 0,
    outMs: durationMs,
    transform: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
    volume: 1,
    speed: 1,
    effects: [],
  };
}

export function appendClip(doc: TimelineDocument, trackKind: TimelineTrack['kind'], clip: TimelineClip): TimelineDocument {
  const tracks = doc.tracks.map((t) => {
    if (t.kind !== trackKind) return t;
    const last = t.clips[t.clips.length - 1];
    const start = last ? last.endMs : 0;
    const duration = clip.endMs - clip.startMs;
    return { ...t, clips: [...t.clips, { ...clip, startMs: start, endMs: start + duration }] };
  });
  return { ...doc, tracks };
}

export function durationMs(doc: TimelineDocument) {
  return doc.tracks.reduce((max, t) => Math.max(max, t.clips.reduce((m, c) => Math.max(m, c.endMs), 0)), 0);
}

export function relayout(doc: TimelineDocument, aspect: AspectRatio, resolution: ResolutionName): TimelineDocument {
  const px = ASPECT_PIXELS[aspect][resolution];
  return { ...doc, width: px.w, height: px.h };
}

export function ffmpegArgs(doc: TimelineDocument, assetPaths: Record<string, string>, outFile: string): string[] {
  const video = doc.tracks.find((t) => t.kind === 'video');
  const clips = video?.clips.filter((c) => c.assetId && assetPaths[c.assetId]) ?? [];
  if (!clips.length) return ['-f', 'lavfi', '-i', `color=c=black:s=${doc.width}x${doc.height}:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', outFile];
  const args: string[] = [];
  for (const c of clips) args.push('-i', assetPaths[c.assetId!]);
  const n = clips.length;
  const concat = clips.map((_, i) => `[${i}:v]scale=${doc.width}:${doc.height}:force_original_aspect_ratio=decrease,pad=${doc.width}:${doc.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`).join(';');
  const chain = clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[vout]`;
  args.push('-filter_complex', concat + ';' + chain, '-map', '[vout]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(doc.fps), outFile);
  return args;
}
