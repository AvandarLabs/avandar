import assert from "node:assert/strict";
import { getConservativeWidthFromText } from "../../../src/stock/text/getConservativeWidthFromText";
import { getTextRelevantTokenIndicesFromTokens } from "./getTextRelevantTokenIndicesFromTokens";
import {
  getSvgNumber,
  decodeSvgEntities,
  getSvgAttributes,
  createSvgFrame,
  type Attributes,
  type Frame,
} from "./SvgFrameHelpers";

/** Conservative painted text/rectangle bounds with explicit SVG paint facts. */
export type SvgPaintEnvelope = {
  kind: "text" | "rect";
  text?: string;
  ariaLabel?: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  opacity: number;
  fill: string;
  fillOpacity: number;
  paintIndex: number;
  attributes: Record<string, string>;
};

const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});

// Widths share the reviewed Arial advances with production text fitting, so
// this
// is not an independent font oracle. Rendered strings, coordinates, transforms,
// baselines and layout rejection remain independently checked from SVG output.
function _estimateWidth({
  text,
  fontSize,
}: {
  text: string;
  fontSize: number;
}): number {
  return Array.from(GRAPHEMES.segment(text)).reduce((sum, { segment }) => {
    const bases = Array.from(segment).filter(
      (character) =>
        !/[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/u.test(
          character,
        ),
    );
    const advance = getConservativeWidthFromText({
      text: bases.join(""),
      fontSize,
    });
    const needsFallbackFloor =
      !bases.length ||
      /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\ufe0f]/u.test(
        segment,
      );
    return (
      sum +
      Math.max(advance, needsFallbackFloor ? Math.ceil(fontSize * 1.1) : 0)
    );
  }, 0);
}

function _getTextEnvelope({
  frame,
  token,
  paintIndex,
}: Readonly<{ frame: Frame; token: string; paintIndex: number }>):
  | SvgPaintEnvelope
  | undefined {
  if (
    frame.isInert ||
    frame.opacity === 0 ||
    !frame.cursor ||
    !["text", "tspan"].includes(frame.tag)
  ) {
    return undefined;
  }
  const text = decodeSvgEntities(token);
  if (!text) {
    return undefined;
  }
  assert.ok(
    frame.anchor === "start" || !frame.cursor.hasText,
    "Unsupported anchored continuation without an absolute x reset.",
  );
  const width = _estimateWidth({ text, fontSize: frame.fontSize });
  const offset =
    frame.anchor === "middle" ? width / 2 : frame.anchor === "end" ? width : 0;
  const firstX = frame.translateX + frame.scaleX * (frame.cursor.x - offset),
    lastX = firstX + frame.scaleX * width;
  const firstY =
      frame.translateY + frame.scaleY * (frame.cursor.y - frame.fontSize),
    lastY =
      frame.translateY + frame.scaleY * (frame.cursor.y + frame.fontSize * 0.3);
  frame.cursor.x += width;
  frame.cursor.hasText = true;
  return {
    kind: "text",
    text,
    ariaLabel: frame.ariaLabel,
    left: Math.min(firstX, lastX),
    right: Math.max(firstX, lastX),
    top: Math.min(firstY, lastY),
    bottom: Math.max(firstY, lastY),
    opacity: frame.opacity,
    fill: frame.fill,
    fillOpacity: frame.fillOpacity,
    paintIndex,
    attributes: {},
  };
}

function _getRectangleEnvelope({
  frame,
  attributes,
  paintIndex,
}: Readonly<{
  frame: Frame;
  attributes: Attributes;
  paintIndex: number;
}>): SvgPaintEnvelope {
  const x = getSvgNumber({ value: attributes.x, fallback: 0 }),
    y = getSvgNumber({ value: attributes.y, fallback: 0 }),
    width = getSvgNumber({ value: attributes.width, fallback: 0 }),
    height = getSvgNumber({ value: attributes.height, fallback: 0 });
  assert.ok(
    width >= 0 && height >= 0,
    "Unsupported negative rectangle extent.",
  );
  const firstX = frame.translateX + frame.scaleX * x,
    lastX = firstX + frame.scaleX * width;
  const firstY = frame.translateY + frame.scaleY * y,
    lastY = firstY + frame.scaleY * height;
  return {
    kind: "rect",
    left: Math.min(firstX, lastX),
    right: Math.max(firstX, lastX),
    top: Math.min(firstY, lastY),
    bottom: Math.max(firstY, lastY),
    opacity: frame.opacity,
    fill: frame.fill,
    fillOpacity: frame.fillOpacity,
    paintIndex,
    attributes,
  };
}

/** Inputs for assertText. */
type AssertTextOptions = {
  frame: Frame;
  token: string;
  canvas?: { width: number; height: number };
  paint?: SvgPaintEnvelope[];
  paintIndex: number;
};

function _assertText({
  frame,
  token,
  canvas,
  paint,
  paintIndex,
}: Readonly<AssertTextOptions>): void {
  const envelope = _getTextEnvelope({ frame, token, paintIndex });
  if (!envelope) {
    return;
  }
  if (canvas) {
    assert.ok(
      envelope.left >= 0 &&
        envelope.right <= canvas.width &&
        envelope.top >= 0 &&
        envelope.bottom <= canvas.height,
      `Text outside canvas: ${JSON.stringify(envelope.text)} at [${envelope.left}, ${envelope.top}, ${envelope.right}, ${envelope.bottom}].`,
    );
  }
  if (envelope.fill !== "none" && envelope.fillOpacity > 0) {
    paint?.push(envelope);
  }
}

/** Inputs for visitToken. */
type VisitTokenOptions = {
  stack: Frame[];
  token: string;
  canvas: { width: number; height: number } | undefined;
  hasRelevantText: boolean;
  paint?: SvgPaintEnvelope[];
  paintIndex?: number;
};

function _visitToken({
  stack,
  token,
  canvas,
  hasRelevantText,
  paint,
  paintIndex = 0,
}: VisitTokenOptions): void {
  const parent = stack.at(-1)!;
  if (token.startsWith("<!--")) {
    return;
  }
  if (!token.startsWith("<")) {
    _assertText({ frame: parent, token, canvas, paint, paintIndex });
    return;
  }
  const closing = token.match(/^<\/([\w:-]+)>$/);
  if (closing) {
    const finished = stack.pop();
    assert.equal(finished?.tag, closing[1], "Unbalanced SVG markup.");
    if (finished?.tag === "tspan" && stack.at(-1)?.cursor && finished.cursor) {
      stack.at(-1)!.cursor = finished.cursor;
    }
    return;
  }
  const opening = token.match(/^<([\w:-]+)\b/);
  assert.ok(opening, "Unsupported SVG markup token.");
  const attributes = getSvgAttributes(token);
  const frame = createSvgFrame({
    parent,
    tag: opening[1],
    attributes,
    hasRelevantText,
  });
  if (frame.tag === "rect" && !frame.isInert && frame.opacity > 0) {
    paint?.push(_getRectangleEnvelope({ frame, attributes, paintIndex }));
  }
  if (!token.endsWith("/>")) {
    stack.push(frame);
  }
}

/**
 * Estimate visible SVG text bounds from attributes in a 960 by 600 canvas.
 * Supports inherited translate/scale, opacity, anchors, font size and scalar
 * text/tspan coordinates. Middle/end anchored spans require absolute x resets.
 * Anchored continuation chunks and other layout features are rejected. Defs
 * are inert.
 * Width uses reviewed per-base Arial advances and conservative grapheme floors.
 * Geometry-only subtrees are ignored after checking balanced markup.
 * Complete grapheme clusters remain intact.
 * This is conservative geometry estimation, not browser font measurement,
 * clipping certification, occlusion detection or a substitute for visual QA.
 */
function _assertSvgTextCanvasBounds({
  markup,
  width = 960,
  height = 600,
}: Readonly<{ markup: string; width?: number; height?: number }>): void {
  assert.ok(width > 0 && height > 0 && Number.isFinite(width + height));
  const stack: Frame[] = [_createRootFrame()];
  const tokens = markup.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
  const relevant = getTextRelevantTokenIndicesFromTokens({ tokens });
  tokens.forEach((token, index) =>
    _visitToken({
      stack,
      token,
      canvas: { width, height },
      hasRelevantText: relevant.has(index),
    }),
  );
  assert.equal(stack.length, 1, "Unbalanced SVG markup.");
}

function _createRootFrame(): Frame {
  return {
    tag: "root",
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    opacity: 1,
    isInert: false,
    fontSize: 16,
    anchor: "start",
    fill: "#000000",
    fillOpacity: 1,
  };
}

/**
 * Extracts conservative actual text lines and rectangle interiors in paint
 * order.
 * Opacity and fill facts are explicit. Hidden/definition subtrees are absent.
 * Rectangle stroke, rounded corners and browser rasterization are not modeled.
 * Existing visible-text transform/layout guards remain enforced.
 */
function _getSvgVisiblePaintEnvelopesFromMarkup(
  markup: string,
): SvgPaintEnvelope[] {
  const stack: Frame[] = [_createRootFrame()],
    paint: SvgPaintEnvelope[] = [];
  const tokens = markup.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
  const relevant = getTextRelevantTokenIndicesFromTokens({
    tokens,
    extraTags: ["rect"],
  });
  tokens.forEach((token, index) =>
    _visitToken({
      stack,
      token,
      canvas: undefined,
      hasRelevantText: relevant.has(index),
      paint,
      paintIndex: index,
    }),
  );
  assert.equal(stack.length, 1, "Unbalanced SVG markup.");
  return paint;
}

function _paintOverlaps({
  first,
  second,
}: {
  first: Readonly<SvgPaintEnvelope>;
  second: Readonly<SvgPaintEnvelope>;
}): boolean {
  return (
    Math.max(first.left, second.left) + 1e-6 <
      Math.min(first.right, second.right) &&
    Math.max(first.top, second.top) + 1e-6 <
      Math.min(first.bottom, second.bottom)
  );
}

/**
 * Checks caller-selected text against other text and later rectangle interiors.
 * Conservative envelopes support focused regressions, not general occlusion QA.
 */
function _assertSvgPaintClearance({
  texts,
  rectangles,
}: Readonly<{
  texts: readonly SvgPaintEnvelope[];
  rectangles: readonly SvgPaintEnvelope[];
}>): void {
  assert.ok(texts.length > 0, "Expected visible text paint.");
  texts.forEach((text, index) => {
    texts
      .slice(index + 1)
      .forEach((other) =>
        assert.equal(
          _paintOverlaps({ first: text, second: other }),
          false,
          `Text overprint: ${text.text} / ${other.text} at ${JSON.stringify([text, other])}`,
        ),
      );
    rectangles
      .filter((rectangle) => rectangle.paintIndex > text.paintIndex)
      .forEach((rectangle) =>
        assert.equal(
          _paintOverlaps({ first: text, second: rectangle }),
          false,
          `Foreground covers ${text.text}: ${JSON.stringify([text, rectangle])}`,
        ),
      );
  });
}

/** Related SvgPaintAssertions operations. */
export const SvgPaintAssertions = {
  /**
   * Estimate visible SVG text bounds from attributes in a 960 by 600 canvas.
   * Supports inherited translate/scale, opacity, anchors, font size and scalar
   * text/tspan coordinates. Middle/end anchored spans require absolute x resets.
   * Anchored continuation chunks and other layout features are rejected. Defs
   * are inert.
   * Width uses reviewed per-base Arial advances and conservative grapheme floors.
   * Geometry-only subtrees are ignored after checking balanced markup.
   * Complete grapheme clusters remain intact.
   * This is conservative geometry estimation, not browser font measurement,
   * clipping certification, occlusion detection or a substitute for visual QA.
   */
  assertTextCanvasBounds: _assertSvgTextCanvasBounds,
  /**
   * Extracts conservative actual text lines and rectangle interiors in paint
   * order.
   * Opacity and fill facts are explicit. Hidden/definition subtrees are absent.
   * Rectangle stroke, rounded corners and browser rasterization are not modeled.
   * Existing visible-text transform/layout guards remain enforced.
   */
  getVisiblePaintEnvelopesFromMarkup: _getSvgVisiblePaintEnvelopesFromMarkup,
  /**
   * Checks caller-selected text against other text and later rectangle interiors.
   * Conservative envelopes support focused regressions, not general occlusion QA.
   */
  assertPaintClearance: _assertSvgPaintClearance,
} satisfies {
  assertTextCanvasBounds: typeof _assertSvgTextCanvasBounds;
  getVisiblePaintEnvelopesFromMarkup: typeof _getSvgVisiblePaintEnvelopesFromMarkup;
  assertPaintClearance: typeof _assertSvgPaintClearance;
};
