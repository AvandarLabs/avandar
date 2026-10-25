import type { Mixin } from "@avandar/modules";
import type {
  HttpClientState,
  HttpMiddleware,
  HttpMiddlewareRequest,
} from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

type _RetryBase = {
  getMiddlewares(): HttpClientState["middlewares"];
};

type _RetryOptions = Readonly<{
  maxRetries: number;
  initialDelayMs: number;
  sleep: (ms: number) => Promise<void>;
}>;

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function _sendWithRetries(args: {
  request: Readonly<HttpMiddlewareRequest>;
  next: (request: Readonly<HttpMiddlewareRequest>) => Promise<Response>;
  options: _RetryOptions;
  attempt: number;
}): Promise<Response> {
  const response = await args.next(args.request);
  if (response.status !== 429 || args.attempt >= args.options.maxRetries) {
    return response;
  }
  await response.body?.cancel();
  await args.options.sleep(args.options.initialDelayMs * 2 ** args.attempt);
  return _sendWithRetries({ ...args, attempt: args.attempt + 1 });
}

/**
 * Retries a request answered with HTTP 429, waiting `initialDelayMs` and
 * doubling the wait after each retry. For APIs that rate-limit without a
 * `Retry-After` header. Any other status passes through untouched.
 *
 * Apply it before `withRateLimit`, so each retry is scheduled through the
 * rate limiter like any other request.
 *
 * @param options.maxRetries - Retries after the first attempt.
 * @param options.initialDelayMs - The wait before the first retry.
 * @param options.sleep - Replaces the timer, for tests.
 * @returns The mixin.
 */
export function withRetryOnTooManyRequests(options: {
  maxRetries: number;
  initialDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}): Mixin<_RetryBase, Pick<HttpClientState, "middlewares">> {
  const retryOptions: _RetryOptions = {
    maxRetries: options.maxRetries,
    initialDelayMs: options.initialDelayMs,
    sleep: options.sleep ?? _sleep,
  };
  const retryMiddleware: HttpMiddleware = (request, next) => {
    return _sendWithRetries({
      request,
      next,
      options: retryOptions,
      attempt: 0,
    });
  };
  return (base) => {
    return {
      state: {
        middlewares: [...(base.getMiddlewares() ?? []), retryMiddleware],
      },
    };
  };
}
