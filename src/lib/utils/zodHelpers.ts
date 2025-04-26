import { z } from "zod";
import { JSONValue, MIMEType, UUID } from "../types/common";

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
