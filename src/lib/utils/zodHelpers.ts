import { z } from "zod";
import { JSONValue, MIMEType, UUID } from "../types/common";
import { Brand } from "../types/utilityTypes";

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
>(): z.ZodType<UUID<BrandType>, z.ZodStringDef, UUID<BrandType>> {
  return z.string().uuid() as unknown as z.ZodType<
    UUID<BrandType>,
    z.ZodStringDef,
    UUID<BrandType>
  >;
}

export function brandedStringType<
  B extends string,
  BrandType extends string = B extends Brand<string, infer U> ? U : B,
>(): z.ZodType<
  Brand<string, BrandType>,
  z.ZodStringDef,
  Brand<string, BrandType>
> {
  return z.string() as unknown as z.ZodType<
    Brand<string, BrandType>,
    z.ZodStringDef,
    Brand<string, BrandType>
  >;
}

const jsonLiteralType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

/**
 * Returns a Zod type that represents a JSON value.
 *
 * @returns A Zod type that represents a JSON value.
 */
export const jsonType: z.ZodType<JSONValue> = z.lazy(() => {
  return z.union([jsonLiteralType, z.array(jsonType), z.record(jsonType)]);
});

/**
 * Zod type for MIMEType.
 */
export const mimeType: z.ZodType<MIMEType> = z.union([
  z.literal("text/plain"),
  z.literal("text/html"),
  z.literal("text/css"),
  z.literal("text/javascript"),
  z.literal("text/csv"),
  z.literal("text/xml"),
  z.literal("text/markdown"),
  z.literal("application/json"),
  z.literal("application/xml"),
  z.literal("application/javascript"),
  z.literal("application/ecmascript"),
  z.literal("application/x-www-form-urlencoded"),
  z.literal("application/pdf"),
  z.literal("application/zip"),
  z.literal("application/x-7z-compressed"),
  z.literal("application/gzip"),
  z.literal("application/vnd.rar"),
  z.literal("application/msword"),
  z.literal("application/vnd.ms-excel"),
  z.literal("application/vnd.ms-powerpoint"),
  z.literal(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ),
  z.literal(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ),
  z.literal(
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ),
  z.literal("application/vnd.oasis.opendocument.text"),
  z.literal("application/vnd.oasis.opendocument.spreadsheet"),
  z.literal("application/vnd.oasis.opendocument.presentation"),
  z.literal("image/jpeg"),
  z.literal("image/png"),
  z.literal("image/gif"),
  z.literal("image/webp"),
  z.literal("image/svg+xml"),
  z.literal("image/bmp"),
  z.literal("image/tiff"),
  z.literal("audio/mpeg"),
  z.literal("audio/ogg"),
  z.literal("audio/wav"),
  z.literal("audio/webm"),
  z.literal("video/mp4"),
  z.literal("video/webm"),
  z.literal("video/ogg"),
  z.literal("video/x-msvideo"),
  z.literal("font/ttf"),
  z.literal("font/otf"),
  z.literal("font/woff"),
  z.literal("font/woff2"),
]);
