/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PluginInstallationId,
  PluginInstallationModel,
} from "$/models/PluginInstallation/PluginInstallation.types.ts";

/** Parsers for persisted plugin install rows. */
export { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers.ts";

/** Public namespace for the plugin install model. */
export namespace PluginInstallation {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginInstallationModel = "Read"> =
    PluginInstallationModel[K];

  /** Identifies a plugin install. */
  export type Id = PluginInstallationId;
}
