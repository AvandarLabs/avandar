/**
 * Replaces a property type in an object type.
 * Usage:
 *
 * ```
 * type X = { foo: number; bar: string; zed: Date };
 * type Y = Replace<X, { foo: string }>;
 * // Y = { foo: string; bar: string; zed: Date }
 * ```
 *
 * Can also handle multiple key replacement
 * ```
 * type Z = Replace<X, { foo: string; zed: string }>;
 * // Z = { foo: string; bar: string; zed: string }
 * ```
 */
export type Replace<Obj, NewTypesObj> = Omit<Obj, keyof NewTypesObj> &
  NewTypesObj;

/**
 * Extract the keys of an object, but exclude the `symbol` and `number` types
 * that `keyof` on its own would return.
 */
export type ObjectStringKey<T> = Exclude<keyof T, symbol | number>;
