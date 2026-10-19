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
 * sends the API token, when one is configured, as HDX expects: the raw token
 * in the `Authorization` header, and only to `baseUrl`'s origin.
 *
 * @param params.baseUrl - The HDX drive's base URL.
 * @param params.apiKey - An HDX API token, or `undefined` for none.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 * @returns The client.
 */
export function createHdxHttpClient(params: {
  baseUrl: string;
  apiKey: string | undefined;
  fetchImpl?: FetchLike;
}): OpenDataHttp {
  const { baseUrl, apiKey, fetchImpl } = params;
  return HttpClientFactory.create("HdxPipelineHttpClient", {
    state: {
      baseUrl,
      auth:
        apiKey === undefined
          ? undefined
          : { type: "apiKeyHeader", headerName: "Authorization", apiKey },
      maxResponseBytes: MAX_METADATA_BYTES,
      fetchImpl,
    },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });
}
