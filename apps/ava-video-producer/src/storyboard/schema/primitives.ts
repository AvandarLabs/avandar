import { z } from "zod";

/** Validates a nonnegative integer storyboard frame. */
export const frame = z.number().int().nonnegative();
/** Validates a positive integer storyboard duration. */
export const positiveFrames = z.number().int().min(1);
/** Validates a bounded lowercase kebab-case storyboard identifier. */
export const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .max(80);
/** Validates nonempty trimmed storyboard text. */
export const text = z.string().trim().min(1);
/** Validates a normalized storyboard value between zero and one. */
export const unit = z.number().min(0).max(1);
/** Validates a storyboard label with at most 60 characters. */
export const label = text.max(60);
/** Validates storyboard detail text with at most 100 characters. */
export const detail = text.max(100);

/**
 * Assets are relative to public/; credentials and remote URLs are never assets.
 */
export const assetPathSchema = text.max(240).refine((value) => {
  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes(":") &&
    !value.includes("?") &&
    !value.includes("#") &&
    !value.includes("%") &&
    value.split("/").every((part) => {
      return (
        part !== ".." &&
        part !== "." &&
        !part.startsWith(".") &&
        part.length > 0
      );
    })
  );
}, "Use a public-relative asset path without hidden files, URLs, or traversal");
