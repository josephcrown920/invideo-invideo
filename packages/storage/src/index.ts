import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { AppConfig } from '@lantern/config';

export interface ObjectStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export class FsStore implements ObjectStore {
  constructor(private root: string, private publicBase: string) {}
  private path(key: string) { return join(this.root, key); }
  async put(key: string, body: Uint8Array, _contentType: string) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  async get(key: string) { return await readFile(this.path(key)); }
  async delete(key: string) { await unlink(this.path(key)).catch(() => undefined); }
  publicUrl(key: string) { return this.publicBase.replace(/\/$/, '') + '/' + key; }
}

export class S3Store implements ObjectStore {
  private client: S3Client;
  constructor(private cfg: AppConfig) {
    this.client = new S3Client({
      region: cfg.S3_REGION,
      endpoint: cfg.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(cfg.S3_ENDPOINT),
      credentials: cfg.S3_ACCESS_KEY ? { accessKeyId: cfg.S3_ACCESS_KEY, secretAccessKey: cfg.S3_SECRET_KEY } : undefined,
    });
  }
  async put(key: string, body: Uint8Array, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.cfg.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.cfg.S3_BUCKET, Key: key }));
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) throw new Error('empty object ' + key);
    return bytes;
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.S3_BUCKET, Key: key }));
  }
  publicUrl(key: string) {
    if (this.cfg.S3_PUBLIC_BASE_URL) return this.cfg.S3_PUBLIC_BASE_URL.replace(/\/$/, '') + '/' + key;
    return 's3://' + this.cfg.S3_BUCKET + '/' + key;
  }
}

export function createStore(cfg: AppConfig): ObjectStore {
  if (cfg.STORAGE_DRIVER === 's3') return new S3Store(cfg);
  return new FsStore(cfg.STORAGE_FS_ROOT, cfg.API_URL + '/v1/files');
}

export function assetKey(workspaceId: string, kind: string, id: string, ext: string) {
  return workspaceId + '/' + kind + '/' + id + '.' + ext;
}
