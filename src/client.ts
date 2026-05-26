import { randomUUID } from "node:crypto";
import {
  SEARCH_RENTALS_QUERY,
  RENTAL_LISTING_DETAILS_QUERY,
} from "./queries.js";
import type {
  Variables,
  SearchRentalsInput,
  SearchRentalsResponse,
  RentalListingDetailsResponse,
} from "./types.js";
import { ProxyAgent } from "undici";
import { buildDisabledHandle, type AgentHandle } from "./proxy.js";

export interface StreetEasyConfig {
  endpoint?: string;
  handle?: AgentHandle;
}

const DEFAULT_ENDPOINT = "https://api-v6.streeteasy.com/";
const PROXY_TIMEOUT_MS = 8_000;
const RACE_BATCH_SIZE = 200;

const DEFAULT_HEADERS: Record<string, string> = {
  Connection: "keep-alive",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Ch-Ua": '"Chromium";v="133", "Not(A:Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "App-Version": "1.0.0",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Apollographql-Client-Version":
    "version  50bef71ef923e981bdcb7c781851c3bfdb12a0c1",
  "Apollographql-Client-Name": "srp-frontend-service",
  Os: "web",
  Dnt: "1",
  Origin: "https://streeteasy.com",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  Referer: "https://streeteasy.com/",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
};

const PROXY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

interface GqlResult<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

class ApiError extends Error {}

function isApiError(err: unknown): boolean {
  return err instanceof ApiError;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (
    err instanceof Error &&
    /ECONNREFUSED|ETIMEDOUT|ECONNRESET|socket hang up/i.test(err.message)
  ) {
    return true;
  }
  return false;
}

export class StreetEasyClient {
  private readonly endpoint: string;
  private readonly handle: AgentHandle;

  constructor(config: StreetEasyConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.handle = config.handle ?? buildDisabledHandle();
  }

  async request<TData>(
    query: string,
    variables: Variables = {},
  ): Promise<TData> {
    if (this.handle.proxyUrls) {
      return this.raceRequest<TData>(query, variables);
    }

    const body = JSON.stringify({ query, variables });
    const buildInit = (): RequestInit => {
      const init: RequestInit = {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body,
      };
      if (this.handle.dispatcher) {
        (init as unknown as { dispatcher: unknown }).dispatcher =
          this.handle.dispatcher;
        init.signal = AbortSignal.timeout(PROXY_TIMEOUT_MS);
      }
      return init;
    };

    let attempt = 0;
    for (;;) {
      attempt += 1;
      let res: Response;
      try {
        res = await fetch(this.endpoint, buildInit());
      } catch (err) {
        if (isNetworkError(err) && this.handle.dispatcher) {
          if (this.handle.rotate()) {
            process.stderr.write(`\rProxy #${attempt} failed, trying next...`);
            continue;
          }
          process.stderr.write("\nrotation exhausted\n");
          throw new Error(
            `Proxy connection failed (rotation exhausted): ${(err as Error).message}`,
          );
        }
        throw err;
      }

      if (attempt > 1 && res.ok) {
        process.stderr.write("\n");
      }

      if (res.ok) {
        const json = (await res.json()) as GqlResult<TData>;
        if (json.errors?.length) {
          throw new Error(
            `StreetEasy GraphQL Error: ${json.errors[0]!.message}`,
          );
        }
        if (!json.data) {
          throw new Error("StreetEasy GraphQL Error: empty response");
        }
        return json.data;
      }

      if (res.status === 403 && this.handle.dispatcher) {
        if (this.handle.rotate()) {
          process.stderr.write(`\rProxy #${attempt} blocked, trying next...`);
          continue;
        }
        process.stderr.write("\nrotation exhausted\n");
        throw new Error(
          `StreetEasy GraphQL Error: HTTP ${res.status} ${res.statusText} (rotation exhausted)`,
        );
      }

      throw new Error(
        `StreetEasy GraphQL Error: HTTP ${res.status} ${res.statusText}`,
      );
    }
  }

  private async raceRequest<TData>(
    query: string,
    variables: Variables = {},
  ): Promise<TData> {
    const urls = this.handle.proxyUrls!;
    const body = JSON.stringify({ query, variables });

    for (let i = 0; i < urls.length; i += RACE_BATCH_SIZE) {
      const batch = urls.slice(i, i + RACE_BATCH_SIZE);
      const batchNum = Math.floor(i / RACE_BATCH_SIZE) + 1;
      const controller = new AbortController();

      try {
        const data = await Promise.any(
          batch.map(async (url) => {
            const agent = new ProxyAgent(url);
            const init: RequestInit = {
              method: "POST",
              headers: PROXY_HEADERS,
              body,
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(PROXY_TIMEOUT_MS),
              ]),
            };
            (init as unknown as { dispatcher: unknown }).dispatcher = agent;

            const res = await fetch(this.endpoint, init);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = (await res.json()) as GqlResult<TData>;
            controller.abort();
            if (json.errors?.length) {
              throw new ApiError(json.errors[0]!.message);
            }
            if (!json.data) {
              throw new ApiError("empty response");
            }
            return json.data;
          }),
        );
        return data;
      } catch (err) {
        if (err instanceof AggregateError) {
          const apiErr = err.errors.find(isApiError);
          if (apiErr) {
            throw new Error(`StreetEasy GraphQL Error: ${apiErr.message}`);
          }
        }
        process.stderr.write(
          `\rProxy batch ${batchNum} exhausted (${batch.length} proxies), trying next...`,
        );
      }
    }

    process.stderr.write("\n");
    throw new Error(
      "All proxies exhausted. Use --proxy-url <url> or --no-proxy.",
    );
  }

  async searchRentals(
    input: SearchRentalsInput,
  ): Promise<SearchRentalsResponse> {
    const inputWithDefaults = {
      ...input,
      adStrategy: input.adStrategy ?? "NONE",
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
