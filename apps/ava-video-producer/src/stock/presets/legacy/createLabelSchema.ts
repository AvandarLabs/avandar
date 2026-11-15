import { z } from "zod";
import { getLegacyWidthFromText } from "./getLegacyWidthFromText/getLegacyWidthFromText";
import type { LegacyTextBounds } from "./getLegacyWidthFromText/getLegacyWidthFromText";

/**
 * One-line authored content with an explicit layout-specific character bound.
 */
export function createLabelSchema({
  maxLength,
  bounds,
}: Readonly<{
  maxLength: number;
  bounds?: Readonly<LegacyTextBounds>;
}>): z.ZodString {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .regex(/^[^\r\n\t]*$/)
    .refine(
      (text) =>
        !bounds || getLegacyWidthFromText({ text, ...bounds }) <= bounds.width,
      { message: "The label cannot fit its fixed authored SVG slot." },
    );
}
