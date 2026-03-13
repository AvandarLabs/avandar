/**
 * This file contains utility types to test typescript types.
 */

import type { And, IsEqual, Simplify } from "type-fest";
import type { input as ZodInput, output as ZodOutput, ZodType } from "zod";

// re-export these for easier importing from this file
export type { And, IsEqual } from "type-fest";

/**
 * A type that can be used in type tests to assert a type is true.
 *
 * Example usage:
 *
 * import { IsEqual } from "type-fest";
 * type Tests = [
 *   Expect<IsEqual<A, B>>,
 * ];
 */
export type Expect<T extends true> = T;

export type IsArray<T> = T extends readonly unknown[] ? true : false;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type Not<T extends false> = true;

/**
 * A type that can be used in type tests to assert that a Zod schema
 * accurately reflects the expected input and output types.
 *
 * This is a useful way to verify that a Zod schema is correctly
 * transforming between our database tables and our frontend models.
 */
export type ZodSchemaEqualsTypes<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Z extends ZodType<any, any>,
  Args extends {
    input: ZodInput<Z>;
    output: ZodOutput<Z>;
  },
> = And<
  IsEqual<Simplify<ZodInput<Z>>, Simplify<Args["input"]>>,
  IsEqual<Simplify<ZodOutput<Z>>, Simplify<Args["output"]>>
>;
