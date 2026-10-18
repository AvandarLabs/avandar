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

/**
 * Sends one hop. Requests to `baseUrl`'s origin carry credentials and follow
 * redirects by hand, so a redirect to another origin drops them. Everything
 * else is sent without credentials and lets `fetch` follow redirects.
 */
async function _sendHop(params: {
  request: Readonly<HttpMiddlewareRequest>;
  state: Readonly<HttpClientState>;
  fetchImpl: FetchLike;
  redirectsLeft: number;
}): Promise<Response> {
  const { request, state, fetchImpl, redirectsLeft } = params;
  const url = new URL(request.url);
  const init = {
    method: request.method,
    body: request.body,
    signal: request.signal,
  };
  if (!_isCredentialedOrigin(url, state) || state.auth === undefined) {
    return await fetchImpl(url.toString(), {
      ...init,
      headers: request.headers,
      redirect: "follow",
    });
  }
  const credentialed = _addCredentials({
    url,
    headers: request.headers,
    auth: state.auth,
  });
  const response = await fetchImpl(credentialed.url.toString(), {
    ...init,
    headers: credentialed.headers,
    redirect: "manual",
  });
  const location = response.headers.get("location");
  if (!REDIRECT_STATUSES.has(response.status) || location === null) {
    return response;
  }
  if (redirectsLeft === 0) {
    throw new HttpClientError({
      kind: "tooManyRedirects",
      method: request.method,
    });
  }
  const method = _redirectMethod(response.status, request.method);
  return await _sendHop({
    ...params,
    request: {
      ...request,
      url: new URL(location, url).toString(),
      method,
      body: method === request.method ? request.body : undefined,
    },
    redirectsLeft: redirectsLeft - 1,
  });
}

/**
 * Sends one HttpClient request through the client's middlewares and returns
 * the 2xx response. Credentials are added after the middlewares, only for
 * `baseUrl`'s origin, so no middleware and no other host ever sees them.
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
  const sendToNetwork: _SendToNetwork = (finalRequest) => {
    return _sendHop({
      request: finalRequest,
      state,
      fetchImpl: state.fetchImpl ?? fetch,
      redirectsLeft: MAX_REDIRECTS,
    });
  };
  const send = (state.middlewares ?? []).reduceRight<_SendToNetwork>(
    (next, middleware) => {
      return (middlewareRequest) => {
        return middleware(middlewareRequest, next);
      };
    },
    sendToNetwork,
  );
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
