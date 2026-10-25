import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb, real, uniqueIndex, index,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({ emailUq: uniqueIndex("users_email_uq").on(t.email) }));

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  planId: text("plan_id").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({ slugUq: uniqueIndex("workspaces_slug_uq").on(t.slug) }));

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("editor"),
  createdAt: ts("created_at"),
}, (t) => ({
  uq: uniqueIndex("memberships_ws_user_uq").on(t.workspaceId, t.userId),
  ws: index("memberships_ws_idx").on(t.workspaceId),
}));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  title: text("title").notNull(),
  craft: text("craft").notNull().default("other"),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  resolution: text("resolution").notNull().default("1080p"),
  targetDurationMs: integer("target_duration_ms"),
  brandKitId: uuid("brand_kit_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({ ws: index("projects_ws_idx").on(t.workspaceId) }));

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  title: text("title"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at"),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  kind: text("kind").notNull(),
  origin: text("origin").notNull(),
  storageKey: text("storage_key").notNull(),
  proxyKey: text("proxy_key"),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  checksum: text("checksum"),
  license: text("license").notNull().default("none"),
  licenseReceipt: jsonb("license_receipt").$type<Record<string, unknown>>(),
  provenanceId: uuid("provenance_id"),
  filename: text("filename"),
  createdAt: ts("created_at"),
}, (t) => ({
  ws: index("assets_ws_idx").on(t.workspaceId),
  project: index("assets_project_idx").on(t.projectId),
}));

export const provenances = pgTable("provenances", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  taskKind: text("task_kind").notNull(),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  prompt: text("prompt"),
  negativePrompt: text("negative_prompt"),
  seed: integer("seed"),
  refs: jsonb("refs").$type<string[]>().notNull().default([]),
  rawRequest: jsonb("raw_request"),
  rawResponse: jsonb("raw_response"),
  creditCost: integer("credit_cost").notNull().default(0),
  createdAt: ts("created_at"),
});

export const locks = pgTable("locks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  handle: text("handle").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("draft"),
  masterAssetId: uuid("master_asset_id"),
  descriptor: jsonb("descriptor").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({ uq: uniqueIndex("locks_ws_handle_uq").on(t.workspaceId, t.handle) }));

export const brandKits = pgTable("brand_kits", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  palette: jsonb("palette").$type<{ background: string[]; accent: string[] }>().notNull(),
  typefaces: jsonb("typefaces").$type<{ display: string; body: string }>().notNull(),
  logoLightAssetId: uuid("logo_light_asset_id"),
  logoDarkAssetId: uuid("logo_dark_asset_id"),
  voiceId: text("voice_id"),
  captionPreset: jsonb("caption_preset").$type<Record<string, unknown>>().notNull().default({}),
  introAssetId: uuid("intro_asset_id"),
  outroAssetId: uuid("outro_asset_id"),
  doNotUse: jsonb("do_not_use").$type<string[]>().notNull().default([]),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id"),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  craft: text("craft").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  slotSchema: jsonb("slot_schema").$type<Record<string, unknown>>().notNull(),
  timelineJson: jsonb("timeline_json").notNull(),
  createdAt: ts("created_at"),
}, (t) => ({ slugUq: uniqueIndex("templates_slug_uq").on(t.slug) }));

export const timelines = pgTable("timelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  title: text("title").notNull().default("Main"),
  fps: integer("fps").notNull().default(30),
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  sampleRate: integer("sample_rate").notNull().default(48000),
  headSnapshotId: uuid("head_snapshot_id"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const timelineSnapshots = pgTable("timeline_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  timelineId: uuid("timeline_id").notNull().references(() => timelines.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  version: integer("version").notNull(),
  document: jsonb("document").notNull(),
  createdBy: uuid("created_by"),
  createdAt: ts("created_at"),
}, (t) => ({ uq: uniqueIndex("snapshots_timeline_version_uq").on(t.timelineId, t.version) }));

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  kind: text("kind").notNull(),
  state: text("state").notNull().default("queued"),
  progress: real("progress").notNull().default(0),
  input: jsonb("input").notNull().default({}),
  output: jsonb("output"),
  error: jsonb("error").$type<{ code: string; message: string } | null>(),
  parentId: uuid("parent_id"),
  idempotencyKey: text("idempotency_key"),
  creditReservationId: uuid("credit_reservation_id"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({
  ws: index("jobs_ws_idx").on(t.workspaceId),
}));

export const creditAccounts = pgTable("credit_accounts", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id),
  balance: integer("balance").notNull().default(0),
  monthlyGrant: integer("monthly_grant").notNull().default(0),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: ts("updated_at"),
});

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  reservationId: uuid("reservation_id"),
  jobId: uuid("job_id"),
  reason: text("reason").notNull(),
  createdAt: ts("created_at"),
}, (t) => ({ ws: index("ledger_ws_idx").on(t.workspaceId) }));

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  hashedKey: text("hashed_key").notNull(),
  prefix: text("prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: ts("created_at"),
});

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  token: text("token").notNull(),
  permission: text("permission").notNull().default("comment"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: ts("created_at"),
}, (t) => ({ tokenUq: uniqueIndex("share_token_uq").on(t.token) }));

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  shareLinkId: uuid("share_link_id").references(() => shareLinks.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  authorId: uuid("author_id"),
  body: text("body").notNull(),
  timecodeMs: integer("timecode_ms"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: ts("created_at"),
});

export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  provider: text("provider").notNull(),
  accountLabel: text("account_label"),
  refreshTokenEnc: text("refresh_token_enc"),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  target: text("target"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at"),
}, (t) => ({ ws: index("audit_ws_idx").on(t.workspaceId) }));

export const providerConfigs = pgTable("provider_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id"),
  providerId: text("provider_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  pinPriority: integer("pin_priority").notNull().default(0),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
});
