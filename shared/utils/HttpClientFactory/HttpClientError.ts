import type { HttpMethod } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

/** Why an HttpClient request failed. */
export type HttpClientErrorKind =
  | "status"
  | "responseTooLarge"
  | "tooManyRedirects";

type _HttpClientErrorDetails = {
  kind: HttpClientErrorKind;
  method: HttpMethod;
  status?: number;
  maxBytes?: number;
  declaredBytes?: number;
};

function _buildHttpClientErrorMessage(
  details: Readonly<_HttpClientErrorDetails>,
): string {
  const { kind, method, status, maxBytes, declaredBytes } = details;
  if (kind === "status") {
    return `HTTP ${method} request failed with status ${status}.`;
  }
  if (kind === "tooManyRedirects") {
    return `HTTP ${method} request was redirected too many times.`;
  }
  return declaredBytes === undefined
    ? `HTTP ${method} response exceeded the ${maxBytes} byte limit.`
    : `HTTP ${method} response declared ${declaredBytes} bytes, above the ${maxBytes} byte limit.`;
}

/**
 * A failed HttpClient request. Its message never names a URL: after a
 * redirect the URL can be a presigned object-store URL, which is a
 * credential.
 */
export class HttpClientError extends Error {
  readonly kind: HttpClientErrorKind;
  readonly method: HttpMethod;
  readonly status: number | undefined;

  constructor(details: Readonly<_HttpClientErrorDetails>) {
    super(_buildHttpClientErrorMessage(details));
    this.name = "HttpClientError";
    this.kind = details.kind;
    this.method = details.method;
    this.status = details.status;
  }
}
