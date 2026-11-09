import type { DuckDbSniffableDataType, RelationColumn } from "@avandar/etl";

/** One property of an OData entity type, as GHO's `$metadata` declares it. */
export type GhoEdmProperty = Readonly<{
  name: string;
  /** The OData type, such as `Edm.Int64`. */
  edmType: string;
}>;

/**
 * Every property of a GHO indicator's facts, measured on 2026-11-09: all
 * 3,091 indicators declare exactly these, in varying order. Any property
 * not typed otherwise is `Edm.String`.
 */
const GHO_FACT_PROPERTIES: readonly GhoEdmProperty[] = [
  { name: "Id", edmType: "Edm.Int64" },
  { name: "IndicatorCode", edmType: "Edm.String" },
  { name: "SpatialDimType", edmType: "Edm.String" },
  { name: "SpatialDim", edmType: "Edm.String" },
  { name: "TimeDimType", edmType: "Edm.String" },
  { name: "ParentLocationCode", edmType: "Edm.String" },
  { name: "ParentLocation", edmType: "Edm.String" },
  { name: "Dim1Type", edmType: "Edm.String" },
  { name: "Dim1", edmType: "Edm.String" },
  { name: "TimeDim", edmType: "Edm.Int32" },
  { name: "Dim2Type", edmType: "Edm.String" },
  { name: "Dim2", edmType: "Edm.String" },
  { name: "Dim3Type", edmType: "Edm.String" },
  { name: "Dim3", edmType: "Edm.String" },
  { name: "DataSourceDimType", edmType: "Edm.String" },
  { name: "DataSourceDim", edmType: "Edm.String" },
  { name: "Value", edmType: "Edm.String" },
  { name: "NumericValue", edmType: "Edm.Decimal" },
  { name: "Low", edmType: "Edm.Decimal" },
  { name: "High", edmType: "Edm.Decimal" },
  { name: "Comments", edmType: "Edm.String" },
  { name: "Date", edmType: "Edm.DateTimeOffset" },
  { name: "TimeDimensionValue", edmType: "Edm.String" },
  { name: "TimeDimensionBegin", edmType: "Edm.DateTimeOffset" },
  { name: "TimeDimensionEnd", edmType: "Edm.DateTimeOffset" },
];

const CATALOG_TYPE_BY_EDM_TYPE: Readonly<
  Record<string, DuckDbSniffableDataType>
> = {
  "Edm.Int32": "BIGINT",
  "Edm.Int64": "BIGINT",
  "Edm.Decimal": "DOUBLE",
  "Edm.Double": "DOUBLE",
  "Edm.DateTimeOffset": "TIMESTAMP",
  "Edm.Boolean": "BOOLEAN",
};

/**
 * The catalog column type an OData `Edm` type is stored as. A type with no
 * closer match is `VARCHAR`. A `TIMESTAMP` is copied as its UTC time.
 *
 * @param edmType - The OData type, such as `Edm.Int64`.
 * @returns The catalog type.
 */
export function getCatalogTypeFromEdmType(
  edmType: string,
): DuckDbSniffableDataType {
  return CATALOG_TYPE_BY_EDM_TYPE[edmType] ?? "VARCHAR";
}

/**
 * The relation columns every GHO indicator listing declares, typed from
 * GHO's own schema rather than sniffed, so the pipeline can mark the types
 * verified. Each column keeps its `Edm` type as its original type.
 */
export const GHO_FACT_COLUMNS: readonly RelationColumn[] =
  GHO_FACT_PROPERTIES.map((property) => {
    return {
      name: property.name,
      originalDataType: property.edmType,
      castDataType: getCatalogTypeFromEdmType(property.edmType),
    };
  });

function _toPropertyKeys(properties: readonly GhoEdmProperty[]): string[] {
  return properties
    .map((property) => {
      return `${property.name}:${property.edmType}`;
    })
    .sort();
}

/**
 * Whether an indicator's entity type declares exactly `GHO_FACT_COLUMNS`,
 * by name and `Edm` type, in any order. The GHO pipeline lists an indicator
 * that does not as unloadable, so a schema change at WHO never produces a
 * copy whose types disagree with its listing.
 *
 * @param properties - The entity type's properties, from `$metadata`.
 * @returns `true` when they match.
 */
export function hasGhoFactSchema(
  properties: readonly GhoEdmProperty[],
): boolean {
  const expected = _toPropertyKeys(GHO_FACT_PROPERTIES);
  const actual = _toPropertyKeys(properties);
  return (
    actual.length === expected.length &&
    actual.every((key, index) => {
      return key === expected[index];
    })
  );
}
