import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** A listing's column type sample and the token that vouches for it. */
export type OpenDataColumnTypeSample = Readonly<{
  csvText: string;
  token: string;
}>;

/** The open-data edge function's URL for one catalog listing. */
export function buildOpenDataListingUrl(
  catalogListingId: DataCatalogListing.Id,
): string {
  return (
    `${AvaSupabase.getEdgeFunctionsURL()}/open-data/data-catalog-listings/` +
    encodeURIComponent(catalogListingId)
  );
}

/**
 * Reads the current session's access token.
 *
 * @throws When no one is signed in.
 */
export async function readOpenDataAccessToken(): Promise<string> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to read open data");
  }
  return accessToken;
}

/** Attempts, including the first, when a gateway rejects the sample. */
const SAMPLE_FETCH_ATTEMPTS = 3;

/** Wait before the first retry. Each later retry waits twice as long. */
const SAMPLE_RETRY_DELAY_MS = 200;

/**
 * How long a sample that was just read is reused. The server's token lasts
 * 15 minutes, so this stops short of that and a write-back still presents
 * a token the server will accept.
 */
const SAMPLE_REUSE_MS = 14 * 60 * 1000;

/**
 * Statuses that mean the sample was rejected before it was read: our edge
 * function reports an unreachable source as 502, and a proxy in front of it
 * may answer 503 or 504 itself. A 409 names the dataset and is not retried.
 */
const RETRYABLE_SAMPLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

/** A sample read the server answered, but not with the sample. */
class ColumnTypeSampleRequestFailed extends Error {
  readonly status: number;

  constructor(status: number, code: string | undefined) {
    const codeNote = code === undefined ? "" : ` (${code})`;
    super(`Column type sample fetch failed: ${status}${codeNote}`);
    this.name = "ColumnTypeSampleRequestFailed";
    this.status = status;
  }
}

type SampleReadOptions = {
  accessToken?: string;
  /** Replaces the wait between retries, for tests. */
  sleep?: (delayMs: number) => Promise<void>;
};

type RememberedSample = {
  sample: OpenDataColumnTypeSample;
  rememberUntilMs: number;
};

const samplesInFlight = new Map<
  DataCatalogListing.Id,
  Promise<OpenDataColumnTypeSample>
>();

const rememberedSamples = new Map<DataCatalogListing.Id, RememberedSample>();

/**
 * Drops samples this page has already read, so the next read fetches again.
 * A test of a later failure calls it between cases. The preview and the
 * column-type check do not: they share one read on purpose.
 */
export function clearOpenDataColumnTypeSampleCache(): void {
  samplesInFlight.clear();
  rememberedSamples.clear();
}

function _sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function _isRetryableSampleFailure(error: unknown): boolean {
  return (
    error instanceof ColumnTypeSampleRequestFailed &&
    RETRYABLE_SAMPLE_STATUSES.has(error.status)
  );
}

/** The failure code a refused sample response names, if it names one. */
async function _readSampleFailureCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const body = (await response.json()) as {
      error?: { code?: unknown };
    };
    return typeof body.error?.code === "string" ? body.error.code : undefined;
  } catch {
    return undefined;
  }
}

async function _readSampleOnce(
  catalogListingId: DataCatalogListing.Id,
  accessToken: string,
): Promise<OpenDataColumnTypeSample> {
  const response = await fetch(
    `${buildOpenDataListingUrl(catalogListingId)}/column-type-sample`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new ColumnTypeSampleRequestFailed(
      response.status,
      await _readSampleFailureCode(response),
    );
  }
  return {
    token: response.headers.get("X-Ava-Column-Type-Token") ?? "",
    csvText: await response.text(),
  };
}

/**
 * Reads a sample, trying a gateway rejection again. A refusal that names the
 * dataset is returned as the failure of the first read.
 */
async function _readSampleWithRetries(
  catalogListingId: DataCatalogListing.Id,
  accessToken: string,
  sleep: (delayMs: number) => Promise<void>,
): Promise<OpenDataColumnTypeSample> {
  let attempt = 0;
  for (;;) {
    try {
      return await _readSampleOnce(catalogListingId, accessToken);
    } catch (error) {
      if (
        !_isRetryableSampleFailure(error) ||
        attempt >= SAMPLE_FETCH_ATTEMPTS - 1
      ) {
        throw error;
      }
      await sleep(SAMPLE_RETRY_DELAY_MS * 2 ** attempt);
      attempt += 1;
    }
  }
}

/**
 * Reads the start of an API-backed CSV listing's data through the open-data
 * edge function: the first rows of a Socrata export, or the first megabytes
 * of a CKAN file cut back to a whole line. `fetch` returns plain text.
 *
 * A gateway rejection (502, 503, or 504) is tried up to three times. Any
 * other refusal is final, and may mark the listing invalid on the server.
 * Overlapping callers for one listing, such as its preview and its
 * column-type check, share the read, including one that succeeded within
 * the last 14 minutes.
 *
 * @param catalogListingId The listing.
 * @param options.accessToken The caller's token, when it is already read.
 * @param options.sleep Replaces the wait between retries, for tests.
 * @throws When the sample cannot be read, naming the server's failure code.
 */
export async function fetchOpenDataColumnTypeSample(
  catalogListingId: DataCatalogListing.Id,
  options: SampleReadOptions = {},
): Promise<OpenDataColumnTypeSample> {
  const remembered = rememberedSamples.get(catalogListingId);
  if (remembered !== undefined && remembered.rememberUntilMs > Date.now()) {
    return remembered.sample;
  }
  const inFlight = samplesInFlight.get(catalogListingId);
  if (inFlight !== undefined) {
    return await inFlight;
  }
  const pending = _readAndRememberSample(catalogListingId, options);
  samplesInFlight.set(catalogListingId, pending);
  try {
    return await pending;
  } finally {
    if (samplesInFlight.get(catalogListingId) === pending) {
      samplesInFlight.delete(catalogListingId);
    }
  }
}

async function _readAndRememberSample(
  catalogListingId: DataCatalogListing.Id,
  options: SampleReadOptions,
): Promise<OpenDataColumnTypeSample> {
  const accessToken = options.accessToken ?? (await readOpenDataAccessToken());
  const sample = await _readSampleWithRetries(
    catalogListingId,
    accessToken,
    options.sleep ?? _sleep,
  );
  rememberedSamples.set(catalogListingId, {
    sample,
    rememberUntilMs: Date.now() + SAMPLE_REUSE_MS,
  });
  return sample;
}
