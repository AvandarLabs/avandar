import { z } from "zod";

export const frame = z.number().int().nonnegative();
export const positiveFrames = z.number().int().min(1);
export const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .max(80);
export const text = z.string().trim().min(1);
export const unit = z.number().min(0).max(1);
export const label = text.max(60);
export const detail = text.max(100);

/** Assets are relative to public/; credentials and remote URLs are never assets. */
export const assetPathSchema = text.max(240).refine((value) => {
  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes(":") &&
    !value.includes("?") &&
    !value.includes("#") &&
    !value.includes("%") &&
    value
      .split("/")
      .every(
        (part) =>
          part !== ".." &&
          part !== "." &&
          !part.startsWith(".") &&
          part.length > 0,
      )
  );
}, "Use a public-relative asset path without hidden files, URLs, or traversal");
