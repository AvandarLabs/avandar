import type { And, IsEqual, Simplify } from "type-fest";
import type { input as ZodInput, output as ZodOutput, ZodType } from "zod";

/**
 * A type that can be used in type tests to assert that a Zod schema
 * accurately reflects the expected input and output types.
 *
 * This is a useful way to verify that a Zod schema is correctly
 * transforming between our database tables and our frontend models.
 *
 * This lives in the `@avandar/utils/zod` subpath rather than the core entry so
 * the core entry stays free of any `zod` dependency. `zod` is an optional peer
 * dependency, pulled in only by consumers that import from here. Keeping it in
 * the root barrel put an `import ... from "zod"` at the top of the published
 * `index.d.ts`, which broke type-checking for any consumer without zod.
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
