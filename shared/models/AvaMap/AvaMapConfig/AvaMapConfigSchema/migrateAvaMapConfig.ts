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
import {
  AvaMapConfigV6LayerSchema,
  AvaMapConfigV6Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
import { AvaMapConfigV7Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

type ConfigV1 = z.infer<typeof AvaMapConfigV1Schema>;
type ConfigV1Layer = z.infer<typeof AvaMapConfigV1LayerSchema>;
type ConfigV2 = z.infer<typeof AvaMapConfigV2Schema>;
type ConfigV2Layer = z.infer<typeof AvaMapConfigV2LayerSchema>;
type ConfigV3 = z.infer<typeof AvaMapConfigV3Schema>;
type ConfigV4 = z.infer<typeof AvaMapConfigV4Schema>;
type ConfigV5 = z.infer<typeof AvaMapConfigV5Schema>;
type ConfigV5Layer = ConfigV5["layers"][number];
type ConfigV6 = z.infer<typeof AvaMapConfigV6Schema>;
type ConfigV6Layer = z.infer<typeof AvaMapConfigV6LayerSchema>;

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

/** Migrates a valid version 4 config into the version 5 representation. */
function _migrateVersion4(config: ConfigV4): ConfigV5 {
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
  });
}

/**
 * Resamples a version 5 graduated ramp to one color per class and recolors
 * the layer's persisted legend keys to match, so a saved legend agrees with
 * the map before the GIS app reclassifies the layer. Every class starts with
 * an unset label.
 */
function _migrateVersion5Layer(layer: ConfigV5Layer): ConfigV6Layer {
  const { symbology } = layer;
  if (!("color" in symbology) || symbology.color.type !== "graduated") {
    return AvaMapConfigV6LayerSchema.parse(layer);
  }
  const classCount = MapLayer.getGraduatedClassCount(
    symbology.color.classification,
  );
  const ramp = MapLayer.resampleColorRamp(symbology.color.ramp, classCount);
  return AvaMapConfigV6LayerSchema.parse({
    ...layer,
    symbology: {
      ...symbology,
      color: {
        ...symbology.color,
        ramp,
        classLabels: Array.from({ length: classCount }, () => {
          return undefined;
        }),
      },
    },
    legend: {
      ...layer.legend,
      entries: layer.legend.entries.map((entry, index) => {
        return entry.type === "value"
          ? { ...entry, color: ramp[index] ?? entry.color }
          : entry;
      }),
    },
  });
}

/** Migrates a valid version 5 config into the version 6 representation. */
function _migrateVersion5(config: ConfigV5): ConfigV6 {
  return AvaMapConfigV6Schema.parse({
    ...config,
    version: 6,
    layers: config.layers.map(_migrateVersion5Layer),
  });
}

/** Adds the version 7 buffer fields: a meters unit and no ring label. */
function _migrateVersion6GeoBinding(
  binding: ConfigV6Layer["geoBinding"],
): unknown {
  return binding?.type === "bufferOfLayer"
    ? { ...binding, distanceUnit: "m", labelColumn: undefined }
    : binding;
}

/** Migrates a valid version 6 config into the current persisted shape. */
function _migrateVersion6(config: ConfigV6): AvaMapConfigRead {
  return AvaMapConfigV7Schema.parse({
    ...config,
    version: 7,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        geoBinding: _migrateVersion6GeoBinding(layer.geoBinding),
        spatialFilter: undefined,
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
    return migrateAvaMapConfig.fromV2(_migrateVersion1(config));
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: (config: ConfigV2): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV3(_migrateVersion2(config));
  },

  /** Migrates a valid version 3 config into the current representation. */
  fromV3: (config: ConfigV3): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV4(_migrateVersion3(config));
  },

  /** Migrates a valid version 4 config into the current representation. */
  fromV4: (config: ConfigV4): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV5(_migrateVersion4(config));
  },

  /** Migrates a valid version 5 config into the current representation. */
  fromV5: (config: ConfigV5): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV6(_migrateVersion5(config));
  },

  /** Migrates a valid version 6 config into the current representation. */
  fromV6: _migrateVersion6,
};
