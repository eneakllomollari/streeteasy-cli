import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreetEasyClient } from '../src/client.js';

describe('StreetEasyClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searchRentals posts to the GraphQL endpoint with the correct variables', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { searchRentals: { totalCount: 0, edges: [] } },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const client = new StreetEasyClient();
    const result = await client.searchRentals({
      filters: { areas: [302], rentalStatus: 'ACTIVE' },
      sorting: { attribute: 'LISTED_AT', direction: 'DESCENDING' },
      page: 1,
      perPage: 10,
    });

    expect(result.searchRentals.totalCount).toBe(0);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.variables.input.filters.areas).toEqual([302]);
    expect(body.variables.input.adStrategy).toBe('NONE');
    expect(typeof body.variables.input.userSearchToken).toBe('string');
    expect(body.variables.input.userSearchToken.length).toBeGreaterThan(10);
  });

  it('getRentalListingDetails posts the listingID variable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { rentalByListingId: { id: '123' }, buildingByRentalListingId: {} },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const client = new StreetEasyClient();
    await client.getRentalListingDetails('123');

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.variables.listingID).toBe('123');
  });

  it('throws a wrapped error on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    const client = new StreetEasyClient();
    await expect(client.getRentalListingDetails('123')).rejects.toThrow(
      /StreetEasy GraphQL Error.*403/,
    );
  });

  it('rotates proxy session on 403 and retries once', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { rentalByListingId: { id: '123' }, buildingByRentalListingId: {} },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const client = new StreetEasyClient({
      proxy: { enabled: true, url: 'http://{{rand}}@host:1234' },
    });

    const result = await client.getRentalListingDetails('123');
    expect(result.rentalByListingId.id).toBe('123');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry beyond once on persistent 403 — surfaces error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    const client = new StreetEasyClient({
      proxy: { enabled: true, url: 'http://{{rand}}@host:1234' },
    });

    await expect(client.getRentalListingDetails('123')).rejects.toThrow(
      /StreetEasy GraphQL Error.*403/,
    );
  });

  it('emits "rotation exhausted" on stderr after second 403 fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const client = new StreetEasyClient({
      proxy: { enabled: true, url: 'http://{{rand}}@host:1234' },
    });

    await expect(client.getRentalListingDetails('123')).rejects.toThrow(
      /rotation exhausted/,
    );
    const stderrText = stderr.mock.calls.map((c) => c[0]).join('');
    expect(stderrText).toMatch(/rotation exhausted/);
  });
});
