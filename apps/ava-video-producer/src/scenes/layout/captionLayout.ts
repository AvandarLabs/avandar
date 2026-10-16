import { assertFinite, assertFrame } from "./geometry";
import { fitTextLines } from "./textLayout";
import type { CaptionCue } from "../scenes.types";

/** One geometry calculation controls both the caption box and its reserved band. */
export function captionGeometry(
  text: string,
  width: number,
  height: number,
  fontSize = 38,
  bottom = 48,
) {
  assertFinite(width, "caption width");
  assertFinite(height, "caption height");
  assertFinite(bottom, "caption bottom");
  if (width <= 0 || height <= 0)
    throw new Error("Caption dimensions must be positive");
  if (bottom < 0 || bottom > height / 2)
    throw new Error(
      "Caption bottom must fit inside the lower half of the canvas",
    );
  const maxWidth = width * 0.84;
  const paddingX = 32;
  const paddingY = 18;
  const borderWidth = 1;
  const lineHeight = 1.22;
  const clearance = 8;
  const fitted = fitTextLines(
    [text],
    maxWidth - 2 * (paddingX + borderWidth),
    height * 0.23,
    fontSize,
    28,
  );
  const boxHeight = Math.ceil(
    fitted.lines.length * fitted.fontSize * lineHeight +
      2 * (paddingY + borderWidth),
  );
  return {
    ...fitted,
    maxWidth,
    paddingX,
    paddingY,
    borderWidth,
    lineHeight,
    bottom,
    boxHeight,
    clearance,
    requiredBand: Math.ceil(boxHeight + bottom + clearance),
  };
}

/** Reserve the tallest cue for the entire film so scenes never resize between cues. */
export function captionBand(
  cues: ReadonlyArray<Pick<CaptionCue, "text">>,
  width: number,
  height: number,
): number {
  if (!cues.length) return 0;
  return Math.max(
    160,
    ...cues.map((cue) => captionGeometry(cue.text, width, height).requiredBand),
  );
}

export function safePublicPath(src: string): string {
  // Control characters must not enter a media URL.
  if (
    !src ||
    src.startsWith("/") ||
    // eslint-disable-next-line no-control-regex -- intentional: rejecting control characters in a media URL
    /[\\:%?#\u0000-\u001f]/.test(src) ||
    src.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(
      "Media src must be a public-relative file path without traversal, URLs, queries, or fragments",
    );
  }
  return src;
}

export function validateCaptions(cues: CaptionCue[]): void {
  const ids = new Set<string>();
  cues.forEach((cue, index) => {
    assertFrame(cue.startFrame, "caption.startFrame");
    assertFrame(cue.endFrame, "caption.endFrame");
    if (!cue.id || ids.has(cue.id))
      throw new Error(`Duplicate or empty caption id: ${cue.id}`);
    if (!cue.text.trim() || cue.endFrame <= cue.startFrame)
      throw new Error(`Invalid caption cue: ${cue.id}`);
    if (index && cue.startFrame < cues[index - 1].endFrame)
      throw new Error("Caption cues must be ordered and must not overlap");
    ids.add(cue.id);
  });
}

export function activeCaption(
  frame: number,
  cues: CaptionCue[],
): CaptionCue | undefined {
  return cues.find((cue) => frame >= cue.startFrame && frame < cue.endFrame);
}
