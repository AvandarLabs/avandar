import type { EtlRunWindow } from "@avandar/etl";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/** One Discovery API page. */
export const SOCRATA_PAGE_SIZE = 1000;

/**
 * How far each page reaches back into the one before it. A dataset modified
 * mid-crawl moves to the end of the ascending order and shifts every later
 * result one place earlier, which would skip a result at a page boundary.
 * The engine drops the repeats this causes.
 *
 * This assumes at most this many datasets shift between two page fetches,
 * and that the order of equal `updatedAt` values is stable enough between
 * requests. The overlap check in `extractSocrataDrive` turns a violation
 * into a failed drive rather than a silent gap.
 */
export const SOCRATA_PAGE_OVERLAP = 20;

/** The Discovery API rejects a request whose offset plus limit exceeds this. */
export const SOCRATA_MAX_RESULTS = 10_000;

type ExtractSocrataDriveArgs = Readonly<{
  drive: Readonly<ConfiguredDrive>;
  window: EtlRunWindow;
  discovery: SocrataDiscoveryClient;
}>;

/** One fetched page, with how many raw positions it covered. */
type SocrataRawPage = Readonly<{
  results: readonly SocrataDiscoveryResult[];
  /** Valid plus skipped results: the page's length in the server's order. */
  rawCount: number;
  resultSetSize: number;
  /** Every dataset id on the page, valid or skipped. */
  datasetIds: ReadonlySet<string>;
  /** The ids the next page must share at least one of. */
  overlapIds: ReadonlySet<string>;
}>;

/**
 * The ids of a page's last `SOCRATA_PAGE_OVERLAP` raw rows. The client does
 * not say where among the valid results a skipped one sat, so this takes the
 * last `SOCRATA_PAGE_OVERLAP` valid ids plus every skipped id: a small
 * superset whenever the page skipped a result.
 */
function _getOverlapIds(
  results: readonly SocrataDiscoveryResult[],
  skippedIds: readonly string[],
): ReadonlySet<string> {
  const tailIds = results.slice(-SOCRATA_PAGE_OVERLAP).map((result) => {
    return result.datasetId;
  });
  return new Set([...tailIds, ...skippedIds]);
}

/**
 * Fails the drive when a page shares no dataset with the previous page's
 * overlap. More datasets moved or were deleted between the two fetches than
 * the overlap covers, so some were skipped at the boundary, and the
 * high-water mark would move past them for good. The prefix already loaded
 * is complete, so the next run resumes safely. This is fail-safe on
 * purpose: it may also fail a drive where nothing was skipped, such as when
 * exactly the whole overlap moved.
 */
function _assertOverlapKept(args: {
  drive: Readonly<ConfiguredDrive>;
  offset: number;
  previousOverlapIds: ReadonlySet<string> | undefined;
  datasetIds: ReadonlySet<string>;
}): void {
  const { previousOverlapIds, datasetIds } = args;
  if (previousOverlapIds === undefined) {
    return;
  }
  const hasOverlap = [...previousOverlapIds].some((datasetId) => {
    return datasetIds.has(datasetId);
  });
  if (!hasOverlap) {
    throw new Error(
      `Socrata drive ${args.drive.baseUrl} lost its page overlap at offset ` +
        `${String(args.offset)}: more than ${String(SOCRATA_PAGE_OVERLAP)} ` +
        "datasets changed between page fetches, so some may have been missed.",
    );
  }
}

function _isBefore(
  result: SocrataDiscoveryResult,
  date: Date | undefined,
): boolean {
  return date !== undefined && Date.parse(result.updatedAt) < date.getTime();
}

function _takeBeforeUntil(
  results: readonly SocrataDiscoveryResult[],
  until: Date | undefined,
): SocrataDiscoveryResult[] {
  const firstAtOrAfter = results.findIndex((result) => {
    return until !== undefined && !_isBefore(result, until);
  });
  return firstAtOrAfter === -1 ?
      [...results]
    : results.slice(0, firstAtOrAfter);
}

/**
 * Fetches one page, fails a drive the Discovery API cannot page through, and
 * warns about each result that failed validation.
 */
async function _fetchPage(
  args: ExtractSocrataDriveArgs & Readonly<{ offset: number; limit: number }>,
): Promise<SocrataRawPage> {
  const { drive, offset, limit } = args;
  const { results, skippedResults, resultSetSize } =
    await args.discovery.search({
      domains: [new URL(drive.baseUrl).host],
      order: "updatedAt ASC",
      limit,
      offset,
    });
  if (resultSetSize > SOCRATA_MAX_RESULTS) {
    throw new Error(
      `Socrata drive ${drive.baseUrl} has ${String(resultSetSize)} results, over ` +
        `the Discovery API's ${String(SOCRATA_MAX_RESULTS)}-result paging limit.`,
    );
  }
  skippedResults.forEach((skipped) => {
    console.warn(
      `[socrata] drive ${drive.baseUrl}: skipped dataset ${skipped.datasetId ?? "(no id)"}: ${skipped.reason}`,
    );
  });
  const skippedIds = skippedResults.flatMap((skipped) => {
    return skipped.datasetId === undefined ? [] : [skipped.datasetId];
  });
  return {
    results,
    rawCount: results.length + skippedResults.length,
    resultSetSize,
    datasetIds: new Set([
      ...results.map((result) => {
        return result.datasetId;
      }),
      ...skippedIds,
    ]),
    overlapIds: _getOverlapIds(results, skippedIds),
  };
}

async function* _pagesFrom(
  args: ExtractSocrataDriveArgs &
    Readonly<{
      offset: number;
      previousOverlapIds: ReadonlySet<string> | undefined;
    }>,
): AsyncGenerator<readonly SocrataDiscoveryResult[]> {
  const limit = Math.min(SOCRATA_PAGE_SIZE, SOCRATA_MAX_RESULTS - args.offset);
  const page = await _fetchPage({ ...args, limit });
  _assertOverlapKept({ ...args, datasetIds: page.datasetIds });
  const { results, rawCount, resultSetSize } = page;
  // The engine filters by the window too. This filter exists so the crawl
  // can stop early at `until`.
  const afterSince = results.filter((result) => {
    return !_isBefore(result, args.window.since);
  });
  const inWindow = _takeBeforeUntil(afterSince, args.window.until);
  yield inWindow;
  const hasReachedUntil = inWindow.length < afterSince.length;
  // Paging advances by raw position, so a skipped result still counts.
  const isLastPage =
    rawCount < limit || args.offset + rawCount >= resultSetSize;
  if (hasReachedUntil || isLastPage) {
    return;
  }
  yield* _pagesFrom({
    ...args,
    offset: args.offset + rawCount - SOCRATA_PAGE_OVERLAP,
    previousOverlapIds: page.overlapIds,
  });
}

/**
 * Pages through one Socrata drive's datasets, least recently updated first.
 * The Discovery API has no date filter, so the window is applied here: a
 * result before `since` is skipped, and the crawl stops at the first result
 * at or after `until`. A result that failed validation is logged with
 * `console.warn` and left out.
 *
 * @throws When the drive has more results than the Discovery API can page,
 * or when a page shares no dataset with the previous page's overlap.
 */
export function extractSocrataDrive(
  args: ExtractSocrataDriveArgs,
): AsyncGenerator<readonly SocrataDiscoveryResult[]> {
  return _pagesFrom({ ...args, offset: 0, previousOverlapIds: undefined });
}
