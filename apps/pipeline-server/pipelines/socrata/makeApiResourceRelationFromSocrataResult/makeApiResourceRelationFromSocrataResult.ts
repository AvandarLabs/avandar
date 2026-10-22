import type {
  SocrataDiscoveryColumn,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ApiResourceRelation, RelationColumn } from "@avandar/etl";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * Whether a column is one of Socrata's computed region columns
 * (`:@computed_region_...`). The Discovery API lists them, but a `.csv`
 * export leaves them out, as it does every `:`-prefixed system field.
 */
function _isExportedColumn(column: SocrataDiscoveryColumn): boolean {
  return !column.fieldName.startsWith(":");
}

/**
 * One column, as text: the Discovery API's column list can be wrong, so its
 * type label is kept as the original type and the real type is verified
 * from the data later.
 */
function _toRelationColumn(column: SocrataDiscoveryColumn): RelationColumn {
  return {
    name: column.fieldName,
    originalDataType: column.dataType,
    castDataType: "VARCHAR",
  };
}

/**
 * Builds the one relation a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export, so that
 * is what the listing is read as, not a value from Socrata's metadata. Each
 * column is named by its API field name, which the export's header uses, and
 * is text with unverified types until the app verifies them from a sample.
 *
 * @returns The relation, or `undefined` when the dataset has no column the
 *   export includes, since a listing is never stored without its columns.
 */
export function makeApiResourceRelationFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): ApiResourceRelation | undefined {
  const { drive, result } = params;
  const columns = result.columns
    .filter(_isExportedColumn)
    .map(_toRelationColumn);
  if (columns.length === 0) {
    return undefined;
  }
  return {
    kind: "api_resource",
    externalDatasetId: result.datasetId,
    apiResourceId: result.datasetId,
    apiResourceFormat: "CSV",
    displayName: result.name,
    externalOrganizationName: drive.organizationName,
    sourceUpdatedAt: new Date(result.updatedAt),
    columns,
  };
}
