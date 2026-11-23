import type { useRecognitionObjectsPresentation } from "../useRecognitionObjectsPresentation";

/** Values needed to derive this visual's layout and appearance. */
type Options = Pick<
  ReturnType<typeof useRecognitionObjectsPresentation>,
  "input" | "frame" | "accent" | "tokens" | "scales" | "motion" | "lineWidth"
> & {
  item: ReturnType<
    typeof useRecognitionObjectsPresentation
  >["input"]["contributions"][number];
  index: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: Options["tokens"];
  scales: Options["scales"];
  motion: Options["motion"];
  lineWidth: Options["lineWidth"];
  item: Options["item"];
  index: Options["index"];
  x: number;
  focused: boolean;
};

/**
 * Returns artifact placement, focus state, and theme values for
 * `RecognitionObject`, `RecognitionArtifactGlyph`, `RecognitionObjectBody`.
 */
export function getRecognitionObjectLayout({
  input,
  frame,
  accent,
  tokens,
  scales,
  motion,
  lineWidth,
  item,
  index,
}: Readonly<Options>): Presentation {
  const x = input.contributions.length === 1 ? 400 : 300 + index * 220;
  const focused = item.id === input.focusedContributionId;
  return {
    input,
    frame,
    accent,
    tokens,
    scales,
    motion,
    lineWidth,
    item,
    index,
    x,
    focused,
  };
}
