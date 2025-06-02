import { StringKeyOf, UnionToTuple } from "type-fest";

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

type DescribableObjectOf<T extends DescribableValue> = {
  [key: string]: T;
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

export const PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS: UnionToTuple<
  keyof PrimitiveValueRenderOptions
> = [
  "emptyString",
  "nullString",
  "undefinedString",
  "booleanTrue",
  "booleanFalse",
  "dateFormat",
] as const;

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

    /**
     * Maximum height of the description list. Beyond this height we will
     * show a scrollbar
     */
    maxHeight?: number;

    /**
     * Maps entity fields to its render options. This will take precedence
     * over the global entity render options.
     */
    childRenderOptions?: ChildRenderOptionsMap<T>;

    /**
     * Render options to apply to each item in the object. This is useful for
     * objects as records where you can't use `childRenderOptions` because you
     * may not know the literal keys, and you want to apply the same options
     * to all items.
     */
    itemRenderOptions?: T extends (
      DescribableObjectOf<infer Item extends DescribableObject>
    ) ?
      ObjectRenderOptions<Item>
    : T extends ReadonlyArray<infer Item extends DescribableValue> ?
      DescribableValueArrayRenderOptions<Item>
    : PrimitiveValueRenderOptions;
  };

export type ObjectArrayRenderOptions<T extends NonNullable<DescribableObject>> =
  PrimitiveValueRenderOptions & {
    renderAsTable?: boolean;
    titleKey?: StringKeyOf<T>;

    /**
     * Render options for each object in the array.
     */
    itemRenderOptions?: ObjectRenderOptions<T>;
  };

export type NestedArrayRenderOptions<T extends DescribableValue> =
  PrimitiveValueRenderOptions & {
    /** Options for each nested array within this array */
    itemRenderOptions?: DescribableValueArrayRenderOptions<T>;
  };

/**
 * Options for how to render an array of values.
 */
export type DescribableValueArrayRenderOptions<T extends DescribableValue> = {
  emptyArray?: string;

  /**
   * Maximum height of the description list. Beyond this height we will
   * show a scrollbar
   */
  maxHeight?: number;

  /**
   * Maximum number of items to show.
   */
  maxItemsCount?: number;
} & (T extends DescribableObject ? ObjectArrayRenderOptions<T>
: T extends readonly DescribableValue[] ? NestedArrayRenderOptions<T>
: PrimitiveValueRenderOptions);

export type AnyDescribableValueRenderOptions =
  | PrimitiveValueRenderOptions
  | ObjectRenderOptions<DescribableObject>
  | DescribableValueArrayRenderOptions<DescribableValue>;
