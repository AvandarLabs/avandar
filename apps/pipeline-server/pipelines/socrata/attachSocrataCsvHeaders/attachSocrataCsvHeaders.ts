import { promiseMap, promiseMapSequential } from "@avandar/utils";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";
import type { SocrataCsvHeaderReader } from "@pipelines/socrata/createSocrataCsvHeaderReader/createSocrataCsvHeaderReader";

/** How many CSV header requests one page sends at a time. */
export const CSV_HEADER_REQUESTS_AT_ONCE = 8;

/** A discovered dataset and the header of its CSV export. */
export type SocrataDataset = SocrataDiscoveryResult &
  Readonly<{
    /** `undefined` when the dataset has no CSV export to read. */
    csvHeader: readonly string[] | undefined;
  }>;

/**
 * Whether the Discovery API lists any column a CSV export could have. A
 * file or a link has none, and asking for its export only gets a 403.
 */
function _hasTabularColumns(result: SocrataDiscoveryResult): boolean {
  return result.columns.some((column) => {
    return !column.fieldName.startsWith(":");
  });
}

async function _attachToPage(args: {
  page: readonly SocrataDiscoveryResult[];
  drive: Readonly<ConfiguredDrive>;
  readCsvHeader: SocrataCsvHeaderReader;
}): Promise<SocrataDataset[]> {
  const batches: SocrataDiscoveryResult[][] = [];
  for (
    let start = 0;
    start < args.page.length;
    start += CSV_HEADER_REQUESTS_AT_ONCE
  ) {
    batches.push(args.page.slice(start, start + CSV_HEADER_REQUESTS_AT_ONCE));
  }
  const datasetBatches = await promiseMapSequential(batches, (batch) => {
    return promiseMap(batch, async (result) => {
      const csvHeader = _hasTabularColumns(result)
        ? await args.readCsvHeader({
            drive: args.drive,
            datasetId: result.datasetId,
          })
        : undefined;
      return { ...result, csvHeader };
    });
  });
  return datasetBatches.flat();
}

/**
 * Adds each dataset's CSV export header to every page a Socrata crawl
 * yields, keeping the page's order. Up to `CSV_HEADER_REQUESTS_AT_ONCE`
 * headers are requested at a time. A dataset whose discovered columns are
 * all system fields is not asked.
 *
 * @param args.pages - The crawl's pages.
 * @param args.drive - The drive the pages come from.
 * @param args.readCsvHeader - Reads one dataset's CSV header.
 */
export async function* attachSocrataCsvHeaders(args: {
  pages: AsyncIterable<readonly SocrataDiscoveryResult[]>;
  drive: Readonly<ConfiguredDrive>;
  readCsvHeader: SocrataCsvHeaderReader;
}): AsyncGenerator<readonly SocrataDataset[]> {
  for await (const page of args.pages) {
    yield await _attachToPage({ ...args, page });
  }
}
