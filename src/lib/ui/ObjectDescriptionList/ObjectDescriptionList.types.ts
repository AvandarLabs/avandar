import { ReactNode } from "react";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { FormattableTimezone } from "@/lib/utils/formatters/formatDate";
import { registryKeys } from "@/lib/utils/objects/misc";
import { UnknownObject } from "@/lib/types/common";

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

type DescribableObjectOf<T> = {
  [key: string]: T;
};

/**
 * Render options for primitive values. These can also be passed to any
 * recursive DescribableValues to apply to its children.
 */
export type PrimitiveValueRenderOptions<
  T,
  RootData extends GenericRootData | undefined,
> = {
  /**
   * If true, we test strings and numbers to see if they are valid dates,
   * before we allow them to be returned as-is. Defaults to false.
   */
  asDate?: boolean;

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

  /** The format to use for dates. Defaults to ISO 8601. */
  dateFormat?: string;

  /**
   * The timezone to use for dates. Defaults to "local", meaning that the user's
   * local timezone will be used, as determined by `dayjs`. Otherwise, any valid
   * timezone string can be passed, such as "UTC" or "America/New_York".
   */
  dateTimeZone?: FormattableTimezone;
};

export const PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS = registryKeys<
  keyof PrimitiveValueRenderOptions<unknown, GenericRootData>
>({
  asDate: true,
  renderValue: true,
  renderEmptyString: true,
  renderNullString: true,
  renderUndefinedString: true,
  renderBooleanTrue: true,
  renderBooleanFalse: true,
  dateFormat: true,
  dateTimeZone: true,
});

/**
 * A mapping of object keys to their render options.
 * This will take precedence over any global render options.
 */
export type ObjectKeyRenderOptionsMap<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData = T,
> = {
  [K in StringKeyOf<T>]?: NonNullable<T[K]> extends DescribableObject
    ? ObjectRenderOptions<NonNullable<T[K]>, RootData>
    : NonNullable<T[K]> extends (
      ReadonlyArray<infer ArrayType>
    ) ? DescribableValueArrayRenderOptions<ArrayType, RootData>
    : T[K] extends PrimitiveValue ? PrimitiveValueRenderOptions<T[K], RootData>
    : PrimitiveValueRenderOptions<unknown, RootData>;
};

/**
 * Options for how to render an entity object.
 */
export type ObjectRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<unknown, RootData> & {
  /**
   * This function or key is used to transform the entire object to a
   * single renderable value.
   *
   * `getRenderableValue` can either be a function or the object key
   * that will be used to extract the renderable value for this object.
   *
   * If passed, the returned value will now become the new value to render
   * recursively. If the returned value is a primitive, the rendering will stop
   * here.
   *
   * @param obj The object to render
   * @param rootData The root data of the object description list
   * @returns The value to render
   */
  getRenderableValue?:
    | keyof T
    | ((obj: T, rootData: RootData) => unknown);

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
   * A custom render function that receives an object key and the object itself,
   * so that you can have complete freedom on how any key's value is rendered.
   *
   * If a `renderObjectKeyValue` function is provided then **all** keys in this
   * object will be fed into this function, instead of using the other
   * render options.
   *
   * This function can return `undefined` to fall back to the default render
   * options for that key.
   *
   * @param key The key of the object
   * @param currentObject The current object
   * @param rootData The root data of the object description list
   * @returns The key's renderable value
   */
  renderObjectKeyValue?: (
    key: keyof T,
    currentObject: T,
    rootData: RootData,
  ) => ReactNode;

  /**
   * A custom render function that receives an object key and the object itself,
   * so that you can have complete freedom on how a key's label is rendered.
   *
   * Return `undefined` to fall back to the key transformation specified in
   * `renderObjectKeyTransform` (which defaults to converting a key from
   * camelCase to Title Case).
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

  /**
   * How to transform the object keys into displayable labels.
   * Defaults to "camel-to-title-case".
   * Possible values:
   * - 'camel-to-title-case': Convert camelCase keys to title case.
   * - 'none': Do not transform the keys. We render them as-is.
   */
  renderObjectKeyTransform?: ObjectKeyTransformationType;

  /**
   * Keys to include when rendering the object. If not provided, all keys
   * will be included (except for those in `excludeKeys`).
   *
   * This is also a way to order the keys when rendering the object.
   * Use "..." as a special key to include all remaining keys in any order.
   * This is useful when we only care about the order of a few keys.
   *
   * Examples:
   * ```ts
   * includeKeys: ["name", "age", "..."]
   * ```
   * ```ts
   * includeKeys: ["name", "...", "address"]
   * ```
   *
   * **NOTE:** The "..." key can only be used once. If included more than once,
   * only the first occurrence will be used.
   */
  includeKeys?: ReadonlyArray<StringKeyOf<T> | "...">;

  /** Keys to exclude when rendering the object */
  excludeKeys?: ReadonlyArray<StringKeyOf<T>>;

  /**
   * Keys to exclude when rendering the object using a regular expression.f
   * If a string is provided, then we exclude all keys that **start** with
   * the given string.
   *
   * Defaults to "_", so all keys starting with "_" will be excluded.
   */
  excludeKeysPattern?: RegExp | string;

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
  ) ? ObjectRenderOptions<Item, RootData>
    : [T] extends [ReadonlyArray<infer Item>]
      ? DescribableValueArrayRenderOptions<Item, RootData>
    : [T] extends [PrimitiveValue] ? PrimitiveValueRenderOptions<T, RootData>
    : PrimitiveValueRenderOptions<unknown, RootData>;
};

type BaseObjectArrayRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<unknown, RootData> & {
  /**
   * The key to use as the React key in order to render the array of
   * items in a stable way. If an `idKey` is not provided we will
   * automatically test if the object has an "id" key, otherwise
   * we will fall back to the array index.
   */
  idKey?: Extract<keyof T, string | number>;
};

/**
 * Extended options for arrays of objects.
 */
export type ObjectArrayRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> =
  | (BaseObjectArrayRenderOptions<T, RootData> & {
    /**
     * By default object arrays render as a list of collapsible items.
     * If `renderAsTable` is true then we will render as a table instead.
     */
    renderAsTable: true;

    /**
     * A custom render function that receives an object key, so that you can
     * have complete freedom on how a table column's header is rendered.
     *
     * Return `undefined` to fall back to the default render function, which
     * just converts the key to Title Case.
     *
     * **NOTE**: we cannot use `renderObjectKeyLabel` for table headers because
     * `renderObjectKeyLabel` is called for each object (the object is a
     * parameter to the function), which allows us to render keys differently
     * for each object if we need to. On the other hand, `renderTableHeader`
     * applies to the entire table (to all objects in the array), so we cannot
     * render keys differently per object.
     */
    renderTableHeader?: (key: keyof T, rootData: RootData) => ReactNode;

    /**
     * Render options for each object in the array.
     */
    itemRenderOptions?: Omit<
      ObjectRenderOptions<T, RootData>,
      "renderObjectKeyLabel"
    >;
    defaultExpanded?: undefined;
    titleKey?: undefined;
  })
  | (BaseObjectArrayRenderOptions<T, RootData> & {
    /**
     * By default object arrays render as a list of collapsible items.
     * If `renderAsTable` is true then we will render as a table instead.
     */
    renderAsTable?: false;

    /**
     * If true (and we are not rendering as a table), we default each
     * list item to start expanded rather than collapsed.
     *
     * Default is `true`.
     */
    defaultExpanded?: boolean;

    /**
     * The title to use for each list item. This is only applicable if
     * `renderAsTable` is false.
     */
    titleKey?: StringKeyOf<T>;

    /**
     * Render options for each object in the array.
     */
    itemRenderOptions?: ObjectRenderOptions<T, RootData>;
    renderTableHeader?: undefined;
  });

/**
 * Extended options for nested arrays
 */
export type NestedArrayRenderOptions<
  T,
  RootData extends GenericRootData,
> = PrimitiveValueRenderOptions<unknown, RootData> & {
  /** Options for each nested array within this array */
  itemRenderOptions?: DescribableValueArrayRenderOptions<T, RootData>;
};

/**
 * Common render options for all describable value arrays.
 */
export type BaseDescribableValueArrayRenderOptions<
  T,
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
};

/**
 * Options for how to render an array of values.
 */
export type DescribableValueArrayRenderOptions<
  T,
  RootData extends GenericRootData,
> = [T] extends [DescribableObject] ?
    & BaseDescribableValueArrayRenderOptions<T, RootData>
    & ObjectArrayRenderOptions<T, RootData>
  : [T] extends [readonly unknown[]] ?
      & BaseDescribableValueArrayRenderOptions<T, RootData>
      & NestedArrayRenderOptions<T, RootData>
  : [T] extends [PrimitiveValue] ?
      & BaseDescribableValueArrayRenderOptions<T, RootData>
      & PrimitiveValueRenderOptions<T, RootData>
  :
    & BaseDescribableValueArrayRenderOptions<T, RootData>
    & PrimitiveValueRenderOptions<unknown, RootData>;

export type AnyDescribableValueRenderOptions =
  | PrimitiveValueRenderOptions<unknown, GenericRootData>
  | ObjectRenderOptions<DescribableObject, GenericRootData>
  | DescribableValueArrayRenderOptions<unknown, GenericRootData>;
