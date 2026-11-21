import type { Input } from "../UtteranceToModelDraft.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  scene: {
    frame: Options["frame"];
    input: Options["input"];
    accent: Options["accent"];
  };
};

/**
 * Returns the shared frame, input, and accent passed to draft model elements
 * for `DraftEntitySlip`, `DraftModel`, `DraftAttributeSlips`.
 */
export function getDraftModelLayout({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const scene = { frame, input, accent };
  return { frame, input, accent, scene };
}
