import {
  AvaMapConfigV1LayerSchema,
  AvaMapConfigV1Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  AvaMapConfigV2LayerSchema,
  AvaMapConfigV2Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import {
  AvaMapConfigV3Schema,
  V3GeoBindingSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

type ConfigV1 = z.infer<typeof AvaMapConfigV1Schema>;
type ConfigV1Layer = z.infer<typeof AvaMapConfigV1LayerSchema>;
type ConfigV2 = z.infer<typeof AvaMapConfigV2Schema>;
type ConfigV2Layer = z.infer<typeof AvaMapConfigV2LayerSchema>;

/** Migrates one version 1 layer without weakening its sensitivity. */
function _migrateVersion1Layer(layer: ConfigV1Layer): ConfigV2Layer {
  const legend = {
    ...layer.legend,
    units: layer.legend.units,
    breaks: [],
    entries: [],
  };
  if (layer.sensitivity.mode !== "aggregateOnly") {
    return AvaMapConfigV2LayerSchema.parse({
      ...layer,
      popup: { ...layer.popup, action: layer.popup.action },
      legend,
    });
  }
  return AvaMapConfigV2LayerSchema.parse({
    ...layer,
    popup: { ...layer.popup, action: layer.popup.action },
    geoBinding: undefined,
    symbology: MapLayer.createDefaultFillSymbology(),
    legend,
  });
}

/** Migrates a valid version 1 config into the version 2 representation. */
function _migrateVersion1(config: ConfigV1): ConfigV2 {
  return AvaMapConfigV2Schema.parse({
    ...config,
    version: 2,
    layers: config.layers.map(_migrateVersion1Layer),
  });
}

/** Adds version 3 fields to a version 2 point aggregation binding. */
function _migrateVersion2GeoBinding(
  binding: ConfigV2Layer["geoBinding"],
): z.infer<typeof V3GeoBindingSchema> | undefined {
  if (binding?.type === "geometryColumn") {
    return V3GeoBindingSchema.parse({ ...binding, sourceCrs: undefined });
  }
  if (
    binding?.type === "aggregatePointsToBoundaries" &&
    binding.points.type === "geometryColumn"
  ) {
    return V3GeoBindingSchema.parse({
      ...binding,
      points: { ...binding.points, sourceCrs: undefined },
    });
  }
  return V3GeoBindingSchema.optional().parse(binding);
}

/** Migrates a valid version 2 config into the current strict representation. */
function _migrateVersion2(config: ConfigV2): AvaMapConfigRead {
  return AvaMapConfigV3Schema.parse({
    ...config,
    version: 3,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        geoBinding: _migrateVersion2GeoBinding(layer.geoBinding),
        legend: { ...layer.legend, sizeStops: [] },
      };
    }),
  }) as AvaMapConfigRead;
}

/** Migrates a parsed older config into the current persisted shape. */
export const migrateAvaMapConfig = {
  /** Migrates a valid version 1 config into the current representation. */
  fromV1: (config: ConfigV1): AvaMapConfigRead => {
    return _migrateVersion2(_migrateVersion1(config));
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: _migrateVersion2,
};
