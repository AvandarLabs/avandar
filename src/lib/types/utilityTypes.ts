/**
 * Extract the keys of an object, but exclude the `symbol` and `number` types
 * that `keyof` on its own would return.
 */
export type ObjectStringKey<T> = Exclude<keyof T, symbol | number>;

/**
 * A type that can be used to create a branded string.
 */
export type Brand<T, B extends string> = T & { __brand: B };
