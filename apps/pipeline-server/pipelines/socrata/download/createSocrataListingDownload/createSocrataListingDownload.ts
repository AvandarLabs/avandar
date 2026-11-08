import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata";
import { z } from "zod";
import type {
  DownloadableListing,
  DuckDbSniffableDataType,
  ListingDownloadColumn,
  ListingDownloadScript,
} from "@avandar/etl";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";

/** Socrata's row id, which every dataset has and pages are ordered by. */
const ROW_ID_COLUMN = ":id";

/**
 * The DuckDB type each Socrata column type is read as. Any type not listed,
 * such as `text`, `url`, or a geometry, is read as text.
 */
const SOCRATA_TYPE_TO_DUCKDB: Readonly<
  Record<string, DuckDbSniffableDataType>
> = {
  checkbox: "BOOLEAN",
  number: "DOUBLE",
  double: "DOUBLE",
  money: "DOUBLE",
  percent: "DOUBLE",
  calendar_date: "TIMESTAMP",
  floating_timestamp: "TIMESTAMP",
  fixed_timestamp: "TIMESTAMP",
};

/** The parts of a dataset's `/api/views/<id>.json` a download reads. */
const SocrataViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowsUpdatedAt: z.number().optional(),
  viewLastModified: z.number().optional(),
  columns: z.array(
    z.object({
      fieldName: z.string(),
      dataTypeName: z.string(),
      flags: z.array(z.string()).optional(),
    }),
  ),
});

type SocrataView = z.infer<typeof SocrataViewSchema>;

function _trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * The columns a dataset's CSV export holds, typed from its schema. System
 * and computed region columns (named with a leading `:`) and hidden columns
 * are not exported.
 */
function _toExportedColumns(view: SocrataView): ListingDownloadColumn[] {
  return view.columns
    .filter((column) => {
      return (
        !column.fieldName.startsWith(":") &&
        !(column.flags ?? []).includes("hidden")
      );
    })
    .map((column) => {
      return {
        name: column.fieldName,
        dataType: SOCRATA_TYPE_TO_DUCKDB[column.dataTypeName] ?? "VARCHAR",
      };
    });
}

function _toSourceVersion(view: SocrataView): string | undefined {
  return makeSourceVersionFromSocrataViewMetadata({
    id: view.id,
    name: view.name,
    rowsUpdatedAt: view.rowsUpdatedAt,
    viewLastModified: view.viewLastModified,
  });
}

/** A SoQL text literal, with its single quotes doubled. */
function _toSoqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function _buildPageUrl(args: {
  resourceUrl: string;
  columns: readonly ListingDownloadColumn[];
  pageRows: number;
  afterCursor: string | undefined;
}): string {
  const columnNames = args.columns.map((column) => {
    return column.name;
  });
  const query = [
    ["$select", [ROW_ID_COLUMN, ...columnNames].join(",")],
    ["$order", ROW_ID_COLUMN],
    ["$limit", String(args.pageRows)],
    ...(args.afterCursor === undefined
      ? []
      : [["$where", `${ROW_ID_COLUMN} > ${_toSoqlText(args.afterCursor)}`]]),
  ];
  const queryText = query
    .map(([name, value]) => {
      return `${encodeURIComponent(name!)}=${encodeURIComponent(value!)}`;
    })
    .join("&");
  return `${args.resourceUrl}?${queryText}`;
}

/**
 * Creates the Socrata pipeline's download script. A Socrata dataset is
 * downloaded in pages of its CSV export, each asking for the rows after the
 * previous page's last row id. Paging by row id, rather than by `$offset`,
 * stays fast however deep into a dataset of hundreds of millions of rows it
 * reaches. Each column's type comes from the dataset's schema, which
 * Socrata enforces on every row.
 *
 * @param args.http - Reads each dataset's metadata from its own portal.
 * @returns The download script.
 */
export function createSocrataListingDownload(
  args: Readonly<{ http: OpenDataHttp }>,
): ListingDownloadScript {
  const readView = async (
    listing: DownloadableListing,
  ): Promise<SocrataView> => {
    const root = _trimTrailingSlash(listing.apiBaseUrl);
    return SocrataViewSchema.parse(
      await args.http.get(
        `${root}/api/views/${listing.externalDatasetId}.json`,
      ),
    );
  };

  return async ({ listing, pageRows }) => {
    if (pageRows === undefined) {
      throw new Error("A Socrata download pages, so it needs pageRows.");
    }
    const view = await readView(listing);
    const columns = _toExportedColumns(view);
    const root = _trimTrailingSlash(listing.apiBaseUrl);
    const resourceUrl = `${root}/resource/${listing.externalDatasetId}.csv`;
    return {
      paging: true,
      sourceVersion: _toSourceVersion(view),
      columns,
      cursorColumn: ROW_ID_COLUMN,
      buildPageUrl: (afterCursor) => {
        return _buildPageUrl({ resourceUrl, columns, pageRows, afterCursor });
      },
      readSourceVersion: async () => {
        return _toSourceVersion(await readView(listing));
      },
    };
  };
}
