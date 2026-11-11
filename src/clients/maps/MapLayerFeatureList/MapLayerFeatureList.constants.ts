/** Keys a feature list row carries beside the layer's own column names. */
export const MAP_LAYER_FEATURE_LIST_ROW_KEYS = {
  distance: "__avandar_distance",
  nearestLabel: "__avandar_nearest_label",
  longitude: "__avandar_longitude",
  latitude: "__avandar_latitude",
} as const;

/** Result columns of the SQL that `compileMapLayerFeatureListSql` builds. */
export const MAP_LAYER_FEATURE_LIST_SQL_COLUMNS = {
  properties: "__avandar_properties",
  longitude: "__avandar_longitude",
  latitude: "__avandar_latitude",
  distanceMeters: "__avandar_distance_meters",
  nearestLabel: "__avandar_nearest_label",
} as const;

/** Zoom band a feature list compiles at, so listed polygons keep all detail. */
export const FEATURE_LIST_ZOOM_BAND = 24;
