/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PluginContentImportId,
  PluginContentImportModel,
} from "$/models/PluginContentImport/PluginContentImport.types.ts";

/** Parsers for persisted plugin content import rows. */
export { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImportParsers.ts";

/** Public namespace for the plugin content import model. */
export namespace PluginContentImport {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginContentImportModel = "Read"> =
    PluginContentImportModel[K];

  /** Identifies a plugin content import. */
  export type Id = PluginContentImportId;
}
