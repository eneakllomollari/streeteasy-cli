import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runSearch,
  parseSearchInput,
  type SearchOptions,
} from '../../src/commands/search.js';
import type { StreetEasyClient } from '../../src/client.js';

describe('parseSearchInput', () => {
  it('translates flags into a SearchRentalsInput', () => {
    const input = parseSearchInput({
      area: ['WILLIAMSBURG', 'GREENPOINT'],
      maxPrice: 4500,
      beds: 2,
      sort: 'LISTED_AT',
      direction: 'DESCENDING',
      page: 1,
      perPage: 50,
    });
    expect(input.filters.areas).toEqual([302, 301]);
    expect(input.filters.bedrooms).toEqual({ lowerBound: 2, upperBound: 2 });
    expect(input.filters.price).toEqual({ lowerBound: null, upperBound: 4500 });
    expect(input.sorting).toEqual({
      attribute: 'LISTED_AT',
      direction: 'DESCENDING',
    });
  });

  it('lowercases area names case-insensitively', () => {
    const input = parseSearchInput({
      area: ['williamsburg'],
      page: 1,
      perPage: 50,
    });
    expect(input.filters.areas).toEqual([302]);
  });

  it('throws on unknown area', () => {
    expect(() =>
      parseSearchInput({
        area: ['NOT_A_REAL_AREA'],
        page: 1,
        perPage: 50,
      }),
    ).toThrow(/unknown area/i);
  });

});

describe('runSearch (with mocked client)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('emits JSON when --json is true', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stub: Pick<StreetEasyClient, 'searchRentals'> = {
      searchRentals: vi.fn().mockResolvedValue({
        searchRentals: { totalCount: 1, edges: [{ node: { id: '1' } }] },
      }),
    };
    const opts: SearchOptions = {
      area: ['WILLIAMSBURG'],
      json: true,
      page: 1,
      perPage: 50,
    };
    await runSearch(opts, stub as StreetEasyClient);
    const writes = stdout.mock.calls.map((c) => c[0]).join('');
    const parsed = JSON.parse(writes.trim());
    expect(parsed.searchRentals.totalCount).toBe(1);
  });

  it('--all-pages loops until totalCount reached', async () => {
    const page1 = {
      searchRentals: {
        totalCount: 4,
        edges: [{ node: { id: '1' } }, { node: { id: '2' } }],
      },
    };
    const page2 = {
      searchRentals: {
        totalCount: 4,
        edges: [{ node: { id: '3' } }, { node: { id: '4' } }],
      },
    };
    const stub: Pick<StreetEasyClient, 'searchRentals'> = {
      searchRentals: vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2),
    };
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const opts: SearchOptions = {
      area: ['WILLIAMSBURG'],
      json: true,
      allPages: true,
      page: 1,
      perPage: 2,
    };
    await runSearch(opts, stub as StreetEasyClient);
    expect(stub.searchRentals).toHaveBeenCalledTimes(2);
  });

  it('exits non-zero on API error (no swallow)', async () => {
    const stub: Pick<StreetEasyClient, 'searchRentals'> = {
      searchRentals: vi.fn().mockRejectedValue(new Error('HTTP 403')),
    };
    const opts: SearchOptions = {
      area: ['WILLIAMSBURG'],
      page: 1,
      perPage: 50,
      json: true,
    };
    await expect(runSearch(opts, stub as StreetEasyClient)).rejects.toThrow(
      /403/,
    );
  });
});
