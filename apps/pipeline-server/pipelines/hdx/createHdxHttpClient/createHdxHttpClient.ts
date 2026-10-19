import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** HDX asks API clients to send at most one request per second. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

/**
 * Creates the rate-limited HTTP client the HDX pipeline reads CKAN with. It
 * sends no credentials: HDX API tokens only grant write access, and reads get
 * the same rate limits without one.
 *
 * @param params.baseUrl - The HDX drive's base URL.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 * @returns The client.
 */
export function createHdxHttpClient(params: {
  baseUrl: string;
  fetchImpl?: FetchLike;
}): OpenDataHttp {
  const { baseUrl, fetchImpl } = params;
  return HttpClientFactory.create("HdxPipelineHttpClient", {
    state: {
      baseUrl,
      maxResponseBytes: MAX_METADATA_BYTES,
      fetchImpl,
    },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });
}
