import { describe, it, expect } from 'vitest';
import {
  generateRandSession,
  substituteRand,
  buildAgent,
  type ResolvedProxy,
} from '../src/proxy.js';

describe('generateRandSession', () => {
  it('returns a 16-char alphanumeric string', () => {
    const s = generateRandSession();
    expect(s).toHaveLength(16);
    expect(s).toMatch(/^[A-Za-z0-9]{16}$/);
  });

  it('returns a different value on each call (overwhelmingly likely)', () => {
    const a = generateRandSession();
    const b = generateRandSession();
    expect(a).not.toBe(b);
  });
});

describe('substituteRand', () => {
  it('replaces {{rand}} with the given session', () => {
    const url = 'http://user-{{rand}}-suffix:pass@host:1234';
    expect(substituteRand(url, 'ABC123')).toBe(
      'http://user-ABC123-suffix:pass@host:1234',
    );
  });

  it('returns the URL unchanged if no {{rand}} placeholder', () => {
    const url = 'http://user:pass@host:1234';
    expect(substituteRand(url, 'ABC123')).toBe(url);
  });

  it('replaces multiple {{rand}} occurrences with the same session', () => {
    const url = 'http://{{rand}}:{{rand}}@host:1234';
    expect(substituteRand(url, 'X')).toBe('http://X:X@host:1234');
  });
});

describe('buildAgent', () => {
  it('returns undefined agent when proxy is disabled', () => {
    const cfg: ResolvedProxy = { enabled: false, url: undefined };
    const result = buildAgent(cfg);
    expect(result.agent).toBeUndefined();
  });

  it('returns an agent when proxy is enabled with a URL', () => {
    const cfg: ResolvedProxy = {
      enabled: true,
      url: 'http://user:pass@host:1234',
    };
    const result = buildAgent(cfg);
    expect(result.agent).toBeDefined();
  });

  it('rotate() produces a new agent, new dispatcher, and new substituted URL when {{rand}} is present', () => {
    const cfg: ResolvedProxy = {
      enabled: true,
      url: 'http://{{rand}}@host:1234',
    };
    const result = buildAgent(cfg);
    const firstAgent = result.agent;
    const firstDispatcher = result.dispatcher;
    expect(firstAgent).toBeDefined();
    expect(firstDispatcher).toBeDefined();
    result.rotate();
    expect(result.agent).toBeDefined();
    expect(result.agent).not.toBe(firstAgent);
    expect(result.dispatcher).toBeDefined();
    expect(result.dispatcher).not.toBe(firstDispatcher);
  });

  it('rotate() is a no-op when proxy is disabled', () => {
    const cfg: ResolvedProxy = { enabled: false, url: undefined };
    const result = buildAgent(cfg);
    result.rotate();
    expect(result.agent).toBeUndefined();
  });
});
