import type { StreetEasyClient } from '../client.js';
import { readDetail, readSearchResults, writeDetail } from '../cache.js';
import { projectSummary } from '../summary.js';
import { formatListing } from '../output.js';

export interface DetailsOptions {
  idOrUrl: string;
  json?: 'raw' | 'summary' | undefined;
  cacheDir?: string | undefined;
}

const ID_RE = /\/rental\/(\d+)/;

export function extractListingId(input: string): string {
  if (/^\d+$/.test(input)) return input;
  const m = input.match(ID_RE);
  if (m) return m[1]!;
  throw new Error(`cannot parse listing id from: ${input}`);
}

interface CachedSearch {
  searchRentals?: {
    edges?: Array<{
      node?: { id?: string; areaName?: string; urlPath?: string };
    }>;
  };
}

function lookupSearchHints(
  cacheDir: string | undefined,
  id: string,
): { areaName: string | undefined; urlPath: string | undefined } {
  if (!cacheDir) return { areaName: undefined, urlPath: undefined };
  const cached = readSearchResults<CachedSearch>(cacheDir);
  const edge = cached?.searchRentals?.edges?.find((e) => e.node?.id === id);
  return {
    areaName: edge?.node?.areaName,
    urlPath: edge?.node?.urlPath,
  };
}

export async function runDetails(
  opts: DetailsOptions,
  client: Pick<StreetEasyClient, 'getRentalListingDetails'>,
): Promise<void> {
  const id = extractListingId(opts.idOrUrl);

  let detail: unknown;
  if (opts.cacheDir) {
    detail = readDetail(opts.cacheDir, id);
  }
  if (!detail) {
    detail = await client.getRentalListingDetails(id);
    if (opts.cacheDir) writeDetail(opts.cacheDir, id, detail);
  }

  if (opts.json === 'raw') {
    process.stdout.write(`${JSON.stringify(detail)}\n`);
    return;
  }

  const hints = lookupSearchHints(opts.cacheDir, id);
  const summary = projectSummary(
    detail as Parameters<typeof projectSummary>[0],
    hints,
  );

  if (opts.json === 'summary') {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return;
  }

  process.stdout.write(
    formatListing({
      price: summary.price,
      netEffectivePrice: summary.netEffectivePrice,
      monthsFree: summary.monthsFree,
      noFee: summary.noFee,
      beds: summary.beds,
      baths: summary.baths,
      sqft: summary.sqft,
      street: summary.address,
      unit: '',
      area: summary.area,
      url: summary.url,
      description: summary.description,
      amenities: summary.amenities,
      features: summary.features,
      transitStations: summary.transitStations,
      petPolicy: summary.petPolicy,
      leaseTermMonths: summary.leaseTermMonths,
    }),
  );
}
