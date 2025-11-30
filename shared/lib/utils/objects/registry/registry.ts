import { Registry } from "$/lib/types/utilityTypes.ts";

/**
 * Helper function to generate a type-safe registry.
 * This is useful to generate type-safe and **exhaustive** arrays of a string
 * literal union.
 *
 * It requires that the `LiteralUnion` type always be passed in explicitly
 * as a generic type parameter.
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
