import Bottleneck from "bottleneck";
import type { Mixin } from "@avandar/modules";
import type {
  HttpClientState,
  HttpMiddleware,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

type _RateLimitBase = {
  getMiddlewares(): HttpClientState["middlewares"];
};

/**
 * Rate-limits every request an HttpClient sends, by appending a middleware
 * that schedules each request through one Bottleneck limiter.
 *
 * The limiter is created by this call, so clients derived from one client
 * through setters share its budget, and clients given the same returned
 * mixin share a budget on purpose.
 *
 * @param options.minTimeMs - The least time between two request starts.
 * @param options.maxConcurrent - The most requests in flight. No cap if unset.
 * @returns The mixin.
 */
export function withRateLimit(options: {
  minTimeMs: number;
  maxConcurrent?: number;
}): Mixin<_RateLimitBase, Pick<HttpClientState, "middlewares">> {
  const limiter = new Bottleneck({
    minTime: options.minTimeMs,
    maxConcurrent: options.maxConcurrent ?? null,
  });
  const rateLimitMiddleware: HttpMiddleware = (request, next) => {
    return limiter.schedule(() => {
      return next(request);
    });
  };
  return (base) => {
    return {
      state: {
        middlewares: [...(base.getMiddlewares() ?? []), rateLimitMiddleware],
      },
    };
  };
}
