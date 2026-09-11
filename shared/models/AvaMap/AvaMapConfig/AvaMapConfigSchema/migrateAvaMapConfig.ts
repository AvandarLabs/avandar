import { z } from "zod";
import {
  DEFAULT_EXPORT_LAYOUT, // oxfmt-ignore
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts";
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
import { AvaMapConfigV4Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
import { AvaMapConfigV5Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

type ConfigV1 = z.infer<typeof AvaMapConfigV1Schema>;
type ConfigV1Layer = z.infer<typeof AvaMapConfigV1LayerSchema>;
type ConfigV2 = z.infer<typeof AvaMapConfigV2Schema>;
type ConfigV2Layer = z.infer<typeof AvaMapConfigV2LayerSchema>;
type ConfigV3 = z.infer<typeof AvaMapConfigV3Schema>;
type ConfigV4 = z.infer<typeof AvaMapConfigV4Schema>;

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

/** Migrates a valid version 2 config into the version 3 representation. */
function _migrateVersion2(config: ConfigV2): ConfigV3 {
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
  });
}

/** Migrates a valid version 3 config into the version 4 representation. */
function _migrateVersion3(config: ConfigV3): ConfigV4 {
  return AvaMapConfigV4Schema.parse({
    ...config,
    version: 4,
    aoi: undefined,
    timeRange: undefined,
    annotations: { isVisible: true, features: [] },
    annotationsZIndex: config.layers.length,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        timeColumn: undefined,
        applyAoiFilter: true,
      };
    }),
  });
}

/** Migrates a valid version 4 config into the current persisted shape. */
function _migrateVersion4(config: ConfigV4): AvaMapConfigRead {
  return AvaMapConfigV5Schema.parse({
    ...config,
    version: 5,
    exportLayout: DEFAULT_EXPORT_LAYOUT,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        disputedStatusColumn: undefined,
        disputedStatusValues: { disputed: [], undetermined: [] },
      };
    }),
    // The cast bridges `PopupConfig.action`, a required `| undefined` field
    // on `MapLayer.T` that `PopupSchema` still infers as an optional key.
  }) as AvaMapConfigRead;
}

/** Migrates a parsed older config into the current persisted shape. */
export const migrateAvaMapConfig = {
  /** Migrates a valid version 1 config into the current representation. */
  fromV1: (config: ConfigV1): AvaMapConfigRead => {
    return _migrateVersion4(
      _migrateVersion3(_migrateVersion2(_migrateVersion1(config))),
    );
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: (config: ConfigV2): AvaMapConfigRead => {
    return _migrateVersion4(_migrateVersion3(_migrateVersion2(config)));
  },

  /** Migrates a valid version 3 config into the current representation. */
  fromV3: (config: ConfigV3): AvaMapConfigRead => {
    return _migrateVersion4(_migrateVersion3(config));
  },

  /** Migrates a valid version 4 config into the current representation. */
  fromV4: _migrateVersion4,
};
