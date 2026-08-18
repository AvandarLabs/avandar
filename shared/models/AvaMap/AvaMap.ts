/* eslint-disable @typescript-eslint/no-namespace */
import type { AvaMapId, AvaMapModel } from "$/models/AvaMap/AvaMap.types.ts";

/** Parsers for persisted AvaMap rows. */
export { AvaMapParsers } from "$/models/AvaMap/AvaMapParsers.ts";

/** Public namespace for the persisted AvaMap row model. */
export namespace AvaMap {
  /** Selects a CRUD variant of the AvaMap model. */
  export type T<K extends keyof AvaMapModel = "Read"> = AvaMapModel[K];

  /** Identifies a persisted AvaMap row. */
  export type Id = AvaMapId;
}
