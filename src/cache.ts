import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function searchResultsPath(cacheDir: string): string {
  return join(cacheDir, 'search-results.json');
}

export function detailPath(cacheDir: string, listingId: string): string {
  return join(cacheDir, 'listings', `${listingId}.json`);
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readSearchResults<T>(cacheDir: string): T | null {
  return readJson<T>(searchResultsPath(cacheDir));
}

export function writeSearchResults(cacheDir: string, value: unknown): void {
  writeJson(searchResultsPath(cacheDir), value);
}

export function readDetail<T>(cacheDir: string, listingId: string): T | null {
  return readJson<T>(detailPath(cacheDir, listingId));
}

export function writeDetail(
  cacheDir: string,
  listingId: string,
  value: unknown,
): void {
  writeJson(detailPath(cacheDir, listingId), value);
}
