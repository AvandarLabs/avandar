//! The set of child objects an `onSubmitChange` callback can receive.

import type { DescribableObject, GenericRootData } from "./describableValues";

export type _GetChildObjectsHelper<T extends GenericRootData> =
  T extends DescribableObject ?
    | T
    | {
        [K in keyof T]: T[K] extends infer V ?
          V extends DescribableObject ? V | _GetChildObjectsHelper<V>
          : V extends ReadonlyArray<infer U extends GenericRootData> ?
            _GetChildObjectsHelper<U>
          : V extends Array<infer U extends GenericRootData> ?
            _GetChildObjectsHelper<U>
          : never
        : never;
      }[keyof T]
  : T extends ReadonlyArray<infer U extends GenericRootData> ?
    _GetChildObjectsHelper<U>
  : T extends Array<infer U extends GenericRootData> ? _GetChildObjectsHelper<U>
  : never;

/**
 * Utility function to get all the child objects of a given type. These are all
 * the types that could potentially be used in an `onSubmitChange` callback.
 */
export type GetChildObjects<T extends GenericRootData> =
  T extends DescribableObject ?
    {
      [K in keyof T]: T[K] extends infer V ?
        V extends GenericRootData ?
          _GetChildObjectsHelper<V>
        : never
      : never;
    }[keyof T]
  : T extends ReadonlyArray<infer U extends GenericRootData> ?
    _GetChildObjectsHelper<U>
  : T extends Array<infer U extends GenericRootData> ? _GetChildObjectsHelper<U>
  : never;
