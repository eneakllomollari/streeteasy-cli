import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import type { ResolvedProxy } from './proxy.js';

const ConfigSchema = z.object({
  proxy: z
    .object({
      enabled: z.boolean().default(false),
      url: z.string().optional(),
    })
    .default({ enabled: false }),
});

export type Config = z.infer<typeof ConfigSchema>;

const DEFAULTS: Config = { proxy: { enabled: false, url: undefined } };

export function configFilePath(): string {
  return join(homedir(), '.config', 'streeteasy', 'config.json');
}

export function loadConfig(): Config {
  const path = configFilePath();
  if (!existsSync(path)) return structuredClone(DEFAULTS);
  const raw = readFileSync(path, 'utf-8');
  const parsed = ConfigSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid config at ${path}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}

export function saveConfig(cfg: Config): void {
  const path = configFilePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`);
}

const KNOWN_KEYS = new Set(['proxy.enabled', 'proxy.url']);

export function setKey(key: string, value: string): void {
  if (!KNOWN_KEYS.has(key)) {
    throw new Error(`unknown config key: ${key}`);
  }
  const cfg = loadConfig();
  if (key === 'proxy.enabled') {
    cfg.proxy.enabled = value === 'true';
  } else if (key === 'proxy.url') {
    cfg.proxy.url = value;
  }
  saveConfig(cfg);
}

export function unsetKey(key: string): void {
  if (!KNOWN_KEYS.has(key)) {
    throw new Error(`unknown config key: ${key}`);
  }
  const cfg = loadConfig();
  if (key === 'proxy.enabled') {
    cfg.proxy.enabled = false;
  } else if (key === 'proxy.url') {
    cfg.proxy.url = undefined;
  }
  saveConfig(cfg);
}

export function getKey(key: string): unknown {
  const cfg = loadConfig();
  if (key === '') return cfg;
  if (key === 'proxy') return cfg.proxy;
  if (key === 'proxy.enabled') return cfg.proxy.enabled;
  if (key === 'proxy.url') return cfg.proxy.url;
  throw new Error(`unknown config key: ${key}`);
}

export interface ProxyOverrides {
  proxyUrl?: string | undefined;
  noProxy?: boolean | undefined;
}

export function resolveProxy(overrides: ProxyOverrides): ResolvedProxy {
  if (overrides.noProxy) {
    return { enabled: false, url: undefined };
  }
  if (overrides.proxyUrl) {
    return { enabled: true, url: overrides.proxyUrl };
  }
  const envUrl = process.env.STREETEASY_PROXY_URL;
  const envEnabled = process.env.STREETEASY_PROXY_ENABLED;
  if (envUrl !== undefined || envEnabled !== undefined) {
    return {
      enabled:
        envEnabled === 'true' ||
        (envEnabled === undefined && envUrl !== undefined),
      url: envUrl,
    };
  }
  const cfg = loadConfig();
  return { enabled: cfg.proxy.enabled, url: cfg.proxy.url };
}

export function deleteConfigFile(): void {
  const path = configFilePath();
  if (existsSync(path)) unlinkSync(path);
}
