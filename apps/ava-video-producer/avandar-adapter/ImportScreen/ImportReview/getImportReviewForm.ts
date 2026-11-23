import { Motion } from "../../../src/motion";
import { DESCRIPTION, NAME } from "../importFixtures";
import type { DatasetImportFields } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFields";
import type { ComponentProps } from "react";
/** Bind typed fixture text and focus outlines to the product import fields. */
export function getImportReviewForm({
  frame,
}: Readonly<{ frame: number }>): ComponentProps<
  typeof DatasetImportFields
>["form"] {
  const name =
    frame < 128
      ? "cases.csv"
      : Motion.typed({
          frame,
          at: 128,
          text: NAME,
          cps: 24,
        });
  const description = Motion.typed({
    frame,
    at: 209,
    text: DESCRIPTION,
    cps: 34,
  });
  return {
    key: (field: string) => {
      return field;
    },
    getInputProps: (field: string) => {
      return {
        value: field === "name" ? name : description,
        readOnly: true,
        "data-video-target": `import-${field}`,
        styles: {
          input: {
            borderColor:
              (field === "name" && frame >= 124 && frame < 205) ||
              (field === "description" && frame >= 205 && frame < 330)
                ? "var(--mantine-color-primary-6)"
                : undefined,
          },
        },
      };
    },
  } as unknown as ComponentProps<typeof DatasetImportFields>["form"];
}
