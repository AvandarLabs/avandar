import { ReactNode } from "react";
import { Registry, StringKeyOf } from "@/lib/types/utilityTypes";
import { objectKeys } from "@/lib/utils/objects/misc";

/**
 * The root data of an `ObjectDescriptionList` must be a collection.
 * It can can only be either a `DescribableObject` or an array of
 * `DescribableValue`.
 */
export type GenericRootData = DescribableObject | readonly DescribableValue[];

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
export type PrimitiveValueRenderOptions<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
> = {
  /**
   * A custom render function for the value. If provided, this will take
   * precedence over any other render options.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using the other render options for that value.
   */
  renderValue?: (value: T, rootData: RootData) => ReactNode;

  /** The string to display for empty strings */
  renderEmptyString?: NonNullable<ReactNode>;

  /** The string to display for null values */
  renderNullString?: NonNullable<ReactNode>;

  /** The string to display for undefined values */
  renderUndefinedString?: NonNullable<ReactNode>;

  /** The string to display for boolean true values */
  renderBooleanTrue?: NonNullable<ReactNode>;

  /** The string to display for boolean false values */
  renderBooleanFalse?: NonNullable<ReactNode>;

  /** If no `dateFormat` is provided we will use `date.toLocaleDateString()` */
  dateFormat?: string;
};

export const PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS = objectKeys({
  renderValue: true,
  renderEmptyString: true,
  renderNullString: true,
  renderUndefinedString: true,
  renderBooleanTrue: true,
  renderBooleanFalse: true,
  dateFormat: true,
} satisfies Registry<
  keyof PrimitiveValueRenderOptions<PrimitiveValue, GenericRootData>
>);

/**
 * A mapping of object keys to their render options.
 * This will take precedence over any global render options.
 */
export type ObjectKeyRenderOptionsMap<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData = T,
> = {
  [K in StringKeyOf<T>]?: NonNullable<T[K]> extends DescribableObject ?
    ObjectRenderOptions<NonNullable<T[K]>, RootData>
  : NonNullable<T[K]> extends (
    ReadonlyArray<infer ArrayType extends DescribableValue>
  ) ?
    DescribableValueArrayRenderOptions<ArrayType, RootData>
  : T[K] extends PrimitiveValue ? PrimitiveValueRenderOptions<T[K], RootData>
  : PrimitiveValueRenderOptions<PrimitiveValue, RootData>;
};

/**
 * Options for how to render an entity object.
 */
export type ObjectRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<PrimitiveValue, RootData> & {
  /**
   * This function is used to transform the entire object to a renderable
   * primitive value. The value returned by this function will be rendered
   * using the primitive value render options.
   *
   * If passed, the object will no longer be traversed to render any
   * child items. The returned primitive value is considered the final
   * value to render for this object.
   *
   * @param obj The object to render
   * @param rootData The root data of the object description list
   * @returns The value to render
   */
  getValue?: (obj: T, rootData: RootData) => PrimitiveValue;

  /**
   * A custom render function for the object. If provided, this will take
   * precedence over any other render options.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using the other render options for that object.
   *
   * @param obj The object to render
   * @param rootData The root data of the object description list
   */
  renderObject?: (obj: T, rootData: RootData) => ReactNode;

  /**
   * A custom render function that receives an object key, so that you can
   * have complete freedom on how any key is rendered.
   *
   * If a `renderObjectKey` function is provided then **all** keys in this
   * object will be fed into this function, instead of using the other
   * render options.
   *
   * If you do not want to have to specify how to render a key, you can
   * return `undefined` for that key. This is helpful when you only need
   * to customize how a single key is rendered, but you want to fall back
   * to the default render options for the rest of the keys.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using the other render options for that key.
   *
   * @param key The key of the object
   * @param currentObject The current object
   * @param rootData The root data of the object description list
   * @returns The rendered key
   */
  renderObjectKeyValue?: (
    key: keyof T,
    currentObject: T,
    rootData: RootData,
  ) => ReactNode;

  /**
   * A custom render function that receives an object key, so that you can
   * have complete freedom on how a key's label is rendered.
   *
   * Return `undefined` to fall back to the default label, which is converting
   * a key to Title Case.
   *
   * @param key The key of the object
   * @param currentObject The current object
   * @param rootData The root data of the object description list
   * @returns The rendered label
   */
  renderObjectKeyLabel?: (
    key: keyof T,
    currentObject: T,
    rootData: RootData,
  ) => ReactNode;

  excludeKeys?: ReadonlyArray<StringKeyOf<T>>;

  /**
   * Maximum height of the description list. Beyond this height we will
   * show a scrollbar
   */
  maxHeight?: number;

  /**
   * Maps object keys to their render options. This will take precedence
   * over any global render options received from a parent component.
   */
  keyRenderOptions?: ObjectKeyRenderOptionsMap<T, RootData>;

  /**
   * Render options to apply to each item in the object. This is useful for
   * objects as records where you can't use `keyRenderOptions` because you
   * may not know the literal keys, and you want to apply the same options
   * to all items.
   */
  itemRenderOptions?: [T] extends (
    [DescribableObjectOf<infer Item extends DescribableObject>]
  ) ?
    ObjectRenderOptions<Item, RootData>
  : [T] extends [ReadonlyArray<infer Item extends DescribableValue>] ?
    DescribableValueArrayRenderOptions<Item, RootData>
  : [T] extends [PrimitiveValue] ? PrimitiveValueRenderOptions<T, RootData>
  : PrimitiveValueRenderOptions<PrimitiveValue, RootData>;
};

/**
 * Extended options for arrays of objects.
 */
export type ObjectArrayRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<PrimitiveValue, RootData> & {
  /**
   * By default object arrays render as a list of collapsible items.
   * If `renderAsTable` is true then we will render as a table instead.
   */
  renderAsTable?: boolean;

  /**
   * If true, we default each item to start expanded rather than collapsed.
   * This is only applicable if we are not rendering as a table.
   *
   * Default is `true`.
   */
  defaultExpanded?: boolean;

  /**
   * The title to use for each list item. This is only applicable if we are
   * not rendering as a table.
   */
  titleKey?: StringKeyOf<T>;

  /**
   * Render options for each object in the array.
   */
  itemRenderOptions?: ObjectRenderOptions<T, RootData>;
};

/**
 * Extended options for nested arrays
 */
export type NestedArrayRenderOptions<
  T extends DescribableValue,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<PrimitiveValue, RootData> & {
  /** Options for each nested array within this array */
  itemRenderOptions?: DescribableValueArrayRenderOptions<T, RootData>;
};

/**
 * Options for how to render an array of values.
 */
export type DescribableValueArrayRenderOptions<
  T extends DescribableValue,
  RootData extends GenericRootData,
> = {
  /**
   * A custom render function for the array. If provided, this will take
   * precedence over any other render options.
   *
   * If `undefined` is returned, this will be interpreted as a no-op, and
   * we will fall back to using the other render options for that array.
   *
   * @param array The array to render
   * @param rootData The root data of the object description list
   * @returns The rendered array
   */
  renderArray?: (array: readonly T[], rootData: RootData) => ReactNode;

  /** The content to show when the array is empty */
  renderEmptyArray?: NonNullable<ReactNode>;

  /**
   * Maximum height of the description list. Beyond this height we will
   * show a scrollbar
   */
  maxHeight?: number;

  /**
   * Maximum number of items to show.
   */
  maxItemsCount?: number;
} & ([T] extends [DescribableObject] ? ObjectArrayRenderOptions<T, RootData>
: [T] extends [readonly DescribableValue[]] ?
  NestedArrayRenderOptions<T, RootData>
: [T] extends [PrimitiveValue] ? PrimitiveValueRenderOptions<T, RootData>
: PrimitiveValueRenderOptions<PrimitiveValue, RootData>);

export type AnyDescribableValueRenderOptions =
  | PrimitiveValueRenderOptions<PrimitiveValue, GenericRootData>
  | ObjectRenderOptions<DescribableObject, GenericRootData>
  | DescribableValueArrayRenderOptions<DescribableValue, GenericRootData>;
