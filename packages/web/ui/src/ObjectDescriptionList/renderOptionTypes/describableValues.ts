//! The value shapes an object description list can describe.

import type { SelectData } from "../../inputs/Select/Select";
import type { UnknownObject } from "@avandar/utils";

export type ObjectKeyTransformationType = "camel-to-title-case" | "none";

/**
 * The root data of an `ObjectDescriptionList` must be a collection.
 * It can can only be either a `DescribableObject` or an array of
 * `DescribableValue`.
 */
export type GenericRootData = DescribableObject | readonly unknown[];

/** A non-recursive value */
export type PrimitiveValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

/**
 * The base definition of a describable object, which is just an unknown object
 * with string keys and unknown values.
 */
export type DescribableObject = UnknownObject;

export type DescribableObjectOf<T> = {
  [key: string]: T;
};

/**
 * Options to render a display value and editable value as a specific type.
 */
export type RenderAsTypeOptions =
  | "date"
  | "number"
  | "boolean"
  | "text"
  | {
      type: "text";
      choices: SelectData<string>;
    };
