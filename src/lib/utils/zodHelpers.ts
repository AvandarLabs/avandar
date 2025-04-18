import { z } from "zod";
import { UUID } from "../types/common";

/**
 * Returns a Zod type that represents a branded UUID. This expects
 * the branded UUID as both input and output types.
 *
 * The brand is set via a generic parameter and it can either be a branded
 * UUID type or a string literal.
 *
 * For example, both of these will accept and output the same brand:
 *
 * ```ts
 * type UserId = UUID<'User'>;
 * uuidType<UserId>(); // input and output is Brand<UUID, 'User'>
 * uuidType<'User'>(); // input and output is also Brand<UUID, 'User'>
 * ```
 *
 * @returns A Zod type representing a branded UUID
 */
export function uuidType<
  B extends string,
  Brand extends string = B extends UUID<infer U> ? U : B,
>(): z.ZodType<UUID<Brand>, z.ZodStringDef, UUID<Brand>> {
  return z.string().uuid() as unknown as z.ZodType<
    UUID<Brand>,
    z.ZodStringDef,
    UUID<Brand>
  >;
}

/**
 * Returns a Zod type that changes the type of a string into a branded UUID.
 * The brand is set via a generic parameter and it can either be a branded
 * UUID type or a string literal.
 *
 * For example, both of these will output the same brand:
 *
 * ```ts
 * type UserId = UUID<'User'>;
 * stringToBrandedUUID<UserId>(); // outputs Brand<UUID, 'User'>
 * stringToBrandedUUID<'User'>(); // also outputs Brand<UUID, 'User'>
 * ```
 *
 * @returns A Zod type that changes the type of a string into a branded UUID.
 */
export function stringToBrandedUUID<
  B extends string,
  Brand extends string = B extends UUID<infer U> ? U : B,
>(): z.ZodType<UUID<Brand>, z.ZodStringDef, string> {
  return z.string().uuid() as unknown as z.ZodType<
    UUID<Brand>,
    z.ZodStringDef,
    string
  >;
}

/**
 * Returns a Zod type that changes the type of a branded UUID into a string.
 * The brand is set via a generic parameter and it can either be a branded
 * UUID type or a string literal.
 *
 * For example, both of these will accept the same brand:
 *
 * ```ts
 * type UserId = UUID<'User'>;
 * brandedUUIDToString<UserId>(); // accepts input Brand<UUID, 'User'>
 * brandedUUIDToString<'User'>(); // also accepts input Brand<UUID, 'User'>
 * ```
 *
 * @returns A Zod type that changes the type of a branded UUID into a string.
 */
export function brandedUUIDToString<
  B extends string,
  Brand extends string = B extends UUID<infer U> ? U : B,
>(): z.ZodType<string, z.ZodStringDef, UUID<Brand>> {
  return z.string().uuid() as unknown as z.ZodType<
    string,
    z.ZodStringDef,
    UUID<Brand>
  >;
}

/**
 * Returns a Zod type that will accept any type but throw an error if
 * it is used at runtime. This allows this type to pass any TypeScript
 * compilation checks, but will fail at runtime. It is intended as
 * a placeholder in Zod schemas for types that still need implementing.
 *
 * @returns A Zod `any` type that will throw an error if it is used.
 */
export function unimplementedType(): z.ZodTypeAny {
  return z.any().superRefine(() => {
    throw new Error("This schema is not implemented yet");
  });
}

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json | undefined } | Json[];

/**
 * Returns a Zod type that represents a JSON value.
 *
 * @returns A Zod type that represents a JSON value.
 */
export function jsonType(): z.ZodType<Json> {
  const jsonSchema: z.ZodType<Json> = z.lazy(() => {
    return z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]);
  });
  return jsonSchema;
}
