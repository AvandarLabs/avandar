import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** Current names and settings for a persisted workspace boundary reference. */
export type ResolvedBoundarySource = {
  datasetId: Dataset.Id;
  datasetName: string;
  geometryColumnName: string;
  geometryEncoding: MapLayer.GeometryEncoding;
  keyColumnName: string;
  displayNameColumnName: string | undefined;
  simplification: MapLayer.GeometrySimplification;
};

/** Metadata ready for the spatial SQL compiler. */
export type ResolvedMapLayerMetadata = {
  type: "resolved";
  sourceColumnNames: ReadonlyMap<QueryColumn.Id, string>;
  boundary: ResolvedBoundarySource | undefined;
  aggregationMeasureColumnName: string | undefined;
  normalizationDenominator:
    | { type: "queryColumn" | "boundaryColumn"; columnName: string }
    | undefined;
};

/** Why stable persisted references cannot currently be compiled. */
export type MapLayerRebindReason =
  | "missingSourceDataset"
  | "missingSourceColumn"
  | "missingBoundaryDataset"
  | "missingBoundaryGeometryColumn"
  | "missingBoundaryKeyColumn"
  | "missingBoundaryDisplayNameColumn"
  | "aggregationMeasureNotNumeric"
  | "missingBoundaryDenominatorColumn"
  | "normalizationDenominatorNotNumeric"
  | "unsupportedNormalizationDenominator";

/** A saved reference that must be rebound before the layer can run. */
export type MapLayerRebindRequired = {
  type: "rebindRequired";
  reason: MapLayerRebindReason;
  referenceId: string;
};

/** Result of resolving persisted IDs against current workspace metadata. */
export type MapLayerMetadataResolution =
  | ResolvedMapLayerMetadata
  | MapLayerRebindRequired;

/** SQL and parsing metadata produced for one spatial layer execution. */
export type MapLayerSpatialQueryPlan = {
  rawSql: string;
  family: MapLayer.GeometryFamily;
  sourcePropertyColumnNames: readonly string[];
  zoomBand: number;
  simplificationReferenceLatitude: number;
};

/** Geometry parsing diagnostics returned with every spatial result. */
export type MapLayerSpatialDiagnostics = {
  sourceCount: number;
  parsedCount: number;
  invalidCount: number;
  observedFamilies: readonly MapLayer.GeometryFamily[];
  hasMixedFamilies: boolean;
  matchedSourceKeyCount?: number;
  unmatchedSourceKeyCount?: number;
  unmatchedBoundaryCount?: number;
  duplicateBoundaryKeyCount?: number;
  ambiguousSourceKeyCount?: number;
  unmatchedSourceKeySamples?: readonly string[];
  duplicateBoundaryKeySamples?: readonly string[];
  ambiguousSourceKeySamples?: readonly string[];
  nonPointCount?: number;
  suppressedCount?: number;
  isEmptyAfterDrops?: boolean;
};
