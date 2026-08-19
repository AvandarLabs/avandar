import { UtmEpsg } from "@/views/GisApp/layers/UtmEpsg/UtmEpsg";

/**
 * SQL that derives a meters EPSG code from centroid longitude and latitude.
 *
 * `centroid_longitude` and `centroid_latitude` must be in the current SELECT
 * scope. Polar latitudes use UPS; otherwise the zone is UTM. Web Mercator is
 * not used: meter distances shrink toward the poles in EPSG:3857.
 */
export function makeMetersCrsSql(): string {
  const zone =
    "least(60, greatest(1, CAST(floor((centroid_longitude + 180) / 6) AS BIGINT) + 1))";
  const epsg = `CASE WHEN centroid_latitude >= 84 THEN ${UtmEpsg.polar.north} WHEN centroid_latitude <= -80 THEN ${UtmEpsg.polar.south} WHEN centroid_latitude >= 0 THEN ${UtmEpsg.base.north} + ${zone} ELSE ${UtmEpsg.base.south} + ${zone} END`;
  return `concat('EPSG:', CAST(${epsg} AS BIGINT))`;
}
