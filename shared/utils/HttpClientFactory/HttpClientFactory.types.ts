import type { Module } from "@avandar/modules";

/** A `fetch` implementation. Injected by tests so they need no network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** An HTTP method an HttpClient sends. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** How an HttpClient authenticates. Sent only to `baseUrl`'s origin. */
export type HttpClientAuth =
  | { type: "bearer"; token: string }
  | { type: "apiKeyHeader"; headerName: string; apiKey: string }
  | { type: "apiKeyQuery"; paramName: string; apiKey: string };

/** A request as a middleware sees it. It never carries credentials. */
export type HttpMiddlewareRequest = {
  method: HttpMethod;
  url: string;
  headers: Headers;
  body: string | undefined;
  signal: AbortSignal | undefined;
};

/** Wraps sending a request. Call `next` to continue down the chain. */
export type HttpMiddleware = (
  request: Readonly<HttpMiddlewareRequest>,
  next: (request: Readonly<HttpMiddlewareRequest>) => Promise<Response>,
) => Promise<Response>;

/** A query parameter value. `undefined` leaves the parameter out. */
export type HttpQueryValue = string | number | boolean | undefined;

/** Options every request accepts. */
export type HttpRequestOptions = {
  query?: Readonly<Record<string, HttpQueryValue>>;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
};

/** Options for a request with a body, which is sent JSON-encoded. */
export type HttpRequestWithBodyOptions = HttpRequestOptions & {
  body?: unknown;
};

/** An HttpClient's state. Every key has a generated getter and setter. */
export type HttpClientState = {
  /** Relative request URLs resolve against this. Absolute URLs pass through. */
  baseUrl?: string;
  /** Requires `baseUrl`. Sent only to `baseUrl`'s origin. */
  auth?: HttpClientAuth;
  /** Sent with every request. */
  defaultHeaders?: Readonly<Record<string, string>>;
  /** The largest response body read, JSON or bytes. */
  maxResponseBytes: number;
  /** Wrap every request, the first one outermost. */
  middlewares?: readonly HttpMiddleware[];
  /** Defaults to global `fetch`. */
  fetchImpl?: FetchLike;
};

/** The members every HttpClient has. */
export type HttpClientMembers = {
  /** Sends a GET and returns the parsed, unvalidated JSON body. */
  get: (url: string, options?: HttpRequestOptions) => Promise<unknown>;
  /** Sends a POST and returns the parsed, unvalidated JSON body. */
  post: (url: string, options?: HttpRequestWithBodyOptions) => Promise<unknown>;
  /** Sends a PUT and returns the parsed, unvalidated JSON body. */
  put: (url: string, options?: HttpRequestWithBodyOptions) => Promise<unknown>;
  /** Sends a PATCH and returns the parsed, unvalidated JSON body. */
  patch: (
    url: string,
    options?: HttpRequestWithBodyOptions,
  ) => Promise<unknown>;
  /** Sends a DELETE and returns the parsed body, or `undefined` if empty. */
  delete: (url: string, options?: HttpRequestOptions) => Promise<unknown>;
  /** Sends a GET and returns the raw body bytes. Follows redirects. */
  getBytes: (
    url: string,
    options?: HttpRequestOptions,
  ) => Promise<Uint8Array<ArrayBuffer>>;
};

/** An HttpClient, whatever its name. */
export type HttpClient = Module<string, HttpClientState, HttpClientMembers>;
