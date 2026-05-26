import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { shuffleArray, getProxyList, proxyListCachePath, CACHE_TTL_MS } from '../src/proxy-list.js';

const origHome = process.env.HOME;
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'streeteasy-proxy-'));
  process.env.HOME = dir;
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env.HOME = origHome;
  rmSync(dir, { recursive: true, force: true });
});

describe('shuffleArray', () => {
  it('preserves length and elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(5);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    shuffleArray(arr);
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe('getProxyList', () => {
  function writeCacheFile(proxies: string[], fetchedAt?: number): void {
    const path = proxyListCachePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({ fetchedAt: fetchedAt ?? Date.now(), proxies }),
    );
  }

  it('uses valid cache without fetching', async () => {
    writeCacheFile(['http://1.1.1.1:80', 'http://2.2.2.2:8080']);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const urls = await getProxyList();
    expect(urls.length).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('aggregates from multiple sources and deduplicates', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('proxyscrape')) {
        return new Response('1.1.1.1:80\n2.2.2.2:8080\n', { status: 200 });
      }
      if (url.includes('TheSpeedX')) {
        return new Response('2.2.2.2:8080\n3.3.3.3:3128\n', { status: 200 });
      }
      return new Response('', { status: 500 });
    });

    const urls = await getProxyList();
    expect(urls).toHaveLength(3);
    expect(urls.every((u) => u.startsWith('http://'))).toBe(true);
  });

  it('succeeds when only one source responds', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      callCount++;
      const url = String(input);
      if (url.includes('proxyscrape')) {
        return new Response('1.1.1.1:80\n2.2.2.2:8080\n', { status: 200 });
      }
      throw new Error('network down');
    });

    const urls = await getProxyList();
    expect(urls).toHaveLength(2);
    expect(callCount).toBeGreaterThan(1);
  });

  it('falls back to stale cache when all sources fail', async () => {
    writeCacheFile(
      ['http://1.1.1.1:80', 'http://2.2.2.2:8080'],
      Date.now() - CACHE_TTL_MS - 1000,
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const urls = await getProxyList();
    expect(urls.length).toBe(2);
    const stderrText = stderr.mock.calls.map((c) => c[0]).join('');
    expect(stderrText).toMatch(/stale cache/);
  });

  it('throws when all sources fail and no cache exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(getProxyList()).rejects.toThrow(
      /Failed to fetch proxy list and no cached list available/,
    );
  });

  it('filters out non-IP:PORT lines', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('proxyscrape')) {
        return new Response(
          '1.1.1.1:80\nnot-a-proxy\n2.2.2.2:8080\nhttps://bad\n',
          { status: 200 },
        );
      }
      return new Response('', { status: 500 });
    });

    const urls = await getProxyList();
    expect(urls).toHaveLength(2);
  });
});
