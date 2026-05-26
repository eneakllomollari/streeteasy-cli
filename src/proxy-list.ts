import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

interface ProxyListCache {
  fetchedAt: number;
  proxies: string[];
}

const PROXY_SOURCES = [
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
  'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/generated/http_proxies.txt',
];

const FETCH_TIMEOUT_MS = 10_000;

export const CACHE_TTL_MS = 10 * 60 * 1000;

export function proxyListCachePath(): string {
  return join(homedir(), '.config', 'streeteasy', 'proxy-list-cache.json');
}

function parseProxyText(text: string): string[] {
  return text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l))
    .map((l) => `http://${l}`);
}

async function fetchFromSource(url: string): Promise<string[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const text = await res.text();
  return parseProxyText(text);
}

async function fetchAllSources(): Promise<string[]> {
  const results = await Promise.allSettled(
    PROXY_SOURCES.map((url) => fetchFromSource(url)),
  );

  const all = new Set<string>();
  let succeeded = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      succeeded++;
      for (const proxy of result.value) {
        all.add(proxy);
      }
    }
  }

  if (succeeded === 0) {
    throw new Error('All proxy sources failed');
  }

  process.stderr.write(
    `Fetched ${all.size} unique proxies from ${succeeded}/${PROXY_SOURCES.length} sources\n`,
  );
  return [...all];
}

function readCachedList(): ProxyListCache | null {
  const path = proxyListCachePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as ProxyListCache;
  } catch {
    return null;
  }
}

function writeCachedList(cache: ProxyListCache): void {
  const path = proxyListCachePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cache));
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export async function getProxyList(): Promise<string[]> {
  const cached = readCachedList();
  const cacheValid = cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (cacheValid) {
    return shuffleArray(cached.proxies);
  }

  let candidates: string[];
  try {
    candidates = await fetchAllSources();
  } catch (err) {
    if (cached !== null) {
      process.stderr.write(
        `Warning: failed to refresh proxy list, using stale cache: ${(err as Error).message}\n`,
      );
      return shuffleArray(cached.proxies);
    }
    throw new Error(
      `Failed to fetch proxy list and no cached list available. Use --proxy-url <url> or --no-proxy.\n${(err as Error).message}`,
    );
  }

  writeCachedList({ fetchedAt: Date.now(), proxies: candidates });
  return shuffleArray(candidates);
}
