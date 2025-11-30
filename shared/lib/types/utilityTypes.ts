import type { Brand, UnknownObject } from "./common.ts";
import type {
  KeyAsString as BroadStringKeyOf,
  ConditionalKeys,
  Simplify,
  UnionToIntersection,
  UnknownRecord,
} from "type-fest";

/**
 * A stricter version of type-fest's `StringKeyOf` that will return
 * branded strings as strings rather than the branded string wrapped
 * in a string template. So, it returns MyId instead of \`${MyId}\`.
 */
export type StringKeyOf<T> =
  BroadStringKeyOf<T> extends `${infer S extends string}` ? S
  : BroadStringKeyOf<T>;

/**
 * Get all the entries of an object as an array of tuples that preserve the
 * mapping between key and value.
 */
export type Entries<T> = Array<
  {
    [K in keyof T]: [K, T[K]];
  }[keyof T]
>;

/**
 * A type to remove the brand from a branded type.
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

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
  : T extends UnknownObject ?
    {
      [K in keyof T as Exclude<T[K], TypeToExclude> extends never ? never
      : K]: ExcludeDeep<T[K], TypeToExclude>;
    }
  : Exclude<T, TypeToExclude>;

export type SwapDeep<T, TypeToSwap, SwapWith> =
  T extends Array<infer U> ? Array<SwapDeep<U, TypeToSwap, SwapWith>>
  : T extends ReadonlyArray<infer U> ?
    ReadonlyArray<SwapDeep<U, TypeToSwap, SwapWith>>
  : T extends Map<infer K, infer V> ? Map<K, SwapDeep<V, TypeToSwap, SwapWith>>
  : T extends ReadonlyMap<infer K, infer V> ?
    ReadonlyMap<K, SwapDeep<V, TypeToSwap, SwapWith>>
  : T extends Set<infer U> ? Set<SwapDeep<U, TypeToSwap, SwapWith>>
  : T extends ReadonlySet<infer U> ?
    ReadonlySet<SwapDeep<U, TypeToSwap, SwapWith>>
  : T extends UnknownObject ?
    {
      [K in keyof T as Exclude<T[K], TypeToSwap> extends never ? never
      : K]: SwapDeep<T[K], TypeToSwap, SwapWith>;
    }
  : // check if this is correct
  T extends TypeToSwap ? Exclude<T, TypeToSwap> | SwapWith
  : T;

export type UndefinedToNullDeep<T> = SwapDeep<T, undefined, null>;
export type NullToUndefinedDeep<T> = SwapDeep<T, null, undefined>;

/**
 * Represents any function with inferrable parameters and return types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any;

export type AnyFunctionWithSignature<Params extends unknown[], Return> = (
  ...args: Params
) => Return;

/**
 * Gets the first parameter of a function.
 */
export type FirstParameter<Func extends AnyFunction> =
  Func extends AnyFunctionWithArguments<infer Args> ? Args[0] : never;

/**
 * Gets the tail parameters of a function (i.e. everything after the first
 * parameter)
 */
export type TailParameters<Func extends AnyFunction> =
  Func extends AnyFunctionWithArguments<infer Args> ?
    Args extends [unknown, ...infer Tail] ?
      Tail
    : never
  : never;

/**
 * Represents a single-parameter function that returns the same type it was
 * given.
 * (Note: this is just at the type-level. It does not mean the function
 * will return the same _value_. Just that it will return the same _type_.)
 */
export type IdentityFnType<T> = (value: T) => T;

/**
 * Get the element type of an array or tuple.
 */
export type ElementOf<T> = T extends ReadonlyArray<infer U> ? U : never;

/**
 * A utility type to set the types of the properties in `KeysToSet` to be
 * non-undefined.
 *
 * If you want to set properties to be NonNullable then use type-fest's
 * `SetNonNullable` instead.
 */
export type SetDefined<
  T extends object,
  KeysToSet extends keyof T = keyof T,
> = {
  [K in keyof T]: K extends KeysToSet ? Exclude<T[K], undefined> : T[K];
};

export type ReplaceTypes<
  OriginalObject extends UnknownRecord,
  NewTypes extends UnknownRecord,
> = {
  [K in keyof OriginalObject]: K extends keyof NewTypes ? NewTypes[K]
  : OriginalObject[K];
};

/**
 * Converts a union of string literals into a record mapping each string literal
 * to `unknown`. This is a useful hack for when we start at the type-level
 * by defining a type union, but then need to create an array tuple with each
 * literal value.
 *
 * Type checking that this array **must** have every value from the string
 * literal union is difficult. The `UnionToTuple` type from type-fest is not
 * stable and not a reliable solution. So, instead, we create a registry and
 * then extract the keys. We can enforce exhaustiveness on the registry.
 *
 * Example:
 * ```ts
 * type Letter = "a" | "b" | "c";
 *
 * const LETTERS = registryKeys<Letter>({
 *   a: true,
 *   b: true,
 *   c: true,
 * });
 * ```
 * The `registryKeys<>` function is a helper that type checks that the passed
 * registry has every key. That ensures that the extracted array will also
 * have every key.
 */
export type Registry<StringLiteralUnion extends string> = {
  [K in StringLiteralUnion]: unknown;
};

/**
 * Converts a record into a record of arrays of the same type.
 */
export type RegistryOfArrays<T extends UnknownObject> = {
  [K in keyof T]: Array<T[K]>;
};

/**
 * Convert a union of objects into a registry, keyed by a given prop.
 */
export type ObjectRegistry<
  U extends object,
  KeyProp extends ConditionalKeys<U, string>,
> = Simplify<
  UnionToIntersection<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    U extends any ?
      {
        [V in U as Extract<U[KeyProp], string>]: V;
      }
    : never
  >
>;
