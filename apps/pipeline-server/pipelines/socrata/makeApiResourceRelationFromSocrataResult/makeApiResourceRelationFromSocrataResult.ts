import type {
  SocrataDiscoveryColumn,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ApiResourceRelation, RelationColumn } from "@avandar/etl";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * The cast type for each Socrata data type, keyed in lower case. A type not
 * listed here, such as `Point` or `URL`, is read as text.
 */
const CAST_DATA_TYPE_BY_SOCRATA_TYPE: Readonly<
  Record<string, RelationColumn["castDataType"]>
> = {
  number: "DOUBLE",
  money: "DOUBLE",
  percent: "DOUBLE",
  double: "DOUBLE",
  "calendar date": "TIMESTAMP",
  "floating timestamp": "TIMESTAMP",
  "fixed timestamp": "TIMESTAMP",
  date: "TIMESTAMP",
  checkbox: "BOOLEAN",
};

/**
 * Whether a column is one of Socrata's computed region columns
 * (`:@computed_region_...`). The Discovery API lists them, but a `.csv`
 * export leaves them out, as it does every `:`-prefixed system field.
 */
function _isExportedColumn(column: SocrataDiscoveryColumn): boolean {
  return !column.fieldName.startsWith(":");
}

function _toRelationColumn(column: SocrataDiscoveryColumn): RelationColumn {
  return {
    name: column.fieldName,
    originalDataType: column.dataType,
    castDataType:
      CAST_DATA_TYPE_BY_SOCRATA_TYPE[column.dataType.toLowerCase()] ??
      "VARCHAR",
  };
}

/**
 * Builds the one relation a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export, so that
 * is what the listing is read as, not a value from Socrata's metadata. Each
 * column is named by its API field name, which the export's header uses.
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
