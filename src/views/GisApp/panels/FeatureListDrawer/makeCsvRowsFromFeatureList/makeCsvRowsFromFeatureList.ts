import { msg } from "@lingui/core/macro";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { I18n } from "@lingui/core";

/**
 * A feature list as CSV rows keyed by column label, with the distance
 * header naming its unit and distances rounded to two decimals. Hidden row
 * keys such as coordinates are left out. Use it with `downloadRowsAsCsv`.
 */
export function makeCsvRowsFromFeatureList(
  options: Readonly<{ list: MapLayerFeatureList; i18n: I18n }>,
): UnknownRow[] {
  const { list, i18n } = options;
  const unitLabel = list.distanceUnit
    ? i18n._(BUFFER_DISTANCE_UNIT_LABELS[list.distanceUnit])
    : undefined;
  const headedColumns = list.columns.map((column) => {
    const columnLabel = column.label;
    const header =
      column.kind === "distance" && unitLabel
        ? i18n._(msg`${columnLabel} (${unitLabel})`)
        : columnLabel;
    return { column, header };
  });
  return list.rows.map((row) => {
    return Object.fromEntries(
      headedColumns.map(({ column, header }) => {
        const value = row[column.key];
        return [
          header,
          column.kind === "distance" && typeof value === "number"
            ? Math.round(value * 100) / 100
            : value,
        ];
      }),
    );
  });
}
