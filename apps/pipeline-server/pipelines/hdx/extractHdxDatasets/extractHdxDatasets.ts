import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import type { EtlRunWindow } from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  CkanDatasetSearchCursor,
  CkanDatasetSearchPage,
  CkanDiscoveryClient,
} from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";

/** CKAN's largest `package_search` page. */
export const HDX_PAGE_SIZE = 1000;

type _ExtractArgs = Readonly<{
  drive: Readonly<HdxDrive>;
  window: EtlRunWindow;
  discovery: CkanDiscoveryClient;
  pageSize: number;
}>;

/** One page's new datasets, and where the next page starts. */
type _FetchedPage = Readonly<{
  datasets: readonly CkanPackage[];
  /** `undefined` when this was the last page. */
  nextCursor: CkanDatasetSearchCursor | undefined;
}>;

/**
 * Whether `position` sorts strictly after `cursor` in `package_search`'s
 * `metadata_modified asc, name asc` order. Names compare by code unit, which
 * matches Solr's byte order for CKAN's lowercase ASCII slugs.
 */
function _isAfterCursor(
  position: CkanDatasetSearchCursor,
  cursor: CkanDatasetSearchCursor | undefined,
): boolean {
  if (cursor === undefined) {
    return true;
  }
  const time = position.modifiedAt.getTime();
  const cursorTime = cursor.modifiedAt.getTime();
  return (
    time > cursorTime ||
    (time === cursorTime && position.name > cursor.name)
  );
}

function _warnAboutSkippedDatasets(
  drive: Readonly<HdxDrive>,
  page: CkanDatasetSearchPage,
): void {
  page.skippedDatasets.forEach((skipped) => {
    console.warn(
      `[hdx] drive ${drive.baseUrl}: skipped dataset ${skipped.name}: ${skipped.reason}`,
    );
  });
}

/**
 * Warns when a crawl from the start gets a short, non-empty first page. HDX
 * holds far more datasets than one page, so that suggests a server whose
 * `rows_max` is below the page size, which would end the crawl there
 * silently. A window with a lower bound often holds less than a page, so it
 * is not warned about.
 */
function _warnIfFirstPageIsShort(
  args: _ExtractArgs,
  page: CkanDatasetSearchPage,
): void {
  const isCrawlFromStart = args.window.since === undefined;
  const isShortPage = page.resultCount < args.pageSize;
  if (isCrawlFromStart && isShortPage && page.nextCursor !== undefined) {
    console.warn(
      `[hdx] drive ${args.drive.baseUrl}: the first page held ` +
        `${String(page.resultCount)} of ${String(args.pageSize)} rows, so ` +
        "the crawl ends there. If the server caps rows per request below " +
        "that, the rest of the window was not read.",
    );
  }
}

/**
 * Fetches the page after `cursor` and keeps only its datasets strictly after
 * the cursor.
 *
 * @throws When a full page does not move the cursor forward.
 */
async function _fetchPageAfter(
  args: _ExtractArgs,
  cursor: CkanDatasetSearchCursor | undefined,
): Promise<_FetchedPage> {
  const page = await args.discovery.searchDatasets({
    baseUrl: args.drive.baseUrl,
    modifiedSince: args.window.since,
    modifiedBefore: args.window.until,
    after: cursor,
    rows: args.pageSize,
  });
  _warnAboutSkippedDatasets(args.drive, page);
  if (cursor === undefined) {
    _warnIfFirstPageIsShort(args, page);
  }
  const isFullPage = page.resultCount === args.pageSize;
  const { nextCursor } = page;
  if (
    isFullPage &&
    (nextCursor === undefined || !_isAfterCursor(nextCursor, cursor))
  ) {
    throw new Error(
      `HDX drive ${args.drive.baseUrl} returned a full page with nothing after ` +
        `${cursor?.name ?? "the start"}, so it stopped instead of ` +
        "requesting the same page again.",
    );
  }
  return {
    datasets: page.datasets.filter((ckanPackage) => {
      const position = {
        modifiedAt: getHdxDatasetTimestamp(ckanPackage),
        name: ckanPackage.name,
      };
      return _isAfterCursor(position, cursor);
    }),
    nextCursor: isFullPage ? nextCursor : undefined,
  };
}

async function* _pages(
  args: _ExtractArgs,
): AsyncGenerator<readonly CkanPackage[]> {
  let cursor: CkanDatasetSearchCursor | undefined = undefined;
  // Sequential on purpose: each request starts after the previous page's
  // cursor, and a loop holds only the current page, so a page is released
  // as soon as the engine has loaded it.
  do {
    const page = await _fetchPageAfter(args, cursor);
    yield page.datasets;
    cursor = page.nextCursor;
  } while (cursor !== undefined);
}

/**
 * Pages through one HDX drive's datasets, least recently modified first,
 * inside the window. Each page after the first asks for the datasets
 * strictly after the previous page's last `(metadata_modified, name)` pair,
 * so a dataset modified mid-crawl is neither skipped nor repeated. A
 * dataset that failed validation is logged with `console.warn` and left
 * out, and paging still moves past it. A short first page on a crawl from
 * the start is logged too, since a server row cap below the page size would
 * end the crawl there.
 *
 * @throws When a full page has nothing after the cursor, which would
 * otherwise request the same page forever.
 */
export function extractHdxDatasets(args: {
  drive: Readonly<HdxDrive>;
  window: EtlRunWindow;
  discovery: CkanDiscoveryClient;
  pageSize?: number;
}): AsyncGenerator<readonly CkanPackage[]> {
  return _pages({
    drive: args.drive,
    window: args.window,
    discovery: args.discovery,
    pageSize: args.pageSize ?? HDX_PAGE_SIZE,
  });
}
