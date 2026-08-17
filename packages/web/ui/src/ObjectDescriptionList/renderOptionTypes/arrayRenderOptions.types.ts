//! How an array of describable values is rendered: rows, tables, nesting.

import type {
  DescribableObject,
  GenericRootData,
  PrimitiveValue,
} from "./describableValues.types";
import type { ObjectRenderOptions } from "./objectRenderOptions.types";
import type { PrimitiveValueRenderOptions } from "./primitiveValueRenderOptions.types";
import type { StringKeyOf } from "@avandar/utils";
import type { ReactNode } from "react";

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
 * The render options for an object row. This is used when objects in an
 * array are being rendered as table rows.
 */
export type ObjectRowRenderOptions<
  T extends NonNullable<DescribableObject>,
  RootData extends GenericRootData,
> = Omit<ObjectRenderOptions<T, RootData>, "renderObjectKeyLabel">;

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
       * **NOTE**: we cannot use `renderObjectKeyLabel` for table headers
       * because `renderObjectKeyLabel` is called for each object (the object
       * is a parameter to the function), which allows us to render keys
       * differently for each object if we need to. On the other hand,
       * `renderTableHeader` applies to the entire table (to all objects in the
       * array), so we cannot render keys differently per object.
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

      /**
       * Whether the items in the array are editable.
       * This will render an extra column in the table with an edit button.
       * When clicked, the item in each column will switch to an editable
       * variant.
       */
      editable?: boolean;
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

      /**
       * Only a table renders the edit column, so this branch declares the key
       * as `undefined` rather than omitting it.
       */
      editable?: undefined;
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
> =
  [T] extends [DescribableObject] ?
    BaseDescribableValueArrayRenderOptions<T, RootData> &
      ObjectArrayRenderOptions<T, RootData>
  : [T] extends [readonly unknown[]] ?
    BaseDescribableValueArrayRenderOptions<T, RootData> &
      NestedArrayRenderOptions<T, RootData>
  : [T] extends [PrimitiveValue] ?
    BaseDescribableValueArrayRenderOptions<T, RootData> &
      PrimitiveValueRenderOptions<T, RootData>
  : BaseDescribableValueArrayRenderOptions<T, RootData> &
      PrimitiveValueRenderOptions<unknown, RootData>;

export type AnyDescribableValueRenderOptions =
  | PrimitiveValueRenderOptions<unknown, GenericRootData>
  | ObjectRenderOptions<DescribableObject, GenericRootData>
  | DescribableValueArrayRenderOptions<unknown, GenericRootData>;
