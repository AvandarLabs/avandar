import { z } from "zod";
import { Json } from "@/types/database.types";
import {
  Brand,
  MIMEType,
  RawCellValue,
  RawDataRow,
  UUID,
} from "../../../shared/lib/types/common";

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
  BrandType extends string = B extends UUID<infer U> ? U : B,
>(): z.ZodType<UUID<BrandType>, UUID<BrandType>> {
  return z.uuid() as unknown as z.ZodType<UUID<BrandType>, UUID<BrandType>>;
}

export function brandedStringType<
  B extends string,
  BrandType extends string = B extends Brand<string, infer U> ? U : B,
>(): z.ZodType<Brand<string, BrandType>, Brand<string, BrandType>> {
  return z.string() as unknown as z.ZodType<
    Brand<string, BrandType>,
    Brand<string, BrandType>
  >;
}

/**
 * Zod type for MIMEType.
 */
export const mimeType: z.ZodType<MIMEType, MIMEType> = z.enum(MIMEType);

/**
 * Returns a Zod type that represents a JSON value returned by
 * Supabase.
 *
 * This is different from `z.json()` only in that it allows
 * records to contain `undefined` values. Which isn't correct JSON.
 * But for whatever reason Supabase allows it in its JSON type
 * definition, so we need to define a zod schema for that.
 *
 * @returns A Zod type that represents a JSON value as defined by Supabase.
 */
export const supabaseJSONSchema: z.ZodType<Json, Json> = z.lazy(() => {
  return z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(supabaseJSONSchema),
    z.record(z.string(), z.union([supabaseJSONSchema, z.undefined()])),
  ]);
});

export const csvCellValueSchema: z.ZodType<RawCellValue, RawCellValue> =
  z.string();

export const csvRowSchema: z.ZodType<RawDataRow, RawDataRow> = z.record(
  z.string(),
  csvCellValueSchema,
);

export const csvDataSchema: z.ZodType<RawDataRow[], RawDataRow[]> =
  z.array(csvRowSchema);
