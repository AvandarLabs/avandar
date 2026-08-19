import { AvaMapConfigV1Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import { AvaMapConfigV2Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import { AvaMapConfigV3Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { AvaMapConfigV4Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
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
  const parsed = AvaMapConfigV4Schema.parse(json) as AvaMapConfigRead;
  _assertBufferInvariants(parsed.layers);
  return {
    ...parsed,
    aoi: parsed.aoi,
    timeRange: parsed.timeRange,
  };
}

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate current persisted map configuration. */
  schema: AvaMapConfigV4Schema,

  /** Validates and migrates a raw JSON value to the current config shape. */
  fromJson: (json: unknown): AvaMapConfigRead => {
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
    return _parseCurrentConfig(json);
  },

  /** Serializes a current map config into plain JSON for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(AvaMapConfigV4Schema.parse(config)));
  },
};
