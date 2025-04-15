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
 * Returns a Zod type that transforms a string into a branded UUID.
 * The brand is set via a generic parameter and it can either be a branded
 * UUID type or a string literal.
 *
 * For example, both of these will output the same brand:
 *
 * ```ts
 * type UserId = UUID<'User'>;
 * uuidType<UserId>(); // outputs Brand<UUID, 'User'>
 * uuidType<'User'>(); // also outputs Brand<UUID, 'User'>
 * ```
 *
 * @returns A Zod type that transforms a string into a branded UUID.
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
 * Returns a Zod type that transforms a branded UUID into a string.
 * The brand is set via a generic parameter and it can either be a branded
 * UUID type or a string literal.
 *
 * For example, both of these will accept the same brand:
 *
 * ```ts
 * type UserId = UUID<'User'>;
 * uuidType<UserId>(); // accepts input Brand<UUID, 'User'>
 * uuidType<'User'>(); // also accepts input Brand<UUID, 'User'>
 * ```
 *
 * @returns A Zod type that transforms a branded UUID into a string.
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
