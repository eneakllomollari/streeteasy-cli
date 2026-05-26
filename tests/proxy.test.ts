import { describe, it, expect } from 'vitest';
import {
  generateRandSession,
  substituteRand,
  buildDisabledHandle,
  buildSingleProxyHandle,
  buildListProxyHandle,
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

describe('buildDisabledHandle', () => {
  it('returns undefined dispatcher and rotate returns false', () => {
    const handle = buildDisabledHandle();
    expect(handle.dispatcher).toBeUndefined();
    expect(handle.rotate()).toBe(false);
  });
});

describe('buildSingleProxyHandle', () => {
  it('returns a handle with a dispatcher', () => {
    const handle = buildSingleProxyHandle('http://user:pass@host:1234');
    expect(handle.dispatcher).toBeDefined();
  });

  it('rotate() returns true on first call and false on second', () => {
    const handle = buildSingleProxyHandle('http://user:pass@host:1234');
    const firstDispatcher = handle.dispatcher;
    expect(handle.rotate()).toBe(true);
    expect(handle.dispatcher).not.toBe(firstDispatcher);
    expect(handle.rotate()).toBe(false);
  });

  it('substitutes {{rand}} into the URL', () => {
    const handle = buildSingleProxyHandle('http://{{rand}}@host:1234');
    expect(handle.dispatcher).toBeDefined();
    const firstDispatcher = handle.dispatcher;
    handle.rotate();
    expect(handle.dispatcher).not.toBe(firstDispatcher);
  });
});

describe('buildListProxyHandle', () => {
  it('sets initial dispatcher from first URL', () => {
    const handle = buildListProxyHandle(
      ['http://a:1', 'http://b:2', 'http://c:3'],
    );
    expect(handle.dispatcher).toBeDefined();
  });

  it('rotates through all proxies in the list', () => {
    const handle = buildListProxyHandle(
      ['http://a:1', 'http://b:2', 'http://c:3', 'http://d:4'],
    );
    const first = handle.dispatcher;
    expect(handle.rotate()).toBe(true);
    expect(handle.dispatcher).not.toBe(first);
    expect(handle.rotate()).toBe(true);
    expect(handle.rotate()).toBe(true);
    expect(handle.rotate()).toBe(false);
  });

  it('returns disabled handle for empty list', () => {
    const handle = buildListProxyHandle([]);
    expect(handle.dispatcher).toBeUndefined();
    expect(handle.rotate()).toBe(false);
  });
});
