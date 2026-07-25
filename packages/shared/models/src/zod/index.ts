import { z } from "zod";

/**
 * Returns a Zod schema for a model.
 *
 * This lives in the `@models/zod` subpath rather than the core `@models`
 * export so the core entry stays free of any `zod` dependency. `zod` is a peer
 * dependency of `@avandar/models`, pulled in only by consumers that import
 * from `@models/zod`.
 *
 * @param options - The model definition.
 * @param options.type - The model's discriminant type.
 * @param options.props - Zod schema for the model's properties. Optional;
 *   defaults to an empty object.
 * @returns A Zod schema for the model.
 */
export function AvaModelSchema<
  MType extends string,
  MPropsSchema extends Record<string, z.ZodType<unknown, unknown>> = Record<
    string,
    never
  >,
>(options: {
  type: MType;
  props?: MPropsSchema;
}): z.ZodObject<
  {
    __type: z.ZodLiteral<MType>;
  } & MPropsSchema
> {
  const { type, props } = options;

  // Spreading an optional generic loses the `& MPropsSchema` part of the
  // inferred shape, so assert the fully-typed return explicitly.
  return z.object({
    __type: z.literal(type),
    ...props,
  }) as z.ZodObject<
    {
      __type: z.ZodLiteral<MType>;
    } & MPropsSchema
  >;
}
