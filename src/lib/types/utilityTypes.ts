/**
 * Extract the keys of an object, but exclude the `symbol` and `number` types
 * that `keyof` on its own would return.
 */
export type ObjectStringKey<T> = Exclude<keyof T, symbol | number>;

/**
 * Get all the keys of an object that map to a given type.
 */
export type KeysThatMapTo<T, Obj extends object> = {
  [K in keyof Obj]: Obj[K] extends T ? K : never;
}[keyof Obj];

/**
 * A type that can be used to create a branded string.
 */
export type Brand<T, B extends string> = T & { __brand: B };

/**
 * Recursively removes all `TypeToExclude` types from a type.
 */
export type ExcludeDeep<T, TypeToExclude> =
  T extends Array<infer U> ? Array<ExcludeDeep<U, TypeToExclude>>
  : T extends ReadonlyArray<infer U> ?
    ReadonlyArray<ExcludeDeep<U, TypeToExclude>>
  : T extends Map<infer K, infer V> ? Map<K, ExcludeDeep<V, TypeToExclude>>
  : T extends ReadonlyMap<infer K, infer V> ?
    ReadonlyMap<K, ExcludeDeep<V, TypeToExclude>>
  : T extends Set<infer U> ? Set<ExcludeDeep<U, TypeToExclude>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<ExcludeDeep<U, TypeToExclude>>
  : T extends object ?
    {
      [K in keyof T as Exclude<T[K], TypeToExclude> extends never ? never
      : K]: ExcludeDeep<T[K], TypeToExclude>;
    }
  : Exclude<T, TypeToExclude>;

/**
 * Represents any function with inferrable parameters and return types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => unknown;

/**
 * Represents any function with a given return type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunctionWithReturn<R> = (...args: any[]) => R;

/**
 * Represents any function with a given argument type.
 */
export type AnyFunctionWithArguments<Params extends unknown[]> = (
  ...args: Params
) => unknown;

export type AnyFunctionWithSignature<Params extends unknown[], Return> = (
  ...args: Params
) => Return;
