import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  searchResultsPath,
  detailPath,
  readSearchResults,
  writeSearchResults,
  readDetail,
  writeDetail,
} from '../src/cache.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'streeteasy-cache-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('paths', () => {
  it('searchResultsPath joins cacheDir + search-results.json', () => {
    expect(searchResultsPath(dir)).toBe(join(dir, 'search-results.json'));
  });

  it('detailPath joins cacheDir + listings/<id>.json', () => {
    expect(detailPath(dir, '12345')).toBe(
      join(dir, 'listings', '12345.json'),
    );
  });
});

describe('readSearchResults / writeSearchResults', () => {
  it('returns null when file is missing', () => {
    expect(readSearchResults(dir)).toBeNull();
  });

  it('round-trips JSON', () => {
    const payload = { searchRentals: { totalCount: 1, edges: [] } };
    writeSearchResults(dir, payload);
    expect(readSearchResults(dir)).toEqual(payload);
  });

  it('creates the cache directory if it does not exist', () => {
    const nested = join(dir, 'nested', 'sub');
    writeSearchResults(nested, {
      searchRentals: { totalCount: 0, edges: [] },
    });
    expect(existsSync(join(nested, 'search-results.json'))).toBe(true);
  });
});

describe('readDetail / writeDetail', () => {
  it('returns null when listing detail is missing', () => {
    expect(readDetail(dir, '999')).toBeNull();
  });

  it('round-trips a detail payload', () => {
    const payload = { rentalByListingId: { id: '999' } };
    writeDetail(dir, '999', payload);
    expect(readDetail(dir, '999')).toEqual(payload);
  });

  it('creates listings subdirectory on write', () => {
    writeDetail(dir, '7', { rentalByListingId: { id: '7' } });
    expect(existsSync(join(dir, 'listings', '7.json'))).toBe(true);
  });
});
