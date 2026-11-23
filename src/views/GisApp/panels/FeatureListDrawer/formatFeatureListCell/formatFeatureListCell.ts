import { msg } from "@lingui/core/macro";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { I18n } from "@lingui/core";

/**
 * One feature list cell as display text: distances to two decimals with
 * their unit ("0.09 mi"), blanks as empty text, and anything else as it
 * reads. Use it wherever a feature list is shown, for example the drawer's
 * table.
 */
export function formatFeatureListCell(
  options: Readonly<{
    value: unknown;
    column: MapLayerFeatureListColumn;
    distanceUnit: MapLayerFeatureList["distanceUnit"];
    i18n: I18n;
  }>,
): string {
  const { value, column, distanceUnit, i18n } = options;
  if (value === null || value === undefined) {
    return "";
  }
  if (column.kind === "distance" && typeof value === "number" && distanceUnit) {
    const distance = i18n.number(value, { maximumFractionDigits: 2 });
    const unit = i18n._(BUFFER_DISTANCE_UNIT_LABELS[distanceUnit]);
    return i18n._(msg`${distance} ${unit}`);
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
