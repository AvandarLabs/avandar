import assert from "node:assert/strict";
/** Rejects SVG features whose text paint cannot be measured reliably. */
function _assertSupportedAttributes({
  tag,
  attributes,
}: Readonly<{ tag: string; attributes: Readonly<Attributes> }>): void {
  assert.ok(
    !["use", "foreignObject", "textPath"].includes(tag),
    "Unsupported indirect SVG text layout.",
  );
  if (tag === "svg") {
    ["viewBox", "x", "y", "width", "height"].forEach((key) => {
      return assert.equal(
        attributes[key],
        undefined,
        `Unsupported SVG viewport ${key}.`,
      );
    });
  }
  [
    "style",
    "clip-path",
    "mask",
    "filter",
    "textLength",
    "lengthAdjust",
    "rotate",
    "writing-mode",
    "letter-spacing",
    "word-spacing",
    "dominant-baseline",
  ].forEach((key) => {
    return assert.equal(
      attributes[key],
      undefined,
      `Unsupported relevant SVG ${key}.`,
    );
  });
}
/** Gets the inherited text cursor after applying an element's coordinates. */
function _getCursorFromFrame({
  tag,
  attributes,
  parent,
  frame,
}: Readonly<{
  tag: string;
  attributes: Readonly<Attributes>;
  parent: Readonly<Frame>;
  frame: Readonly<Frame>;
}>): Frame["cursor"] {
  if (tag === "text" || tag === "tspan") {
    const position =
      tag === "text" ? { x: 0, y: 0, hasText: false } : parent.cursor;
    assert.ok(position, "A tspan must belong to text.");
    if (tag === "tspan" && attributes.x === undefined) {
      assert.ok(
        frame.anchor === "start" && parent.anchor === "start",
        "Unsupported anchored continuation without an absolute x reset.",
      );
    }
    return {
      x:
        _getSvgNumber({ value: attributes.x, fallback: position.x }) +
        _getSvgNumber({ value: attributes.dx, fallback: 0 }),
      y:
        _getSvgNumber({ value: attributes.y, fallback: position.y }) +
        _getSvgNumber({ value: attributes.dy, fallback: 0 }),
      hasText: attributes.x === undefined && position.hasText,
    };
  }
  return frame.cursor;
}

/** Attribute names and string values parsed from an SVG element. */
export type Attributes = Record<string, string>;

/** Accumulated SVG paint, transform, and text state for frame assertions. */
export type Frame = {
  tag: string;
  fill: string;
  fillOpacity: number;
  ariaLabel?: string;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  opacity: number;
  isInert: boolean;
  fontSize: number;
  anchor: string;
  cursor?: { x: number; y: number; hasText: boolean };
};

/** Parses a supported finite SVG numeric coordinate. */
function _getSvgNumber({
  value,
  fallback,
}: Readonly<{
  value: string | undefined;
  fallback: number;
}>): number {
  if (value === undefined) {
    return fallback;
  }
  assert.match(
    value,
    /^[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?(?:px)?$/i,
    "Unsupported SVG numeric layout.",
  );
  const number = Number(value.replace(/px$/, ""));
  assert.ok(Number.isFinite(number), "Nonfinite SVG layout.");
  return number;
}

/** Decodes supported XML character references. */
function _makeDecodedTextFromSvgEntities(value: string): string {
  return value.replace(/&([^;]+);/g, (_, entity: string) => {
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
    };
    if (entity in named) {
      return named[entity];
    }
    assert.match(entity, /^#(?:x[\da-f]+|\d+)$/i, "Unsupported XML entity.");
    return String.fromCodePoint(
      parseInt(
        entity.slice(entity[1].toLowerCase() === "x" ? 2 : 1),
        entity[1].toLowerCase() === "x" ? 16 : 10,
      ),
    );
  });
}

/** Reads quoted SVG attributes and decodes their values. */
function _getSvgAttributes(token: string): Attributes {
  return Object.fromEntries(
    Array.from(
      token.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g),
      ([, name, double, single]) => {
        return [name, _makeDecodedTextFromSvgEntities(double ?? single)];
      },
    ),
  );
}

function _transform({
  frame,
  value,
}: Readonly<{ frame: Frame; value: string }>): Frame {
  const operations = Array.from(
    value.matchAll(/(translate|scale)\(([^)]*)\)/g),
  );
  const remainder = value.replace(/(translate|scale)\(([^)]*)\)/g, "").trim();
  assert.equal(remainder, "", "Unsupported relevant SVG transform.");
  return operations.reduce((current, [, operation, argumentsText]) => {
    const values = argumentsText
      .trim()
      .split(/[\s,]+/)
      .map((part) => {
        return _getSvgNumber({ value: part, fallback: 0 });
      });
    assert.ok(
      values.length >= 1 && values.length <= 2,
      "Unsupported transform arguments.",
    );
    return operation === "translate"
      ? {
          ...current,
          translateX: current.translateX + current.scaleX * values[0],
          translateY: current.translateY + current.scaleY * (values[1] ?? 0),
        }
      : {
          ...current,
          scaleX: current.scaleX * values[0],
          scaleY: current.scaleY * (values[1] ?? values[0]),
        };
  }, frame);
}

/** Inputs for createFrame. */
type CreateFrameOptions = {
  parent: Frame;
  tag: string;
  attributes: Attributes;
  hasRelevantText: boolean;
};

/**
 * Creates inherited SVG layout state and validates relevant paint attributes.
 */
function _makeFrameFromSvg(options: Readonly<CreateFrameOptions>): Frame {
  const { parent, tag, attributes, hasRelevantText } = options;
  const isInert =
    parent.isInert ||
    !hasRelevantText ||
    ["defs", "clipPath", "mask", "symbol"].includes(tag);
  const opacity =
    parent.opacity *
    _getSvgNumber({ value: attributes.opacity, fallback: 1 }) *
    (attributes.display === "none" || attributes.visibility === "hidden"
      ? 0
      : 1);
  if (isInert || opacity === 0) {
    return { ...parent, tag, isInert, opacity };
  }
  _assertSupportedAttributes({ tag, attributes });
  const frame = _transform({
    frame: {
      ...parent,
      tag,
      isInert,
      opacity,
      fontSize: _getSvgNumber({
        value: attributes["font-size"],
        fallback: parent.fontSize,
      }),
      anchor: attributes["text-anchor"] ?? parent.anchor,
      fill: attributes.fill ?? parent.fill,
      fillOpacity: _getSvgNumber({
        value: attributes["fill-opacity"],
        fallback: parent.fillOpacity,
      }),
      ariaLabel: attributes["aria-label"] ?? parent.ariaLabel,
    },
    value: attributes.transform ?? "",
  });
  assert.ok(
    ["start", "middle", "end"].includes(frame.anchor),
    "Unsupported SVG text anchor.",
  );
  const cursor = _getCursorFromFrame({ tag, attributes, parent, frame });
  return { ...frame, ...(tag === "text" || tag === "tspan" ? { cursor } : {}) };
}

/** Parses inherited SVG paint and layout state for visible text assertions. */
export const SvgFrames = {
  /** Parses a supported finite SVG numeric coordinate. */
  getSvgNumber: _getSvgNumber,
  /** Decodes supported XML character references. */
  makeDecodedTextFromSvgEntities: _makeDecodedTextFromSvgEntities,
  /** Reads quoted SVG attributes and decodes their values. */
  getSvgAttributes: _getSvgAttributes,
  /**
   * Creates inherited SVG layout state and validates relevant paint attributes.
   */
  makeFrameFromSvg: _makeFrameFromSvg,
};
