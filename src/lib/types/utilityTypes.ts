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
 * Recursively removes all `undefined` types from a type.
 */
export type ExcludeUndefinedDeep<T> =
  T extends Array<infer U> ? Array<ExcludeUndefinedDeep<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<ExcludeUndefinedDeep<U>>
  : T extends Map<infer K, infer V> ? Map<K, ExcludeUndefinedDeep<V>>
  : T extends ReadonlyMap<infer K, infer V> ?
    ReadonlyMap<K, ExcludeUndefinedDeep<V>>
  : T extends Set<infer U> ? Set<ExcludeUndefinedDeep<U>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<ExcludeUndefinedDeep<U>>
  : T extends object ?
    {
      [K in keyof Required<T>]: ExcludeUndefinedDeep<T[K]>;
    }
  : Exclude<T, undefined>;

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
