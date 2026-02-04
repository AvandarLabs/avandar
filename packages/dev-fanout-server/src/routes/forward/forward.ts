import { isArray } from "$/lib/utils/guards/isArray";
import { isDefined } from "$/lib/utils/guards/isDefined";
import { objectValuesMap } from "$/lib/utils/objects/objectValuesMap";
import { NgrokDevURLsManager } from "../../NgrokDevURLsManager";
import type { FastifyReply, FastifyRequest } from "fastify";

type FanoutResult = Readonly<{
  devURL: string;
  forwardURL: string;
  ok: boolean;
  status?: number;
  error?: string;
}>;

type FanoutExecutionResult = Readonly<{
  result: FanoutResult;
  shouldMarkAccessed: boolean;
}>;

type RequestInfo = Readonly<{
  method: string;
  pathname: string;
  search: string;
  headers: Record<string, unknown>;
  body?: Buffer;
}>;

function _shouldMarkAccessedFromStatus(status: number): boolean {
  // ngrok commonly returns 502 when the tunnel target is unavailable
  const unreachableStatuses: Set<number> = new Set([502, 503, 504]);
  return !unreachableStatuses.has(status);
}

function _removeForwardPrefix(pathname: string): string {
  if (pathname === "/forward") {
    return "/";
  }

  if (pathname.startsWith("/forward/")) {
    return pathname.slice("/forward".length);
  }

  return pathname;
}

/**
 *
 * Joins two URL paths together
 * e.g. "/foo/bar" and "/baz/qux" -> "/foo/bar/baz/qux"
 * and removes trailing slashes
 * @param options The options to join the paths
 * @param options.basePath The base path to join the suffix path to
 * @param options.suffixPath The suffix path to join to the base path
 * @returns The joined path
 */
function _joinURLPaths(options: {
  basePath: string;
  suffixPath: string;
}): string {
  const { basePath, suffixPath } = options;
  const normalizedBase: string =
    basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  const normalizedSuffix: string = suffixPath.replace(/^\/+/, "");
  const joinedPath: string = `${normalizedBase}/${normalizedSuffix}`;
  if (joinedPath === "/") {
    return joinedPath;
  }
  return joinedPath.replace(/\/+$/, "");
}

function _buildForwardedRequestHeaders(options: {
  readonly headers: Record<string, unknown>;
}): Record<string, string> {
  // headers that we block from being forwarded
  const blocked: Set<string> = new Set([
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
  ]);

  return objectValuesMap(
    options.headers,
    (value, key) => {
      const lowerKey: string = key.toLowerCase();
      if (blocked.has(lowerKey)) {
        return undefined;
      }
      if (typeof value === "string") {
        return value;
      }
      if (isArray(value)) {
        const flattened = value
          .map((v) => {
            return typeof v === "string" ? v : undefined;
          })
          .filter(isDefined);
        return flattened.length > 0 ? flattened.join(",") : undefined;
      }
      return undefined;
    },
    { excludeUndefined: true },
  );
}

async function _sendForwardedRequest(options: {
  /**
   * The dev URL registered in the `ngrok-dev-urls.json` file that is used as
   * the base of the `forwardURL` parameter.
   */
  readonly devURL: string;
  /**
   * The full URL to forward the request to, including the full path and
   * search params.
   */
  readonly forwardURL: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: Buffer;
}): Promise<FanoutExecutionResult> {
  const { devURL, method, headers, forwardURL } = options;
  const isBodyAllowed: boolean = !["GET", "HEAD"].includes(method);
  const body: Buffer | undefined = isBodyAllowed ? options.body : undefined;

  try {
    // send the request to the target URL
    const res: Response = await fetch(forwardURL, {
      method,
      headers: {
        ...headers,
        "x-avandar-fanout": "1",
      },
      body,
      signal: AbortSignal.timeout(5_000),
    });

    return {
      shouldMarkAccessed: _shouldMarkAccessedFromStatus(res.status),
      result: {
        devURL,
        forwardURL,
        ok: res.ok,
        status: res.status,
      },
    };
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Unknown error";

    return {
      shouldMarkAccessed: false,
      result: {
        devURL,
        forwardURL,
        ok: false,
        error: message,
      },
    };
  }
}

async function _fanoutToDevURLs(options: {
  devTargets: ReadonlyArray<{ url: string }>;
  request: RequestInfo;
}): Promise<readonly FanoutExecutionResult[]> {
  const { devTargets, request } = options;
  const headers: Record<string, string> = _buildForwardedRequestHeaders({
    headers: request.headers,
  });

  const fanouts: Array<Promise<FanoutExecutionResult>> = devTargets.map(
    (target) => {
      // clone dev URL in order to append path + search params to it
      const forwardURL = new URL(target.url);
      forwardURL.pathname = _joinURLPaths({
        basePath: forwardURL.pathname,
        suffixPath: request.pathname,
      });
      forwardURL.search = request.search;

      return _sendForwardedRequest({
        devURL: target.url,
        forwardURL: forwardURL.toString(),
        headers,
        method: request.method,
        body: request.body,
      });
    },
  );

  return await Promise.all(fanouts);
}

export async function onFanoutRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  try {
    const devURLs = await NgrokDevURLsManager.readNgrokDevURLs();
    const body: Buffer | undefined =
      request.body instanceof Buffer ? request.body : undefined;

    // fastify request.url is just the part after the domain name, so we
    // pass 'localhost' as the 2nd argument to URL just so we can build
    // a URL object
    const parsedRequestURL = new URL(request.url, "http://localhost");
    const forwardedPathname: string = _removeForwardPrefix(
      parsedRequestURL.pathname,
    );
    const executions: readonly FanoutExecutionResult[] = await _fanoutToDevURLs(
      {
        devTargets: devURLs,
        request: {
          method: request.method,
          pathname: forwardedPathname,
          search: parsedRequestURL.search,
          headers: request.headers,
          body,
        },
      },
    );

    const urlsToMarkAccessed: readonly string[] = executions
      .filter((execution) => {
        return execution.shouldMarkAccessed;
      })
      .map((execution) => {
        return execution.result.devURL;
      });

    const uniqueURLsToMarkAccessed: readonly string[] = [
      ...new Set(urlsToMarkAccessed),
    ];
    await NgrokDevURLsManager.setLastAccessedDates({
      urls: uniqueURLsToMarkAccessed,
      lastAccessedDate: new Date().toISOString(),
    });

    return await reply.send({
      received: true,
      results: executions.map((execution) => {
        return execution.result;
      }),
    });
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Unknown error";

    return await reply.status(500).send({
      received: false,
      error: message,
    });
  }
}
