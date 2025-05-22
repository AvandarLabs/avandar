import { StringKeyOf } from "type-fest";

/** A non-recursive value */
export type PrimitiveValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

/**
 * All possible values a DescribableObject can hold. This includes primitive
 * values, nested objects, and arrays of field values.
 */
export type DescribableValue =
  | PrimitiveValue
  | DescribableObject
  | readonly DescribableValue[];

/**
 * The base definition of an entity object. This is a record of string
 * keys that map to values. Values can be primitives, nested entities,
 * or arrays of values.
 */
export type DescribableObject = {
  [key: string]: DescribableValue;
};

/**
 * Render options for primitive values. These can also be passed to any
 * recursive DescribableValues to apply to its children.
 */
export type PrimitiveValueRenderOptions = {
  emptyString?: string;
  nullString?: string;
  undefinedString?: string;
  booleanTrue?: string;
  booleanFalse?: string;

  /** If no `dateFormat` is provided we will use `date.toLocaleDateString()` */
  dateFormat?: string;
};

/**
 * A mapping of child keys to its nested render options.
 * This will take precedence over any global render options.
 */
export type ChildRenderOptionsMap<T extends NonNullable<DescribableObject>> = {
  [K in StringKeyOf<T>]?: NonNullable<T[K]> extends DescribableObject ?
    ObjectRenderOptions<NonNullable<T[K]>>
  : NonNullable<T[K]> extends (
    ReadonlyArray<infer ArrayType extends DescribableValue>
  ) ?
    DescribableValueArrayRenderOptions<ArrayType>
  : PrimitiveValueRenderOptions;
};

/**
 * Options for how to render an entity object.
 */
export type ObjectRenderOptions<T extends NonNullable<DescribableObject>> =
  PrimitiveValueRenderOptions & {
    excludeKeys?: ReadonlyArray<StringKeyOf<T>>;
    titleKey?: StringKeyOf<T>;

    /**
     * Maps entity fields to its render options. This will take precedence
     * over the global entity render options.
     */
    childRenderOptions?: ChildRenderOptionsMap<T>;
  };

export type ObjectArrayRenderOptions<T extends NonNullable<DescribableObject>> =
  ObjectRenderOptions<T> & {
    renderAsTable?: boolean;
  };

/**
 * Options for how to render an array of values.
 */
export type DescribableValueArrayRenderOptions<T extends DescribableValue> = {
  emptyArray?: string;
} & (T extends DescribableObject ? ObjectArrayRenderOptions<T>
: PrimitiveValueRenderOptions);
