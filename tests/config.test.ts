import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadConfig,
  saveConfig,
  resolveProxy,
  configFilePath,
  setKey,
  unsetKey,
} from '../src/config.js';

let dir: string;
const origHome = process.env.HOME;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'streeteasy-cfg-'));
  process.env.HOME = dir;
  delete process.env.STREETEASY_PROXY_URL;
  delete process.env.STREETEASY_PROXY_ENABLED;
});

afterEach(() => {
  process.env.HOME = origHome;
  delete process.env.STREETEASY_PROXY_URL;
  delete process.env.STREETEASY_PROXY_ENABLED;
  rmSync(dir, { recursive: true, force: true });
});

describe('configFilePath', () => {
  it('returns ~/.config/streeteasy/config.json', () => {
    expect(configFilePath()).toBe(
      join(dir, '.config', 'streeteasy', 'config.json'),
    );
  });
});

describe('loadConfig', () => {
  it('returns defaults when file does not exist', () => {
    const cfg = loadConfig();
    expect(cfg.proxy.enabled).toBe(false);
    expect(cfg.proxy.url).toBeUndefined();
  });

  it('loads from disk when present', () => {
    const path = configFilePath();
    saveConfig({ proxy: { enabled: true, url: 'http://x:y@h:1' } });
    expect(existsSync(path)).toBe(true);
    const cfg = loadConfig();
    expect(cfg.proxy.url).toBe('http://x:y@h:1');
    expect(cfg.proxy.enabled).toBe(true);
  });
});

describe('setKey / unsetKey', () => {
  it('sets a dot-path value', () => {
    setKey('proxy.url', 'http://a:b@c:1');
    expect(loadConfig().proxy.url).toBe('http://a:b@c:1');
  });

  it('coerces "true" / "false" booleans', () => {
    setKey('proxy.enabled', 'true');
    expect(loadConfig().proxy.enabled).toBe(true);
    setKey('proxy.enabled', 'false');
    expect(loadConfig().proxy.enabled).toBe(false);
  });

  it('unsets a key', () => {
    setKey('proxy.url', 'http://x');
    unsetKey('proxy.url');
    expect(loadConfig().proxy.url).toBeUndefined();
  });

  it('rejects unknown top-level keys', () => {
    expect(() => setKey('whatever.foo', 'x')).toThrow(/unknown/i);
  });
});

describe('resolveProxy precedence (flag > env > file > default)', () => {
  it('flag --no-proxy wins over enabled config', () => {
    setKey('proxy.enabled', 'true');
    setKey('proxy.url', 'http://from:cfg@h:1');
    const r = resolveProxy({ noProxy: true });
    expect(r.enabled).toBe(false);
  });

  it('flag --proxy-url wins over env and config', () => {
    setKey('proxy.url', 'http://from:cfg@h:1');
    process.env.STREETEASY_PROXY_URL = 'http://from:env@h:1';
    const r = resolveProxy({ proxyUrl: 'http://from:flag@h:1' });
    expect(r.enabled).toBe(true);
    expect(r.url).toBe('http://from:flag@h:1');
  });

  it('env wins over config', () => {
    setKey('proxy.url', 'http://from:cfg@h:1');
    setKey('proxy.enabled', 'false');
    process.env.STREETEASY_PROXY_URL = 'http://from:env@h:1';
    process.env.STREETEASY_PROXY_ENABLED = 'true';
    const r = resolveProxy({});
    expect(r.url).toBe('http://from:env@h:1');
    expect(r.enabled).toBe(true);
  });

  it('falls back to defaults when nothing is set', () => {
    const r = resolveProxy({});
    expect(r.enabled).toBe(false);
    expect(r.url).toBeUndefined();
  });
});
