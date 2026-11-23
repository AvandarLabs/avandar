import type { useLocalRowsPresentation } from "../useLocalRowsPresentation";

/** Values needed to derive this visual's layout and appearance. */
type Options = Pick<
  ReturnType<typeof useLocalRowsPresentation>,
  "input" | "frame" | "accent" | "tokens" | "motion" | "scales"
> & {
  row: ReturnType<typeof useLocalRowsPresentation>["input"]["rows"][number];
  index: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  accent: Options["accent"];
  tokens: Options["tokens"];
  scales: Options["scales"];
  row: Options["row"];
  index: Options["index"];
  selected: boolean;
  applied: number;
};

/**
 * Returns row selection state, application progress, and theme values for
 * `LocalExecutionRowValues`, `LocalExecutionRowBody`, `LocalExecutionRow`.
 */
export function getLocalExecutionRowLayout({
  input,
  frame,
  accent,
  tokens,
  motion,
  scales,
  row,
  index,
}: Readonly<Options>): Presentation {
  const selected = row.category === input.request.selectedCategory;
  const applied = motion.ramp(
    frame,
    101 + index * motion.scaleStagger(5),
    motion.whip,
  );
  return { input, accent, tokens, scales, row, index, selected, applied };
}
