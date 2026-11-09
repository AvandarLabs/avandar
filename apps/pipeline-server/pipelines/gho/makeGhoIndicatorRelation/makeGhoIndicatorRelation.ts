import { GhoDimensionIds } from "@pipelines/gho/GhoDimensionIds";
import { GHO_FACT_COLUMNS } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import type {
  ApiResourceRelation,
  CatalogMappedFields,
  ListingCompanion,
} from "@avandar/etl";
import type {
  GhoCrawlDrive,
  GhoIndicatorConnection,
  GhoIndicatorProbeRow,
} from "@pipelines/gho/gho.types";

/** The format every GHO listing is read as: GHO's OData JSON. */
export const GHO_API_RESOURCE_FORMAT = "ODATA";

/** The tag on an indicator GHO has archived ("Archived, see ..."). */
const ARCHIVED_TAG = "Archived";

/**
 * The columns holding a dimension's codes, each with the column that names
 * which dimension a row's code is from. A row's `SpatialDim` can be a
 * country on one row and a region on the next, so a join needs both.
 */
const CODE_COLUMNS: ReadonlyArray<
  Readonly<{ column: string; typeColumn: keyof GhoIndicatorProbeRow }>
> = [
  { column: "SpatialDim", typeColumn: "SpatialDimType" },
  { column: "Dim1", typeColumn: "Dim1Type" },
  { column: "Dim2", typeColumn: "Dim2Type" },
  { column: "Dim3", typeColumn: "Dim3Type" },
  { column: "DataSourceDim", typeColumn: "DataSourceDimType" },
];

/**
 * A `lookup` companion for each dimension a code column holds in the probed
 * rows. A column's dimensions are ordered by code, so the order of the rows
 * never changes the listing.
 */
function _buildCompanions(
  probeRows: readonly GhoIndicatorProbeRow[],
): ListingCompanion[] {
  return CODE_COLUMNS.flatMap(({ column, typeColumn }) => {
    const dimensionCodes = new Set(
      probeRows.flatMap((row) => {
        const dimensionCode = row[typeColumn];
        return dimensionCode ? [dimensionCode] : [];
      }),
    );
    return [...dimensionCodes].sort().map((dimensionCode) => {
      return {
        kind: "lookup" as const,
        externalDatasetId: GhoDimensionIds.toExternalDatasetId(dimensionCode),
        apiResourceId: GhoDimensionIds.toApiResourceId(dimensionCode),
        joinOn: [
          { column: typeColumn, companionColumn: "Dimension" },
          { column, companionColumn: "Code" },
        ],
      };
    });
  });
}

/** The newest `Date` among the probed rows, or `undefined` when none has. */
function _getNewestDate(
  probeRows: readonly GhoIndicatorProbeRow[],
): Date | undefined {
  const times = probeRows.flatMap((row) => {
    const time = row.Date === null ? Number.NaN : Date.parse(row.Date);
    return Number.isNaN(time) ? [] : [time];
  });
  return times.length === 0 ? undefined : new Date(Math.max(...times));
}

function _buildTags(
  connection: GhoIndicatorConnection,
  mappedTags: readonly string[] | undefined,
): readonly string[] | undefined {
  if (!connection.name.startsWith(ARCHIVED_TAG)) {
    return mappedTags;
  }
  return [...(mappedTags ?? []), ARCHIVED_TAG];
}

/**
 * Builds the one relation a probed GHO indicator becomes: a listing whose
 * rows are read whole from `<baseUrl>/<code>` as OData JSON.
 *
 * Its columns are GHO's declared fact columns, so its types are verified.
 * An indicator with no rows, or whose schema no longer matches
 * `GHO_FACT_COLUMNS`, is listed as not loadable, keeping its row count in
 * `metadata.row_count`. The dimensions its code columns hold in the probed
 * rows become `lookup` companions, and its freshness probe reads its newest
 * row's `Date` and its row count.
 *
 * @param params.drive - The drive as this run crawls it.
 * @param params.connection - The probed indicator.
 * @param params.mappedFields - The indicator's mapped catalog metadata,
 *   which must name its level 1 organization.
 */
export function makeGhoIndicatorRelation(
  params: Readonly<{
    drive: GhoCrawlDrive;
    connection: GhoIndicatorConnection;
    mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
  }>,
): ApiResourceRelation {
  const { drive, connection } = params;
  const indicatorUrl = `${drive.baseUrl}/${connection.code}`;
  const isLoadable = connection.rowCount > 0 && connection.hasFactSchema;
  const tags = _buildTags(connection, params.mappedFields.tags);
  return {
    ...params.mappedFields,
    ...(tags === undefined ? {} : { tags }),
    kind: "api_resource",
    externalDatasetId: connection.code,
    apiResourceId: connection.code,
    apiResourceFormat: GHO_API_RESOURCE_FORMAT,
    sourceAssetType: "indicator",
    displayName: connection.name,
    sourceUrl: indicatorUrl,
    sourceUpdatedAt: _getNewestDate(connection.probeRows),
    metadata: { row_count: connection.rowCount },
    ...(isLoadable ? {} : { isWorkspaceLoadable: false }),
    ...(connection.hasFactSchema
      ? { columns: GHO_FACT_COLUMNS, columnTypesVerifiedAt: drive.checkedAt }
      : { columns: [] }),
    companions: _buildCompanions(connection.probeRows),
    freshnessProbe: {
      url: `${indicatorUrl}?$orderby=Date%20desc&$top=1&$select=Date&$count=true`,
      token: {
        kind: "json-paths",
        paths: [["value", 0, "Date"], ["@odata.count"]],
      },
    },
  };
}
