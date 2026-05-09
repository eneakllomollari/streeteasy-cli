import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractListingId, runDetails } from '../../src/commands/details.js';
import type { StreetEasyClient } from '../../src/client.js';
import { writeDetail } from '../../src/cache.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, '..', 'fixtures', 'details-response.json'), 'utf-8'),
);

describe('extractListingId', () => {
  it.each([
    ['4892341', '4892341'],
    ['https://streeteasy.com/rental/4892341', '4892341'],
    ['/rental/4892341', '4892341'],
    ['https://streeteasy.com/rental/4892341/foo?x=1', '4892341'],
  ])('parses %s -> %s', (input, expected) => {
    expect(extractListingId(input)).toBe(expected);
  });

  it('throws on unparseable input', () => {
    expect(() => extractListingId('not a listing')).toThrow(
      /cannot parse listing id/i,
    );
  });
});

describe('runDetails', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'streeteasy-details-'));
    vi.restoreAllMocks();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('emits raw GraphQL data with --json', async () => {
    const stub: Pick<StreetEasyClient, 'getRentalListingDetails'> = {
      getRentalListingDetails: vi.fn().mockResolvedValue(fixture),
    };
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runDetails(
      { idOrUrl: '9999999', json: 'raw', cacheDir: dir },
      stub as StreetEasyClient,
    );
    const parsed = JSON.parse(out.mock.calls.map((c) => c[0]).join('').trim());
    expect(parsed.rentalByListingId).toBeDefined();
    expect(parsed.buildingByRentalListingId).toBeDefined();
  });

  it('emits projected DTO with --json=summary', async () => {
    const stub: Pick<StreetEasyClient, 'getRentalListingDetails'> = {
      getRentalListingDetails: vi.fn().mockResolvedValue(fixture),
    };
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runDetails(
      { idOrUrl: '9999999', json: 'summary', cacheDir: dir },
      stub as StreetEasyClient,
    );
    const parsed = JSON.parse(out.mock.calls.map((c) => c[0]).join('').trim());
    expect(parsed.id).toBe('9999999');
    expect(parsed.url).toMatch(/^https:\/\/streeteasy\.com\/rental\/9999999/);
    expect(Array.isArray(parsed.amenities)).toBe(true);
  });

  it('cache hit short-circuits the API call', async () => {
    writeDetail(dir, '9999999', fixture);
    const stub: Pick<StreetEasyClient, 'getRentalListingDetails'> = {
      getRentalListingDetails: vi.fn(),
    };
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runDetails(
      { idOrUrl: '9999999', json: 'raw', cacheDir: dir },
      stub as StreetEasyClient,
    );
    expect(stub.getRentalListingDetails).not.toHaveBeenCalled();
  });

  it('enriches summary with areaName and urlPath from cached search', async () => {
    const { writeSearchResults } = await import('../../src/cache.js');
    writeSearchResults(dir, {
      searchRentals: {
        edges: [
          {
            node: {
              id: '9999999',
              areaName: 'Williamsburg',
              urlPath: '/building/foo/9999999',
            },
          },
        ],
      },
    });
    writeDetail(dir, '9999999', fixture);
    const stub: Pick<StreetEasyClient, 'getRentalListingDetails'> = {
      getRentalListingDetails: vi.fn(),
    };
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runDetails(
      { idOrUrl: '9999999', json: 'summary', cacheDir: dir },
      stub as StreetEasyClient,
    );
    const parsed = JSON.parse(out.mock.calls.map((c) => c[0]).join('').trim());
    expect(parsed.area).toBe('Williamsburg');
    expect(parsed.url).toBe('https://streeteasy.com/building/foo/9999999');
  });
});
