export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

const rank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level: LogLevel = 'info', base: Record<string, unknown> = {}): Logger {
  const write = (lvl: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (rank[lvl] < rank[level]) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level: lvl, msg, ...base, ...fields });
    if (lvl === 'error') console.error(line); else console.log(line);
  };
  return {
    debug: (m, f) => write('debug', m, f),
    info: (m, f) => write('info', m, f),
    warn: (m, f) => write('warn', m, f),
    error: (m, f) => write('error', m, f),
    child: (fields) => createLogger(level, { ...base, ...fields }),
  };
}

export function reportError(err: unknown, logger: Logger, fields?: Record<string, unknown>) {
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error(e.message, { ...fields, name: e.name, stack: e.stack });
}

export interface Metrics {
  incr(name: string, tags?: Record<string, string>): void;
  timing(name: string, ms: number, tags?: Record<string, string>): void;
}

export const noopMetrics: Metrics = { incr() {}, timing() {} };
