import { AvaMapConfigV1Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import { AvaMapConfigV2Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import { AvaMapConfigV3Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { migrateAvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";
import type { Json } from "$/types/database.types.ts";

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate current persisted map configuration. */
  schema: AvaMapConfigV3Schema,

  /** Validates and migrates a raw JSON value to the current config shape. */
  fromJson: (json: unknown): AvaMapConfigRead => {
    const version = z
      .object({ __type: z.literal("AvaMapConfig"), version: z.number().int() })
      .passthrough()
      .parse(json).version;
    if (version === 1) {
      return migrateAvaMapConfig.fromV1(AvaMapConfigV1Schema.parse(json));
    }
    if (version === 2) {
      return migrateAvaMapConfig.fromV2(AvaMapConfigV2Schema.parse(json));
    }
    return AvaMapConfigV3Schema.parse(json) as AvaMapConfigRead;
  },

  /** Serializes a current map config into plain JSON for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(AvaMapConfigV3Schema.parse(config)));
  },
};
