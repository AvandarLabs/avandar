import { SceneGeometry } from "./SceneGeometry";
import { TextLayout } from "./TextLayout";
import type { CaptionCue } from "../scenes.types";

type CaptionGeometryOptions = {
  text: string;
  width: number;
  height: number;
  fontSize?: number;
  bottom?: number;
  borderWidth?: number;
};
/** A caption's fitted lines, box metrics and the band it reserves. */
type CaptionGeometry = {
  fontSize: number;
  lines: string[];
  maxWidth: number;
  paddingX: number;
  paddingY: number;
  borderWidth: number;
  lineHeight: number;
  bottom: number;
  boxHeight: number;
  clearance: number;
  requiredBand: number;
};
/**
 * The caption border the reserved band is measured with when no theme is at
 * hand: `classic`'s hairline. The drawn caption passes the theme's own.
 */
const DEFAULT_BORDER_WIDTH = 1;
/**
 * One geometry calculation controls both the caption box and its reserved
 * band.
 */
function _captionGeometry({
  text,
  width,
  height,
  fontSize = 38,
  bottom = 48,
  borderWidth = DEFAULT_BORDER_WIDTH,
}: Readonly<CaptionGeometryOptions>): CaptionGeometry {
  _assertCaptionDimensions({ width, height, bottom });
  const maxWidth = width * 0.84;
  const paddingX = 32;
  const paddingY = 18;
  const lineHeight = 1.22;
  const clearance = 8;
  const fitted = TextLayout.fitTextLines({
    lines: [text],
    width: maxWidth - 2 * (paddingX + borderWidth),
    height: height * 0.23,
    requested: fontSize,
    minimum: 28,
  });
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
/**
 * Reserve the tallest cue for the entire film so scenes never resize between
 * cues.
 */
function _captionBand({
  cues,
  width,
  height,
}: Readonly<{
  cues: ReadonlyArray<Pick<CaptionCue, "text">>;
  width: number;
  height: number;
}>): number {
  if (!cues.length) {
    return 0;
  }
  return Math.max(
    160,
    ...cues.map((cue) => {
      return _captionGeometry({ text: cue.text, width, height }).requiredBand;
    }),
  );
}
/** Returns a safe public-relative media path or throws for unsafe input. */
function _safePublicPath(src: string): string {
  // Control characters must not enter a media URL.
  if (
    !src ||
    src.startsWith("/") ||
    // intentional: rejecting control characters in a media URL
    // oxlint-disable-next-line no-control-regex
    /[\\:%?#\u0000-\u001f]/.test(src) ||
    src.split("/").some((part) => {
      return !part || part === "." || part === "..";
    })
  ) {
    throw new Error(
      "Media src must be a public-relative file path without traversal, URLs, queries, or fragments",
    );
  }
  return src;
}
/** Rejects invalid, duplicate, unordered, or overlapping caption cues. */
function _validateCaptions(cues: CaptionCue[]): void {
  const ids = new Set<string>();
  cues.forEach((cue, index) => {
    SceneGeometry.assertFrame({
      value: cue.startFrame,
      name: "caption.startFrame",
    });
    SceneGeometry.assertFrame({
      value: cue.endFrame,
      name: "caption.endFrame",
    });
    if (!cue.id || ids.has(cue.id)) {
      throw new Error(`Duplicate or empty caption id: ${cue.id}`);
    }
    if (!cue.text.trim() || cue.endFrame <= cue.startFrame) {
      throw new Error(`Invalid caption cue: ${cue.id}`);
    }
    if (index && cue.startFrame < cues[index - 1].endFrame) {
      throw new Error("Caption cues must be ordered and must not overlap");
    }
    ids.add(cue.id);
  });
}
/** Returns the caption active at a frame, if any, for caption rendering. */
function _activeCaption({
  frame,
  cues,
}: Readonly<{
  frame: number;
  cues: CaptionCue[];
}>): CaptionCue | undefined {
  return cues.find((cue) => {
    return frame >= cue.startFrame && frame < cue.endFrame;
  });
}

/** Rejects invalid canvas dimensions and caption placement. */
function _assertCaptionDimensions({
  width,
  height,
  bottom,
}: Readonly<{ width: number; height: number; bottom: number }>): void {
  SceneGeometry.assertFinite({
    value: width,
    name: "caption width",
  });
  SceneGeometry.assertFinite({
    value: height,
    name: "caption height",
  });
  SceneGeometry.assertFinite({
    value: bottom,
    name: "caption bottom",
  });
  if (width <= 0 || height <= 0) {
    throw new Error("Caption dimensions must be positive");
  }
  if (bottom < 0 || bottom > height / 2) {
    throw new Error(
      "Caption bottom must fit inside the lower half of the canvas",
    );
  }
}

/**
 * Positions and validates caption bands for scene layout and narration
 * playback.
 */
export const CaptionLayout = {
  /**
   * One geometry calculation controls both the caption box and its reserved
   * band.
   */
  captionGeometry: _captionGeometry,
  /**
   * Reserve the tallest cue for the entire film so scenes never resize between
   * cues.
   */
  captionBand: _captionBand,
  /** Returns a safe public-relative media path or throws for unsafe input. */
  safePublicPath: _safePublicPath,
  /** Rejects invalid, duplicate, unordered, or overlapping caption cues. */
  validateCaptions: _validateCaptions,
  /** Returns the caption active at a frame, if any, for caption rendering. */
  activeCaption: _activeCaption,
};
