/** The value shapes an object description list can describe. */

import type { SelectData } from "../../inputs/Select/Select";
import type { UnknownObject } from "@avandar/utils";

/** How object keys are turned into display labels. */
export type ObjectKeyTransformationType = "camel-to-title-case" | "none";

/** Root data for an `ObjectDescriptionList`: an object or an array. */
export type GenericRootData = DescribableObject | readonly unknown[];

/** A non-recursive value. */
export type PrimitiveValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

/** An unknown object with string keys that a description list can walk. */
export type DescribableObject = UnknownObject;

/** A record whose values are all of type `T`. */
export type DescribableObjectOf<T> = {
  [key: string]: T;
};

/** Options to render a display value and editable value as a specific type. */
export type RenderAsTypeOptions =
  | "date"
  | "number"
  | "boolean"
  | "text"
  | {
      type: "text";
      choices: SelectData<string>;
    };
