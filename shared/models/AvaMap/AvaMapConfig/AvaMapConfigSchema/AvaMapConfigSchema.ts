import { AvaMapConfigV1Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import { AvaMapConfigV2Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import { AvaMapConfigV3Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { AvaMapConfigV4Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
import { AvaMapConfigV5Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";
import { migrateAvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts";
import { hasBufferCycle } from "$/models/AvaMap/AvaMapConfig/hasBufferCycle.ts";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { Json } from "$/types/database.types.ts";

function _assertBufferInvariants(layers: readonly MapLayer.T[]): void {
  const hasCycle = layers.some((layer) => {
    return (
      layer.geoBinding?.type === "bufferOfLayer" &&
      hasBufferCycle(layers, layer.id)
    );
  });
  if (hasCycle) {
    throw new Error("Buffer layer chain contains a cycle");
  }
}

function _parseCurrentConfig(json: unknown): AvaMapConfigRead {
  // The cast bridges `PopupConfig.action`, a required `| undefined` field on
  // `MapLayer.T` that `PopupSchema` still infers as an optional key.
  const parsed = AvaMapConfigV5Schema.parse(json) as AvaMapConfigRead;
  return {
    ...parsed,
    aoi: parsed.aoi,
    timeRange: parsed.timeRange,
  };
}

/** Validates and migrates a raw JSON value, whatever its persisted version. */
function _parseAnyVersion(json: unknown): AvaMapConfigRead {
  const version = z
    .looseObject({
      __type: z.literal("AvaMapConfig"),
      version: z.number().int(),
    })
    .parse(json).version;
  if (version === 1) {
    return migrateAvaMapConfig.fromV1(AvaMapConfigV1Schema.parse(json));
  }
  if (version === 2) {
    return migrateAvaMapConfig.fromV2(AvaMapConfigV2Schema.parse(json));
  }
  if (version === 3) {
    return migrateAvaMapConfig.fromV3(AvaMapConfigV3Schema.parse(json));
  }
  if (version === 4) {
    return migrateAvaMapConfig.fromV4(AvaMapConfigV4Schema.parse(json));
  }
  return _parseCurrentConfig(json);
}

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate current persisted map configuration. */
  schema: AvaMapConfigV5Schema,

  /**
   * Validates and migrates a raw JSON value to the current config shape. The
   * buffer-cycle invariant is checked once here, after migration, so a cycle
   * persisted under any past version is rejected exactly like one written
   * under the current version.
   */
  fromJson: (json: unknown): AvaMapConfigRead => {
    const config = _parseAnyVersion(json);
    _assertBufferInvariants(config.layers);
    return config;
  },

  /** Serializes a current map config into plain JSON for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(AvaMapConfigV5Schema.parse(config)));
  },
};
