import { And, IsEqual } from "type-fest";
import { z } from "zod";

/**
 * Extract the keys of an object, but exclude the `symbol` and `number` types
 * that `keyof` on its own would return.
 */
export type ObjectStringKey<T> = Exclude<keyof T, symbol | number>;

/**
 * A type that can be used to create a branded string.
 */
export type Brand<T, B extends string> = T & { __brand: B };

/**
 * A type that can be used in type tests to assert a type is true.
 *
 * Example usage:
 *
 * type Tests = [
 *   Expect<IsEqual<A, B>>,
 * ];
 */
export type Expect<T extends true> = T;

/**
 * A type that can be used in type tests to assert that a Zod schema
 * accurately reflects the expected input and output types.
 *
 * This is a useful way to verify that a Zod schema is correctly
 * transforming between our database tables and our frontend models.
 */
export type ZodSchemaEqualsTypes<
  Z extends z.ZodTypeAny,
  Args extends {
    input: z.input<Z>;
    output: z.output<Z>;
  },
> = And<
  IsEqual<z.input<Z>, Args["input"]>,
  IsEqual<z.output<Z>, Args["output"]>
>;

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
