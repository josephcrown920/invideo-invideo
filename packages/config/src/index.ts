import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  WEB_URL: z.string().url().default('http://localhost:3100'),
  API_URL: z.string().url().default('http://localhost:3101'),
  API_PORT: z.coerce.number().default(3101),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STORAGE_DRIVER: z.enum(['fs', 's3']).default('fs'),
  STORAGE_FS_ROOT: z.string().default('./data/storage'),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('lantern'),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  AUTH_DRIVER: z.enum(['dev', 'clerk']).default('dev'),
  AUTH_SECRET: z.string().min(16),
  DEV_USER_EMAIL: z.string().email().default('dev@lantern.local'),
  DEV_USER_NAME: z.string().default('Director'),
  BILLING_DRIVER: z.enum(['dev', 'stripe']).default('dev'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  CREDITS_STARTER_MONTHLY: z.coerce.number().default(2000),
  CREDITS_PRO_MONTHLY: z.coerce.number().default(12000),
  QUEUE_PREFIX: z.string().default('lantern'),
  OPENAI_API_KEY: z.string().optional().default(''),
  SEEDANCE_API_KEY: z.string().optional().default(''),
  GOOGLE_API_KEY: z.string().optional().default(''),
  ELEVENLABS_API_KEY: z.string().optional().default(''),
  KLING_API_KEY: z.string().optional().default(''),
  HEYGEN_API_KEY: z.string().optional().default(''),
  STOCK_SHUTTERSTOCK_KEY: z.string().optional().default(''),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
  SENTRY_DSN: z.string().optional().default(''),
});

export type AppConfig = z.infer<typeof Env>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ');
    throw new Error('Invalid environment: ' + issues);
  }
  return parsed.data;
}

export function hasLiveKey(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 8);
}
