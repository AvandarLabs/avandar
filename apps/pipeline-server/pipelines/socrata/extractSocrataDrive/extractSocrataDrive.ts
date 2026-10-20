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
}>;

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
  return {
    results,
    rawCount: results.length + skippedResults.length,
    resultSetSize,
  };
}

async function* _pagesFrom(
  args: ExtractSocrataDriveArgs & Readonly<{ offset: number }>,
): AsyncGenerator<readonly SocrataDiscoveryResult[]> {
  const limit = Math.min(SOCRATA_PAGE_SIZE, SOCRATA_MAX_RESULTS - args.offset);
  const { results, rawCount, resultSetSize } = await _fetchPage({
    ...args,
    limit,
  });
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
  });
}

/**
 * Pages through one Socrata drive's datasets, least recently updated first.
 * The Discovery API has no date filter, so the window is applied here: a
 * result before `since` is skipped, and the crawl stops at the first result
 * at or after `until`. A result that failed validation is logged with
 * `console.warn` and left out.
 *
 * @throws When the drive has more results than the Discovery API can page.
 */
export function extractSocrataDrive(
  args: ExtractSocrataDriveArgs,
): AsyncGenerator<readonly SocrataDiscoveryResult[]> {
  return _pagesFrom({ ...args, offset: 0 });
}
