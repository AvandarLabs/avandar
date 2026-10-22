import type { SocrataDiscoveryColumn } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ApiResourceRelation, RelationColumn } from "@avandar/etl";
import type { SocrataDataset } from "@pipelines/socrata/attachSocrataCsvHeaders/attachSocrataCsvHeaders";
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
 * One column of the CSV export, typed by the Discovery API column of the
 * same field name. A header the Discovery API does not list is text.
 */
function _toRelationColumn(
  headerName: string,
  discoveredColumn: SocrataDiscoveryColumn | undefined,
): RelationColumn {
  if (discoveredColumn === undefined) {
    return {
      name: headerName,
      originalDataType: "VARCHAR",
      castDataType: "VARCHAR",
    };
  }
  return {
    name: headerName,
    originalDataType: discoveredColumn.dataType,
    castDataType:
      CAST_DATA_TYPE_BY_SOCRATA_TYPE[discoveredColumn.dataType.toLowerCase()] ??
      "VARCHAR",
  };
}

/**
 * Builds the one relation a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export, so that
 * is what the listing is read as, not a value from Socrata's metadata. The
 * columns are the export's header, in its order, which uses each column's
 * API field name. Each is typed by the Discovery API column of that name.
 *
 * @returns The relation, or `undefined` when the dataset has no CSV header,
 *   since a listing is never stored without its columns.
 */
export function makeApiResourceRelationFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDataset>;
}): ApiResourceRelation | undefined {
  const { drive, result } = params;
  if (result.csvHeader === undefined || result.csvHeader.length === 0) {
    return undefined;
  }
  const discoveredColumnsByName = new Map(
    result.columns.map((column) => {
      return [column.fieldName, column];
    }),
  );
  return {
    kind: "api_resource",
    externalDatasetId: result.datasetId,
    apiResourceId: result.datasetId,
    apiResourceFormat: "CSV",
    displayName: result.name,
    externalOrganizationName: drive.organizationName,
    sourceUpdatedAt: new Date(result.updatedAt),
    columns: result.csvHeader.map((headerName) => {
      return _toRelationColumn(
        headerName,
        discoveredColumnsByName.get(headerName),
      );
    }),
  };
}
