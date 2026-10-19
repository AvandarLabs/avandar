import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";

/** The Discovery API's origin. The app token is sent only here. */
const DISCOVERY_API_ORIGIN = "https://api.us.socrata.com";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** Stays well inside Socrata's request budget, with or without a token. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

/**
 * Creates the rate-limited HTTP client the Socrata pipeline reads the
 * Discovery API with. It sends the app token, when one is configured, as
 * `X-App-Token`. Create one per run, so every drive shares one rate limit.
 *
 * @param params.appToken - A Socrata app token, or `undefined` for none.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 * @returns The client.
 */
export function createSocrataHttpClient(params: {
  appToken: string | undefined;
  fetchImpl?: FetchLike;
}): OpenDataHttp {
  const { appToken, fetchImpl } = params;
  return HttpClientFactory.create("SocrataPipelineHttpClient", {
    state: {
      baseUrl: DISCOVERY_API_ORIGIN,
      auth:
        appToken === undefined
          ? undefined
          : { type: "apiKeyHeader", headerName: "X-App-Token", apiKey: appToken },
      maxResponseBytes: MAX_METADATA_BYTES,
      fetchImpl,
    },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });
}
