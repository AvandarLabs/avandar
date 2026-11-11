import { msg } from "@lingui/core/macro";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MessageDescriptor } from "@lingui/core";

/**
 * Short labels for each buffer distance unit, for the buffer form's unit
 * picker and for distances shown in a feature list or its CSV.
 */
export const BUFFER_DISTANCE_UNIT_LABELS: Readonly<
  Record<MapLayer.BufferDistanceUnit, MessageDescriptor>
> = {
  m: msg`m`,
  km: msg`km`,
  ft: msg`ft`,
  mi: msg`mi`,
};
