import { And, IsEqual } from "type-fest";
import { z } from "zod";

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

/**
 * Returns a ZodType of any ZodTypeDef that has the same input
 * and output types.
 */
export type ZodSymmetricalSchema<T> = z.ZodType<T, z.ZodTypeDef, T>;

/**
 * Returns a ZodType of any ZodTypeDef with the provided Input and
 * Output types.
 */
export type ZodInputOutputSchema<Input, Output> = z.ZodType<
  Output,
  z.ZodTypeDef,
  Input
>;
