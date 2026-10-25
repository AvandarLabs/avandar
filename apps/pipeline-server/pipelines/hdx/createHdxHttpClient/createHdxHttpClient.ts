import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import { withRetryOnTooManyRequests } from "$/utils/HttpClientFactory/mixins/withRetryOnTooManyRequests/withRetryOnTooManyRequests";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

/**
 * Ceiling for a metadata JSON response - never a resource download. The
 * largest 100-row `package_search` page measured was 63 MB, so 128 MB leaves
 * about 2x headroom.
 */
const MAX_METADATA_BYTES = 128 * 1024 * 1024;

/** HDX asks API clients to send at most one request per second. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

/** HDX rate-limits without a `Retry-After` header, so retries back off. */
const MAX_RETRIES_ON_TOO_MANY_REQUESTS = 3;

/** The first wait after a 429, doubled after each retry. */
const INITIAL_RETRY_DELAY_MS = 5000;

/**
 * Creates the rate-limited HTTP client the HDX pipeline reads CKAN with. It
 * sends no credentials: HDX API tokens only grant write access, and reads get
 * the same rate limits without one. A 429 is retried up to three times,
 * waiting 5, 10, then 20 seconds.
 *
 * @param params.baseUrl - The HDX drive's base URL.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 * @param params.sleep - Replaces the retry timer, for tests.
 * @returns The client.
 */
export function createHdxHttpClient(params: {
  baseUrl: string;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}): OpenDataHttp {
  const { baseUrl, fetchImpl, sleep } = params;
  return HttpClientFactory.create("HdxPipelineHttpClient", {
    state: {
      baseUrl,
      maxResponseBytes: MAX_METADATA_BYTES,
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
