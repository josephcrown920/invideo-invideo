import { createHmac } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { AppConfig } from '@lantern/config';
import { memberships, users, type Db } from '@lantern/db';

export interface AuthUser { id: string; email: string; name: string | null }
export interface Session { user: AuthUser; workspaceId: string; role: string }

export interface AuthProvider {
  issueDevToken(user: AuthUser, workspaceId: string, role: string): string;
  verify(token: string): Promise<Session | null>;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

export class DevJwtAuth implements AuthProvider {
  constructor(private secret: string, private db: Db, private cfg: AppConfig) {}

  issueDevToken(user: AuthUser, workspaceId: string, role: string) {
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({ sub: user.id, email: user.email, name: user.name, workspaceId, role, iat: Date.now() }));
    const sig = createHmac('sha256', this.secret).update(header + '.' + payload).digest('base64url');
    return header + '.' + payload + '.' + sig;
  }

  async verify(token: string): Promise<Session | null> {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expected = createHmac('sha256', this.secret).update(header + '.' + payload).digest('base64url');
    if (expected !== sig) return null;
    const data = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    if (this.cfg.AUTH_DRIVER === 'dev' && !data.sub) {
      return {
        user: { id: 'dev', email: this.cfg.DEV_USER_EMAIL, name: this.cfg.DEV_USER_NAME },
        workspaceId: data.workspaceId,
        role: data.role ?? 'owner',
      };
    }
    const [user] = await this.db.select().from(users).where(eq(users.id, data.sub));
    if (!user) return null;
    const [mem] = await this.db.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.workspaceId, data.workspaceId)));
    if (!mem) return null;
    return { user: { id: user.id, email: user.email, name: user.name }, workspaceId: mem.workspaceId, role: mem.role };
  }
}

export function createAuth(cfg: AppConfig, db: Db): AuthProvider {
  return new DevJwtAuth(cfg.AUTH_SECRET, db, cfg);
}

export function bearer(header: string | undefined) {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}
