/**
 * This file contains utility types to test typescript types.
 */

import { And, IsEqual } from "type-fest";
import { z } from "zod";

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
  Z extends z.ZodTypeAny,
  Args extends {
    input: z.input<Z>;
    output: z.output<Z>;
  },
> = And<
  IsEqual<z.input<Z>, Args["input"]>,
  IsEqual<z.output<Z>, Args["output"]>
>;
