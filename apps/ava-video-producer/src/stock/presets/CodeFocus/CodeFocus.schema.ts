import { prop } from "@avandar/utils";
import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";
import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";

/** Strict authored content within the fixed CodeFocus layout. */
export const codeFocusInputSchema = z
  .strictObject({
    lines: z
      .array(
        z
          .array(
            z.strictObject({
              text: z
                .string()
                .max(54)
                .regex(/^[^\r\n\t]*$/),
              color: legacyColorSchema,
            }),
          )
          .min(1)
          .max(8),
      )
      .min(1)
      .max(6),
    highlight: z.array(z.number().int().min(0).max(5)).min(1).max(4),
    title: createLabelSchema({
      maxLength: 40,
      bounds: { fontSize: 14, width: 700, mono: true },
    }),
    footer: createLabelSchema({
      maxLength: 60,
      bounds: { fontSize: 13, width: 738, mono: true },
    }),
    showHighlight: z.boolean(),
  })
  .superRefine((input, context) => {
    input.lines.forEach((tokens, index) => {
      if (
        tokens.map(prop("text")).join("").length > 54 ||
        getLegacyWidthFromText({
          text: tokens.map(prop("text")).join(""),
          fontSize: 21,
          mono: true,
        }) > 718
      ) {
        context.addIssue({
          code: "custom",
          path: ["lines", index],
          message: "A code line supports at most 54 characters.",
        });
      }
    });
    input.highlight.forEach((line, index) => {
      if (line >= input.lines.length) {
        context.addIssue({
          code: "custom",
          path: ["highlight", index],
          message: "Highlight must reference an authored line.",
        });
      }
    });
  }) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type CodeFocusInput = z.output<typeof codeFocusInputSchema>;
