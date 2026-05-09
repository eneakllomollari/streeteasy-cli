import { randomUUID } from 'node:crypto';
import { SEARCH_RENTALS_QUERY, RENTAL_LISTING_DETAILS_QUERY } from './queries.js';
import type {
  Variables,
  SearchRentalsInput,
  SearchRentalsResponse,
  RentalListingDetailsResponse,
} from './types.js';
import { buildAgent, type ResolvedProxy, type AgentHandle } from './proxy.js';

export interface StreetEasyConfig {
  endpoint?: string;
  proxy?: ResolvedProxy;
}

const DEFAULT_ENDPOINT = 'https://api-v6.streeteasy.com/';

const DEFAULT_HEADERS: Record<string, string> = {
  Host: 'api-v6.streeteasy.com',
  Connection: 'keep-alive',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'X-Forwarded-Proto': 'https',
  'Sec-Ch-Ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'App-Version': '1.0.0',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Apollographql-Client-Version':
    'version  50bef71ef923e981bdcb7c781851c3bfdb12a0c1',
  'Apollographql-Client-Name': 'srp-frontend-service',
  Os: 'web',
  Dnt: '1',
  Origin: 'https://streeteasy.com',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  Referer: 'https://streeteasy.com/',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
};

interface GqlResult<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

export class StreetEasyClient {
  private readonly endpoint: string;
  private readonly handle: AgentHandle;

  constructor(config: StreetEasyConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.handle = buildAgent(
      config.proxy ?? { enabled: false, url: undefined },
    );
  }

  async request<TData>(
    query: string,
    variables: Variables = {},
  ): Promise<TData> {
    const body = JSON.stringify({ query, variables });
    const buildInit = (): RequestInit => {
      const init: RequestInit = {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body,
      };
      if (this.handle.dispatcher) {
        // undici accepts `dispatcher` on RequestInit at runtime; types
        // disagree across undici versions, so cast through unknown.
        (init as unknown as { dispatcher: unknown }).dispatcher =
          this.handle.dispatcher;
      }
      return init;
    };

    let res = await fetch(this.endpoint, buildInit());
    let rotated = false;

    if (res.status === 403 && this.handle.dispatcher) {
      this.handle.rotate();
      rotated = true;
      res = await fetch(this.endpoint, buildInit());
    }

    if (!res.ok) {
      const suffix =
        rotated && res.status === 403 ? ' (rotation exhausted)' : '';
      if (rotated && res.status === 403) {
        process.stderr.write('rotation exhausted\n');
      }
      throw new Error(
        `StreetEasy GraphQL Error: HTTP ${res.status} ${res.statusText}${suffix}`,
      );
    }

    const json = (await res.json()) as GqlResult<TData>;
    if (json.errors?.length) {
      throw new Error(`StreetEasy GraphQL Error: ${json.errors[0]!.message}`);
    }
    if (!json.data) {
      throw new Error('StreetEasy GraphQL Error: empty response');
    }
    return json.data;
  }

  async searchRentals(
    input: SearchRentalsInput,
  ): Promise<SearchRentalsResponse> {
    const inputWithDefaults = {
      ...input,
      adStrategy: input.adStrategy ?? 'NONE',
      userSearchToken: input.userSearchToken ?? randomUUID(),
    };
    return this.request<SearchRentalsResponse>(SEARCH_RENTALS_QUERY, {
      input: inputWithDefaults,
    });
  }

  async getRentalListingDetails(
    listingID: string,
  ): Promise<RentalListingDetailsResponse> {
    return this.request<RentalListingDetailsResponse>(
      RENTAL_LISTING_DETAILS_QUERY,
      { listingID },
    );
  }
}
