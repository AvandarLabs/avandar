import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import { withRetryOnTooManyRequests } from "$/utils/HttpClientFactory/mixins/withRetryOnTooManyRequests/withRetryOnTooManyRequests";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

/**
 * Ceiling for one response the pipeline reads. The largest is `$metadata`,
 * measured at 12 MB, so 32 MB leaves room for it to grow. Indicator rows are
 * never read here: the copy builder downloads them.
 */
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

/** Four requests a second: a full run of about 3,300 takes 14 minutes. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 250;

/** A 429 is retried this many times, backing off as HDX's client does. */
const MAX_RETRIES_ON_TOO_MANY_REQUESTS = 3;

/** The first wait after a 429, doubled after each retry. */
const INITIAL_RETRY_DELAY_MS = 5000;

/**
 * Creates the rate-limited HTTP client the GHO pipeline reads GHO's OData
 * API with. GHO needs no credentials. A 429 is retried up to three times,
 * waiting 5, 10, then 20 seconds.
 *
 * @param params.baseUrl - The GHO drive's base URL.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 * @param params.sleep - Replaces the retry timer, for tests.
 * @returns The client.
 */
export function createGhoHttpClient(params: {
  baseUrl: string;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}): OpenDataHttp {
  const { baseUrl, fetchImpl, sleep } = params;
  return HttpClientFactory.create("GhoPipelineHttpClient", {
    state: {
      baseUrl,
      maxResponseBytes: MAX_RESPONSE_BYTES,
      fetchImpl,
    },
    mixins: [
      withRetryOnTooManyRequests({
        maxRetries: MAX_RETRIES_ON_TOO_MANY_REQUESTS,
        initialDelayMs: INITIAL_RETRY_DELAY_MS,
        sleep,
      }),
      withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS }),
    ],
  });
}
