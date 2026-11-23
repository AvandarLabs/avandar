import { match } from "ts-pattern";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  FreshnessProbe,
  FreshnessProbeProblem,
} from "$/connectors/open-data/readFreshnessProbeToken/readFreshnessProbeToken.types.ts";

/** The largest body a probe reads. A whole GHO country list is 31 KB. */
const FRESHNESS_PROBE_MAX_BYTES = 1024 * 1024;

function _fail(problem: FreshnessProbeProblem): never {
  throw new OpenDataAcquisitionFailed({
    code: "freshness-probe-invalid",
    problem,
  });
}

/**
 * Whether a probe URL may be fetched: `https`, and under the drive's base
 * URL, so a bad listing row never sends the request to another host.
 */
function _isAllowedProbeUrl(url: string, apiBaseUrl: string): boolean {
  return url.startsWith("https://") && url.startsWith(`${apiBaseUrl}/`);
}

async function _sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

function _parseJson(bytes: Uint8Array<ArrayBuffer>): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return _fail("body-not-json");
  }
}

function _readPath(
  body: unknown,
  path: ReadonlyArray<string | number>,
): unknown {
  return path.reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    return (current as Record<string | number, unknown>)[key];
  }, body);
}

function _readJsonPathsToken(
  bytes: Uint8Array<ArrayBuffer>,
  paths: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  const body = _parseJson(bytes);
  return paths
    .map((path) => {
      const value = _readPath(body, path);
      if (value === undefined || value === null) {
        return _fail("path-missing");
      }
      return typeof value === "string" ? value : JSON.stringify(value);
    })
    .join("|");
}

/**
 * Reads the freshness token a listing's own probe describes: one GET of a
 * small response, turned into a token by the probe's rule.
 *
 * Every reader of a listing's freshness must call this one function, such as
 * the edge function's freshness check and the Parquet copy builder, because a
 * copy records the token it was built from and is called stale whenever a
 * later token differs.
 *
 * @param params.probe - The listing's probe.
 * @param params.apiBaseUrl - The listing's drive. The probe URL must be under
 *   it.
 * @param params.http - Reads the probe's body.
 * @returns The token.
 * @throws `OpenDataAcquisitionFailed` with `freshness-probe-invalid` when the
 * URL is not allowed, the body is over 1 MB, or the body does not fit the
 * probe's rule. An HTTP failure is thrown as the client threw it.
 */
export async function readFreshnessProbeToken(
  params: Readonly<{
    probe: Readonly<FreshnessProbe>;
    apiBaseUrl: string;
    http: Readonly<OpenDataHttp>;
  }>,
): Promise<string> {
  const { probe } = params;
  if (!_isAllowedProbeUrl(probe.url, params.apiBaseUrl)) {
    return _fail("url-not-allowed");
  }
  const bytes = await params.http.getBytes(probe.url);
  if (bytes.byteLength > FRESHNESS_PROBE_MAX_BYTES) {
    return _fail("body-too-large");
  }
  return await match(probe.token)
    .with({ kind: "json-paths" }, async (rule) => {
      return _readJsonPathsToken(bytes, rule.paths);
    })
    .with({ kind: "body-sha256" }, async () => {
      return await _sha256Hex(bytes);
    })
    .exhaustive();
}
