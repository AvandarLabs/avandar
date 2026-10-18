import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type {
  FetchLike,
  HttpClientAuth,
  HttpClientState,
  HttpMethod,
  HttpMiddlewareRequest,
  HttpRequestWithBodyOptions,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  301, 302, 303, 307, 308,
]);

type _SendToNetwork = (
  request: Readonly<HttpMiddlewareRequest>,
) => Promise<Response>;

function _resolveRequestUrl(params: {
  baseUrl: string | undefined;
  url: string;
  query: HttpRequestWithBodyOptions["query"];
}): string {
  const resolved = new URL(params.url, params.baseUrl);
  Object.entries(params.query ?? {}).forEach(([name, value]) => {
    if (value !== undefined) {
      resolved.searchParams.set(name, String(value));
    }
  });
  return resolved.toString();
}

function _buildRequestHeaders(params: {
  defaultHeaders: HttpClientState["defaultHeaders"];
  headers: HttpRequestWithBodyOptions["headers"];
  accept: string | undefined;
  hasBody: boolean;
}): Headers {
  const headers = new Headers(params.defaultHeaders);
  Object.entries(params.headers ?? {}).forEach(([name, value]) => {
    headers.set(name, value);
  });
  if (params.accept !== undefined) {
    headers.set("accept", params.accept);
  }
  if (params.hasBody) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

function _isCredentialedOrigin(
  url: URL,
  state: Readonly<HttpClientState>,
): boolean {
  return (
    state.auth !== undefined &&
    state.baseUrl !== undefined &&
    url.origin === new URL(state.baseUrl).origin
  );
}

function _addCredentials(params: {
  url: URL;
  headers: Headers;
  auth: HttpClientAuth;
}): { url: URL; headers: Headers } {
  const { auth } = params;
  const url = new URL(params.url);
  const headers = new Headers(params.headers);
  switch (auth.type) {
    case "bearer":
      headers.set("authorization", `Bearer ${auth.token}`);
      break;
    case "apiKeyHeader":
      headers.set(auth.headerName, auth.apiKey);
      break;
    case "apiKeyQuery":
      url.searchParams.set(auth.paramName, auth.apiKey);
      break;
  }
  return { url, headers };
}

function _redirectMethod(status: number, method: HttpMethod): HttpMethod {
  const switchesToGet =
    status === 303 || ((status === 301 || status === 302) && method === "POST");
  return switchesToGet ? "GET" : method;
}

function _isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
  return (
    signal?.aborted === true ||
    // Checked structurally: a `DOMException` is not an `Error` instance in
    // every runtime.
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}

/**
 * Calls `fetchImpl`, replacing a rejection with a network HttpClientError. The
 * original error is dropped, not wrapped: a runtime's message can name the
 * URL, which holds the API key under `apiKeyQuery` auth. Aborts pass through.
 */
async function _fetchWithoutLeakingUrl(params: {
  fetchImpl: FetchLike;
  url: string;
  init: RequestInit & { method: HttpMethod };
}): Promise<Response> {
  const { fetchImpl, url, init } = params;
  try {
    return await fetchImpl(url, init);
  } catch (error) {
    if (_isAbort(error, init.signal ?? undefined)) {
      throw error;
    }
    throw new HttpClientError({ kind: "network", method: init.method });
  }
}

type _SendHopParams = {
  request: Readonly<HttpMiddlewareRequest>;
  state: Readonly<HttpClientState>;
  fetchImpl: FetchLike;
  redirectsLeft: number;
};

/**
 * Follows a manual redirect from `response`, or returns `response` when it is
 * not one. The redirect's own body is cancelled so its connection is freed.
 */
async function _followRedirect(
  params: _SendHopParams & { response: Response },
): Promise<Response> {
  const { request, response, redirectsLeft } = params;
  const location = response.headers.get("location");
  if (!REDIRECT_STATUSES.has(response.status) || location === null) {
    return response;
  }
  await response.body?.cancel();
  if (redirectsLeft === 0) {
    throw new HttpClientError({
      kind: "tooManyRedirects",
      method: request.method,
    });
  }
  const method = _redirectMethod(response.status, request.method);
  const isMethodKept = method === request.method;
  const headers = new Headers(request.headers);
  if (!isMethodKept) {
    headers.delete("content-type");
  }
  return await _sendHop({
    ...params,
    request: {
      ...request,
      url: new URL(location, request.url).toString(),
      method,
      headers,
      body: isMethodKept ? request.body : undefined,
    },
    redirectsLeft: redirectsLeft - 1,
  });
}

/**
 * Sends one hop. Requests to `baseUrl`'s origin carry credentials and follow
 * redirects by hand, so a redirect to another origin drops them. Everything
 * else is sent without credentials and lets `fetch` follow redirects.
 */
async function _sendHop(params: _SendHopParams): Promise<Response> {
  const { request, state, fetchImpl } = params;
  const url = new URL(request.url);
  const init = {
    method: request.method,
    body: request.body,
    signal: request.signal,
  };
  if (!_isCredentialedOrigin(url, state) || state.auth === undefined) {
    return await _fetchWithoutLeakingUrl({
      fetchImpl,
      url: url.toString(),
      init: { ...init, headers: request.headers, redirect: "follow" },
    });
  }
  const credentialed = _addCredentials({
    url,
    headers: request.headers,
    auth: state.auth,
  });
  const response = await _fetchWithoutLeakingUrl({
    fetchImpl,
    url: credentialed.url.toString(),
    init: { ...init, headers: credentialed.headers, redirect: "manual" },
  });
  return await _followRedirect({ ...params, response });
}

/** Wraps sending to the network in the client's middlewares. */
function _buildMiddlewareChain(
  state: Readonly<HttpClientState>,
): _SendToNetwork {
  const sendToNetwork: _SendToNetwork = (finalRequest) => {
    return _sendHop({
      request: finalRequest,
      state,
      fetchImpl: state.fetchImpl ?? fetch,
      redirectsLeft: MAX_REDIRECTS,
    });
  };
  return (state.middlewares ?? []).reduceRight<_SendToNetwork>(
    (next, middleware) => {
      return (middlewareRequest) => {
        return middleware(middlewareRequest, next);
      };
    },
    sendToNetwork,
  );
}

/**
 * Sends one HttpClient request through the client's middlewares and returns
 * the 2xx response. Credentials are added after the middlewares, only for
 * `baseUrl`'s origin, so no middleware and no other host ever sees them.
 * Credentialed redirects are followed by hand, which needs a server runtime
 * (Node or Deno): browsers return opaque responses for `redirect: "manual"`.
 */
export async function sendHttpRequest(params: {
  state: Readonly<HttpClientState>;
  method: HttpMethod;
  url: string;
  options: Readonly<HttpRequestWithBodyOptions>;
  accept: string | undefined;
}): Promise<Response> {
  const { state, method, options } = params;
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  const request: HttpMiddlewareRequest = {
    method,
    url: _resolveRequestUrl({
      baseUrl: state.baseUrl,
      url: params.url,
      query: options.query,
    }),
    headers: _buildRequestHeaders({
      defaultHeaders: state.defaultHeaders,
      headers: options.headers,
      accept: params.accept,
      hasBody: body !== undefined,
    }),
    body,
    signal: options.signal,
  };
  const send = _buildMiddlewareChain(state);
  const response = await send(request);
  if (!response.ok) {
    throw new HttpClientError({
      kind: "status",
      method,
      status: response.status,
    });
  }
  return response;
}
