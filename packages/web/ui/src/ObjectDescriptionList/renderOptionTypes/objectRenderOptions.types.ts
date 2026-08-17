//! How an object, and each of its keys, is rendered.

import type { DescribableValueArrayRenderOptions } from "./arrayRenderOptions.types";
import type {
  DescribableObject,
  DescribableObjectOf,
  GenericRootData,
  ObjectKeyTransformationType,
  PrimitiveValue,
} from "./describableValues.types";
import type { PrimitiveValueRenderOptions } from "./primitiveValueRenderOptions.types";
import type { StringKeyOf } from "@avandar/utils";
import type { ReactNode } from "react";

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
  : NonNullable<T[K]> extends ReadonlyArray<infer ArrayType> ?
    DescribableValueArrayRenderOptions<ArrayType, RootData>
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
  getRenderableValue?: keyof T | ((obj: T, rootData: RootData) => unknown);

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
  ) ?
    ObjectRenderOptions<Item, RootData>
  : [T] extends [ReadonlyArray<infer Item>] ?
    DescribableValueArrayRenderOptions<Item, RootData>
  : [T] extends [PrimitiveValue] ? PrimitiveValueRenderOptions<T, RootData>
  : PrimitiveValueRenderOptions<unknown, RootData>;
};
