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

type _PageArgs = Readonly<{
  drive: Readonly<HdxDrive>;
  window: EtlRunWindow;
  discovery: CkanDiscoveryClient;
  pageSize: number;
  cursor: CkanDatasetSearchCursor | undefined;
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

async function* _pagesAfter(
  args: _PageArgs,
): AsyncGenerator<readonly CkanPackage[]> {
  const page = await args.discovery.searchDatasets({
    baseUrl: args.drive.baseUrl,
    modifiedSince: args.window.since,
    modifiedBefore: args.window.until,
    after: args.cursor,
    rows: args.pageSize,
  });
  _warnAboutSkippedDatasets(args.drive, page);
  const isFullPage = page.resultCount === args.pageSize;
  const { nextCursor } = page;
  if (
    isFullPage &&
    (nextCursor === undefined || !_isAfterCursor(nextCursor, args.cursor))
  ) {
    throw new Error(
      `HDX drive ${args.drive.baseUrl} returned a full page with nothing after ` +
        `${args.cursor?.name ?? "the start"}, so it stopped instead of ` +
        "requesting the same page again.",
    );
  }
  yield page.datasets.filter((ckanPackage) => {
    const position = {
      modifiedAt: getHdxDatasetTimestamp(ckanPackage),
      name: ckanPackage.name,
    };
    return _isAfterCursor(position, args.cursor);
  });
  if (!isFullPage || nextCursor === undefined) {
    return;
  }
  yield* _pagesAfter({ ...args, cursor: nextCursor });
}

/**
 * Pages through one HDX drive's datasets, least recently modified first,
 * inside the window. Each page after the first asks for the datasets
 * strictly after the previous page's last `(metadata_modified, name)` pair,
 * so a dataset modified mid-crawl is neither skipped nor repeated. A
 * dataset that failed validation is logged with `console.warn` and left
 * out, and paging still moves past it.
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
  return _pagesAfter({
    drive: args.drive,
    window: args.window,
    discovery: args.discovery,
    pageSize: args.pageSize ?? HDX_PAGE_SIZE,
    cursor: undefined,
  });
}
