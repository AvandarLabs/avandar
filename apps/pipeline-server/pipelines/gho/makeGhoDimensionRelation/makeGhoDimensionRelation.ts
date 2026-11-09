import { GhoDimensionIds } from "@pipelines/gho/GhoDimensionIds";
import { GHO_API_RESOURCE_FORMAT } from "@pipelines/gho/makeGhoIndicatorRelation/makeGhoIndicatorRelation";
import type {
  ApiResourceRelation,
  CatalogMappedFields,
  RelationColumn,
} from "@avandar/etl";
import type {
  GhoCrawlDrive,
  GhoDimensionConnection,
} from "@pipelines/gho/gho.types";

/**
 * The columns of every GHO dimension's value list
 * (`DIMENSION/<code>/DimensionValues`), all text. A GHO listing's download
 * reads a dimension listing's rows with these.
 */
export const GHO_DIMENSION_VALUE_COLUMNS: readonly RelationColumn[] = [
  "Code",
  "Title",
  "Dimension",
  "ParentDimension",
  "ParentCode",
  "ParentTitle",
].map((name) => {
  return { name, originalDataType: "Edm.String", castDataType: "VARCHAR" };
});

/**
 * Builds the one relation a probed GHO dimension becomes: a listing of its
 * value list, such as the country names an indicator's `SpatialDim` codes
 * stand for. An indicator names it as a companion by its API identity.
 *
 * Its six columns are always text, so its types are verified. An empty
 * dimension is listed as not loadable. A value list carries no modified
 * time, so its freshness probe hashes the whole list, which also notices a
 * renamed value.
 *
 * @param params.drive - The drive as this run crawls it.
 * @param params.connection - The probed dimension.
 * @param params.mappedFields - The dimension's mapped catalog metadata,
 *   which must name its level 1 organization.
 */
export function makeGhoDimensionRelation(
  params: Readonly<{
    drive: GhoCrawlDrive;
    connection: GhoDimensionConnection;
    mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
  }>,
): ApiResourceRelation {
  const { drive, connection } = params;
  const apiResourceId = GhoDimensionIds.toApiResourceId(connection.code);
  const valuesUrl = `${drive.baseUrl}/${apiResourceId}`;
  return {
    ...params.mappedFields,
    kind: "api_resource",
    externalDatasetId: GhoDimensionIds.toExternalDatasetId(connection.code),
    apiResourceId,
    apiResourceFormat: GHO_API_RESOURCE_FORMAT,
    sourceAssetType: "dimension",
    displayName: `${connection.title} (GHO dimension values)`,
    sourceUrl: valuesUrl,
    sourceUpdatedAt: undefined,
    metadata: { row_count: connection.valueCount },
    ...(connection.valueCount > 0 ? {} : { isWorkspaceLoadable: false }),
    columns: GHO_DIMENSION_VALUE_COLUMNS,
    columnTypesVerifiedAt: drive.checkedAt,
    freshnessProbe: { url: valuesUrl, token: { kind: "body-sha256" } },
  };
}
