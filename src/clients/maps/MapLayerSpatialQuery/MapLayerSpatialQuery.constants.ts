/** Reserved columns returned by every compiled spatial map query. */
export const MapLayerSpatialQueryColumns = {
  featureCollection: "__avandar_feature_collection",
  diagnostics: "__avandar_diagnostics",
} as const;

/** Reserved properties attached to spatial map features. */
export const MapLayerSpatialFeatureProperties = {
  boundaryName: "__avandar_boundary_name",
  classIndex: "__avandar_class_index",
  contributorCount: "__avandar_contributor_count",
  denominator: "__avandar_denominator",
  featureId: "__avandar_feature_id",
  state: "__avandar_state",
  value: "__avandar_value",
} as const;
