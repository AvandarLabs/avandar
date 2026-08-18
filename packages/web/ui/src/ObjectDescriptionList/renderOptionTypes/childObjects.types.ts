/** Nested object types reachable from a description-list root. */

import type {
  DescribableObject,
  GenericRootData,
} from "./describableValues.types";

type _GetChildObjectsHelper<T extends GenericRootData> =
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

/** Child objects of `T` that an `onSubmitChange` callback can receive. */
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
