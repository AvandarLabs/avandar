/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DictionaryBindingApplyErrorHint,
  DictionaryBindingDirection,
  DictionaryBindingId,
  DictionaryBindingInput,
  DictionaryBindingMode,
  DictionaryBindingModel,
} from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";

export { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBindingParsers.ts";
export { DictionaryBindingModule as DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBindingModule/DictionaryBindingModule.ts";

/** Public namespace for dataset columns bound to dictionary entries. */
export namespace DictionaryBinding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DictionaryBindingModel = "Read"> =
    DictionaryBindingModel[K];

  /** Identifies a binding. */
  export type Id = DictionaryBindingId;

  /** Whether a column's values are converted or only explained. */
  export type Mode = DictionaryBindingMode;

  /** Which side of each code pair a column holds. */
  export type Direction = DictionaryBindingDirection;

  /** One column's binding as the apply RPC takes it. */
  export type Input = DictionaryBindingInput;

  /** Why the apply RPC refused an apply. */
  export type ApplyErrorHint = DictionaryBindingApplyErrorHint;
}
