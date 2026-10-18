import { createModuleFactory } from "@avandar/modules";
import { readBoundedBody } from "$/utils/HttpClientFactory/readBoundedBody.ts";
import { sendHttpRequest } from "$/utils/HttpClientFactory/sendHttpRequest.ts";
import type { BuilderModule } from "@avandar/modules";
import type {
  HttpClientMembers,
  HttpClientState,
  HttpMethod,
  HttpRequestWithBodyOptions,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

function _parseJsonBody(bytes: Uint8Array): unknown {
  return bytes.byteLength === 0
    ? undefined
    : JSON.parse(new TextDecoder().decode(bytes));
}

async function _requestJson(params: {
  state: Readonly<HttpClientState>;
  method: HttpMethod;
  url: string;
  options: Readonly<HttpRequestWithBodyOptions> | undefined;
}): Promise<unknown> {
  const { state, method } = params;
  const response = await sendHttpRequest({
    state,
    method,
    url: params.url,
    options: params.options ?? {},
    accept: "application/json",
  });
  if (response.status === 204) {
    return undefined;
  }
  return _parseJsonBody(
    await readBoundedBody({
      response,
      maxBytes: state.maxResponseBytes,
      method,
    }),
  );
}

async function _getBytes(params: {
  state: Readonly<HttpClientState>;
  url: string;
  options: Readonly<HttpRequestWithBodyOptions> | undefined;
}): Promise<Uint8Array<ArrayBuffer>> {
  const { state } = params;
  const response = await sendHttpRequest({
    state,
    method: "GET",
    url: params.url,
    options: params.options ?? {},
    accept: undefined,
  });
  return await readBoundedBody({
    response,
    maxBytes: state.maxResponseBytes,
    method: "GET",
  });
}

/**
 * The HttpClient kind: a small `fetch`-based client with named auth
 * strategies, a response size cap, and middlewares. Make one with
 * `HttpClientFactory.create(name, { state, mixins })`; add rate limiting with
 * the `withRateLimit` mixin.
 */
export const HttpClientFactory = createModuleFactory("HttpClient", {
  defaultState: {
    baseUrl: undefined,
    auth: undefined,
    defaultHeaders: undefined,
    middlewares: [],
    fetchImpl: undefined,
  },
  builder: (module: BuilderModule<HttpClientState>): HttpClientMembers => {
    const state = module.getState();
    if (state.auth !== undefined && state.baseUrl === undefined) {
      throw new Error(
        `HttpClient "${module.getModuleName()}" has auth but no baseUrl, so it cannot tell which origin may receive the credentials.`,
      );
    }
    return {
      get: (url, options) => {
        return _requestJson({ state, method: "GET", url, options });
      },
      post: (url, options) => {
        return _requestJson({ state, method: "POST", url, options });
      },
      put: (url, options) => {
        return _requestJson({ state, method: "PUT", url, options });
      },
      patch: (url, options) => {
        return _requestJson({ state, method: "PATCH", url, options });
      },
      delete: (url, options) => {
        return _requestJson({ state, method: "DELETE", url, options });
      },
      getBytes: (url, options) => {
        return _getBytes({ state, url, options });
      },
    };
  },
});
