import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";

/** Strict authored content within the fixed WordReveal layout. */
export const wordRevealInputSchema: z.ZodObject<
  {
    words: z.ZodArray<
      z.ZodObject<{ word: z.ZodString; accented: z.ZodBoolean }, z.core.$strict>
    >;
    showArrow: z.ZodBoolean;
  },
  z.core.$strict
> = z
  .strictObject({
    words: z
      .array(
        z.strictObject({
          word: createLabelSchema({ maxLength: 6 }),
          accented: z.boolean(),
        }),
      )
      .min(1)
      .max(3),
    showArrow: z.boolean(),
  })
  .superRefine((input, context) => {
    input.words.forEach(({ word }, index) => {
      const mask = [
        { width: 232, size: 91 },
        { width: 236, size: 91 },
        { width: 414, size: 137 },
      ][index];
      if (!mask) {
        return;
      }
      const width = getLegacyWidthFromText({ text: word, fontSize: mask.size });
      if (width > mask.width) {
        context.addIssue({
          code: "custom",
          path: ["words", index, "word"],
          message: "The word cannot fit its fixed authored mask.",
        });
      }
    });
  });

/** Schema-inferred content supplied to the renderer. */
export type WordRevealInput = z.output<typeof wordRevealInputSchema>;
