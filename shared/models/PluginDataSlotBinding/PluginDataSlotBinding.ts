/* oxlint-disable typescript/no-namespace */
import type {
  PluginDataSlotBindingDraft,
  PluginDataSlotBindingId,
  PluginDataSlotBindingModel,
  PluginDataSlotBindingSourceType,
} from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts";

/** Parsers for persisted data slot binding rows. */
export { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts";

/** Public namespace for the plugin data slot binding model. */
export namespace PluginDataSlotBinding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginDataSlotBindingModel = "Read"> =
    PluginDataSlotBindingModel[K];

  /** Identifies a data slot binding. */
  export type Id = PluginDataSlotBindingId;

  /** Whether a slot reads a case type (`concept`) or a dataset. */
  export type SourceType = PluginDataSlotBindingSourceType;

  /** One slot's binding as an admin chose it, before it is saved. */
  export type Draft = PluginDataSlotBindingDraft;
}
