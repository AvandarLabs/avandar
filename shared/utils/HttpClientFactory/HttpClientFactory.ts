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
    const requestJson = async (
      method: HttpMethod,
      url: string,
      options: HttpRequestWithBodyOptions = {},
    ): Promise<unknown> => {
      const response = await sendHttpRequest({
        state,
        method,
        url,
        options,
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
    };
    return {
      get: (url, options) => {
        return requestJson("GET", url, options);
      },
      post: (url, options) => {
        return requestJson("POST", url, options);
      },
      put: (url, options) => {
        return requestJson("PUT", url, options);
      },
      patch: (url, options) => {
        return requestJson("PATCH", url, options);
      },
      delete: (url, options) => {
        return requestJson("DELETE", url, options);
      },
      getBytes: async (url, options = {}) => {
        const response = await sendHttpRequest({
          state,
          method: "GET",
          url,
          options,
          accept: undefined,
        });
        return await readBoundedBody({
          response,
          maxBytes: state.maxResponseBytes,
          method: "GET",
        });
      },
    };
  },
});
