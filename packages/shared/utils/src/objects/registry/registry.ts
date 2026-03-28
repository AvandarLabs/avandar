import type { Registry } from "@utils/types/utilities.types.ts";

/**
 * Helper function to generate a type-safe registry.
 *
 * A "registry" is a hardcoded dictionary of string literals that map to a
 * value. Its primary use is to look up values, such as classes, objects, or
 * functions, using a string literal type.
 *
 * This is useful to generate type-safe and **exhaustive** arrays of a string
 * literal union.
 *
 * It requires that the `LiteralUnion` type be explicitly supplied in the
 * generic type parameter.
 *
 * @example
 * type Letter = "a" | "b" | "c";
 * const letters = registry<Letter>().keys("a", "b", "c"); // ["a", "b", "c"]
 *
 * @returns A function to build an array of keys, type-checked against a literal
 * union.
 */
export function registry<
  LiteralUnion extends string,
  FullRegistry extends Registry<LiteralUnion> = Registry<LiteralUnion>,
>(): {
  keys: <
    T extends [LiteralUnion, ...LiteralUnion[]],
    MissingKeys extends keyof FullRegistry extends T[number] ? T[number]
    : Exclude<keyof FullRegistry, T[number]>,
  >(
    ...keys: T & MissingKeys[]
  ) => T;
} {
  return {
    keys: (...keys) => {
      return keys;
    },
  };
}
