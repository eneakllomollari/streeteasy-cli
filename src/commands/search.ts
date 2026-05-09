import { Areas } from '../constants.js';
import type { AreaCode } from '../constants.js';
import type {
  SearchFilters,
  SearchRentalsInput,
  SearchRentalsResponse,
} from '../types.js';
import type { StreetEasyClient } from '../client.js';
import { writeSearchResults } from '../cache.js';
import { formatListing } from '../output.js';

export interface SearchOptions {
  area: string[];
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sort?: 'LISTED_AT' | 'PRICE' | 'RECOMMENDED' | 'INTERESTING_CHANGE_AT' | 'SQFT';
  direction?: 'ASCENDING' | 'DESCENDING';
  page: number;
  perPage: number;
  allPages?: boolean;
  cacheDir?: string;
  json?: boolean;
}

export function parseSearchInput(opts: SearchOptions): SearchRentalsInput {
  const areaMap = Areas as Record<string, number>;
  const areas: AreaCode[] = opts.area.map((name) => {
    const key = name.toUpperCase();
    const value = areaMap[key];
    if (value === undefined) {
      throw new Error(`unknown area: ${name}`);
    }
    return value as AreaCode;
  });

  const filters: SearchFilters = {
    areas,
    rentalStatus: 'ACTIVE',
  };

  if (opts.minPrice !== undefined || opts.maxPrice !== undefined) {
    filters.price = {
      lowerBound: opts.minPrice ?? null,
      upperBound: opts.maxPrice ?? null,
    };
  }
  if (opts.beds !== undefined) {
    filters.bedrooms = { lowerBound: opts.beds, upperBound: opts.beds };
  }
  if (opts.baths !== undefined) {
    filters.bathrooms = { lowerBound: opts.baths, upperBound: null };
  }

  return {
    filters,
    sorting: {
      attribute: opts.sort ?? 'LISTED_AT',
      direction: opts.direction ?? 'DESCENDING',
    },
    page: opts.page,
    perPage: opts.perPage,
  };
}

export async function runSearch(
  opts: SearchOptions,
  client: Pick<StreetEasyClient, 'searchRentals'>,
): Promise<void> {
  const baseInput = parseSearchInput(opts);

  let totalCount = 0;
  type Edge = SearchRentalsResponse['searchRentals']['edges'][number];
  const allEdges: Edge[] = [];
  let page = opts.page;

  while (true) {
    const res = await client.searchRentals({ ...baseInput, page });
    totalCount = res.searchRentals.totalCount;
    allEdges.push(...res.searchRentals.edges);
    if (
      !opts.allPages ||
      allEdges.length >= totalCount ||
      res.searchRentals.edges.length === 0
    ) {
      break;
    }
    page += 1;
  }

  const merged = {
    searchRentals: {
      __typename: 'SearchRentals',
      totalCount,
      edges: allEdges,
    },
  } as unknown as SearchRentalsResponse;

  if (opts.cacheDir) {
    writeSearchResults(opts.cacheDir, merged);
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(merged)}\n`);
    return;
  }

  for (const edge of allEdges) {
    const n = edge.node;
    process.stdout.write(
      `${formatListing({
        price: n.price,
        netEffectivePrice: n.netEffectivePrice,
        monthsFree: n.monthsFree,
        noFee: n.noFee,
        beds: n.bedroomCount,
        baths: n.fullBathroomCount,
        sqft: n.livingAreaSize,
        street: n.street,
        unit: n.unit,
        area: n.areaName,
        url: `https://streeteasy.com${n.urlPath}`,
        description: '',
        amenities: [],
        features: [],
        transitStations: [],
        petPolicy: null,
        leaseTermMonths: null,
      })}\n`,
    );
  }
  process.stdout.write(`\n${totalCount} total listings\n`);
}
