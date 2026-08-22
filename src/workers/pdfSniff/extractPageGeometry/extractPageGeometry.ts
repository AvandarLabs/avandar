import type {
  BBox,
  PageGeometry,
  PathMark,
  PathPoint,
  RuleSegment,
  TextItem,
} from "../pdfSniff.types";
import type { PDFPageProxy } from "pdfjs-dist";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import { assembleWords } from "../assembleWords/assembleWords";

/**
 * A rule thinner than this many points is treated as a line rather than a
 * filled shape. Journal tables draw rules at 0.5 to 1.5 points; a filled
 * header band is typically 8 points or more.
 */
const MAX_RULE_THICKNESS = 3;

/** A segment shorter than this is noise, not a table rule. */
const MIN_RULE_LENGTH = 8;

/**
 * Below this many text items, a page carrying a large image is almost
 * certainly a scan. Real pages have hundreds of items; a scanned page often
 * has a handful from a header stamp or an OCR-free watermark.
 */
const SCANNED_PAGE_MAX_TEXT_ITEMS = 10;

/** Codepoints in the Unicode private use area, plus the replacement char. */
const UNMAPPED_CHAR = /[\uE000-\uF8FF\uFFFD]/gu;

/**
 * Sub-operators inside a `constructPath` operator-list entry, encoding a
 * flattened path as `[op, ...coords, op, ...coords, ...]`.
 *
 * This numbering is NOT part of pdfjs-dist's public API: it is an internal
 * enum (named `DrawOPS` in the pdfjs-dist 6.2.108 bundle) used only to pack
 * path data inside operator-list args, and it is not exported from the
 * package. There is no supported way to obtain it, so the values below were
 * read directly out of
 * `node_modules/pdfjs-dist/legacy/build/pdf.mjs` for this pinned version and
 * cross-checked by dumping a real operator list (see task report). If a
 * future pdfjs-dist upgrade renumbers or restructures this, the rule
 * extraction below will silently stop finding rules, so re-verify this
 * mapping against the new bundle when upgrading.
 */
const DRAW_OPS = {
  moveTo: 0,
  lineTo: 1,
  curveTo: 2,
  quadraticCurveTo: 3,
  closePath: 4,
} as const;

/** Stop collecting marks past this many so a vector map cannot blow memory. */
const MAX_MARKS_PER_PAGE = 2500;

/** Paths covering this much of the page are clips or backgrounds, not marks. */
const PAGE_COVER_FRACTION = 0.8;

const FILL_PAINT = new Set<number>([
  pdfjs.OPS.fill,
  pdfjs.OPS.eoFill,
  pdfjs.OPS.fillStroke,
  pdfjs.OPS.eoFillStroke,
  pdfjs.OPS.closeFillStroke,
  pdfjs.OPS.closeEOFillStroke,
]);

type PathGeometry = {
  rules: RuleSegment[];
  marks: PathMark[];
  marksTruncated: boolean;
};

type MarkBuffer = {
  points: PathPoint[];
  closed: boolean;
};

function _markBBox(points: readonly PathPoint[]): BBox {
  return [
    Math.min(
      ...points.map((point) => {
        return point.x;
      }),
    ),
    Math.min(
      ...points.map((point) => {
        return point.y;
      }),
    ),
    Math.max(
      ...points.map((point) => {
        return point.x;
      }),
    ),
    Math.max(
      ...points.map((point) => {
        return point.y;
      }),
    ),
  ];
}

function _centerOnPage(
  bbox: BBox,
  pageWidth: number,
  pageHeight: number,
): boolean {
  const centerX = (bbox[0] + bbox[2]) / 2;
  const centerY = (bbox[1] + bbox[3]) / 2;
  return (
    centerX >= 0 &&
    centerX <= pageWidth &&
    centerY >= 0 &&
    centerY <= pageHeight
  );
}

function _coversPage(
  bbox: BBox,
  pageWidth: number,
  pageHeight: number,
): boolean {
  const width = Math.max(0, bbox[2] - bbox[0]);
  const height = Math.max(0, bbox[3] - bbox[1]);
  return width * height >= PAGE_COVER_FRACTION * pageWidth * pageHeight;
}

function _flushMark(
  geometry: PathGeometry,
  buffer: MarkBuffer,
  isFilled: boolean,
  pageWidth: number,
  pageHeight: number,
): void {
  if (buffer.points.length < 2) {
    return;
  }
  if (geometry.marks.length >= MAX_MARKS_PER_PAGE) {
    geometry.marksTruncated = true;
    return;
  }
  const bbox = _markBBox(buffer.points);
  if (
    !_centerOnPage(bbox, pageWidth, pageHeight) ||
    _coversPage(bbox, pageWidth, pageHeight)
  ) {
    return;
  }
  geometry.marks.push({
    kind: buffer.closed ? "closed" : "polyline",
    points: buffer.points,
    bbox,
    isFilled,
    fill: null,
  });
}

function _emptyBuffer(): MarkBuffer {
  return { points: [], closed: false };
}

function _unmappedCharRatio(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  const unmapped = text.match(UNMAPPED_CHAR)?.length ?? 0;
  return unmapped / text.length;
}

/**
 * Walks the page's operator list and pulls out axis-aligned rules and the
 * vector marks that rules discard.
 *
 * This is the lattice signal's raw input, and it is why we do not need
 * computer vision: Camelot rasterizes the page and runs OpenCV morphology to
 * rediscover lines the generator already told us about, whereas we read the
 * original vector geometry straight out of the content stream.
 *
 * Both stroked paths and thin filled rectangles count, because generators
 * differ in which they emit for a table rule. In pdfjs-dist 6.x there is no
 * separate `constructPath` sub-op for rectangles: `re` (rectangle) operators
 * are expanded into a moveTo/lineTo/lineTo/lineTo/closePath path before they
 * ever reach the operator list, so a plain path walk that treats every
 * segment (including the implicit closing segment) as a candidate rule
 * naturally covers both stroked rules and thin filled rectangles, with no
 * separate rectangle-specific branch needed.
 */
async function _extractVectors(page: PDFPageProxy): Promise<PathGeometry> {
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
  const operatorList = await page.getOperatorList();
  const geometry: PathGeometry = {
    rules: [],
    marks: [],
    marksTruncated: false,
  };

  for (let i = 0; i < operatorList.fnArray.length; i += 1) {
    if (operatorList.fnArray[i] !== pdfjs.OPS.constructPath) {
      continue;
    }
    // Operator-list args for `constructPath` are `[paintOp, dataHolder,
    // minMax]`: the sub-operator that paints the path (fill/stroke/etc.), a
    // one-element array whose single entry is a flat array-like of
    // `DRAW_OPS` op codes interleaved with coordinates (pdf.js's renderer
    // destructures this as `let [path] = data;` and later overwrites that
    // same slot with a cached `Path2D`), and the path's axis-aligned
    // bounding box. We only need the flat coordinate data.
    const args = operatorList.argsArray[i] as
      | [number, [ArrayLike<number>], ArrayLike<number>]
      | undefined;
    if (!args) {
      continue;
    }
    const [paintOp, [pathData]] = args;
    _walkConstructPath({
      geometry,
      pathData,
      isFilled: FILL_PAINT.has(paintOp),
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    });
  }

  return geometry;
}

function _walkConstructPath(options: {
  geometry: PathGeometry;
  pathData: ArrayLike<number>;
  isFilled: boolean;
  pageWidth: number;
  pageHeight: number;
}): void {
  const { geometry, pathData, isFilled, pageWidth, pageHeight } = options;
  let index = 0;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let buffer = _emptyBuffer();

  const flush = (): void => {
    _flushMark(geometry, buffer, isFilled, pageWidth, pageHeight);
    buffer = _emptyBuffer();
  };

  while (index < pathData.length) {
    const op = pathData[index];
    index += 1;

    if (op === DRAW_OPS.moveTo) {
      flush();
      currentX = pathData[index] ?? 0;
      currentY = pathData[index + 1] ?? 0;
      index += 2;
      startX = currentX;
      startY = currentY;
      buffer.points.push({ x: currentX, y: currentY });
    } else if (op === DRAW_OPS.lineTo) {
      const nextX = pathData[index] ?? 0;
      const nextY = pathData[index + 1] ?? 0;
      index += 2;
      _pushIfAxisAligned(geometry.rules, currentX, currentY, nextX, nextY);
      currentX = nextX;
      currentY = nextY;
      buffer.points.push({ x: currentX, y: currentY });
    } else if (op === DRAW_OPS.curveTo) {
      // Keep the endpoint so a marker circle still has a bbox centre.
      index += 6;
      currentX = pathData[index - 2] ?? currentX;
      currentY = pathData[index - 1] ?? currentY;
      buffer.points.push({ x: currentX, y: currentY });
    } else if (op === DRAW_OPS.quadraticCurveTo) {
      index += 4;
      currentX = pathData[index - 2] ?? currentX;
      currentY = pathData[index - 1] ?? currentY;
      buffer.points.push({ x: currentX, y: currentY });
    } else if (op === DRAW_OPS.closePath) {
      _pushIfAxisAligned(geometry.rules, currentX, currentY, startX, startY);
      currentX = startX;
      currentY = startY;
      buffer.closed = true;
    } else {
      // An op code we don't recognise means our reading of the coordinate
      // layout may already be off; stop walking this path rather than
      // risk misinterpreting the remaining coordinates as op codes.
      break;
    }
  }
  flush();
}

function _pushIfAxisAligned(
  rules: RuleSegment[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);

  if (dy <= MAX_RULE_THICKNESS && dx >= MIN_RULE_LENGTH) {
    rules.push({
      orientation: "horizontal",
      position: (y0 + y1) / 2,
      span: [Math.min(x0, x1), Math.max(x0, x1)],
    });
    return;
  }
  if (dx <= MAX_RULE_THICKNESS && dy >= MIN_RULE_LENGTH) {
    rules.push({
      orientation: "vertical",
      position: (x0 + x1) / 2,
      span: [Math.min(y0, y1), Math.max(y0, y1)],
    });
  }
}

/**
 * Normalises one page into geometry no downstream code has to understand
 * pdf.js to consume.
 *
 * Two responsibilities live here and nowhere else: applying the page's
 * rotation via the viewport, and sorting text items into visual reading
 * order. pdf.js hands back items in content-stream order, which for many
 * generators is unrelated to where the text appears.
 */
export async function extractPageGeometry(options: {
  page: PDFPageProxy;
  pageIndex: number;
}): Promise<PageGeometry> {
  const { page, pageIndex } = options;
  // Requesting the viewport at scale 1 with the page's own rotation gives us
  // dimensions and coordinates already corrected for landscape pages.
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
  const textContent = await page.getTextContent();

  const textItems: TextItem[] = textContent.items
    .flatMap((rawItem) => {
      if (!("str" in rawItem)) {
        return [];
      }
      const text = rawItem.str;
      if (text.length === 0) {
        return [];
      }
      // transform is [a, b, c, d, e, f]; e and f are the translation.
      const x = rawItem.transform[4] ?? 0;
      const y = rawItem.transform[5] ?? 0;
      return [
        {
          text,
          x,
          y,
          width: rawItem.width ?? 0,
          height: rawItem.height ?? 0,
          fontName: rawItem.fontName ?? "",
          unmappedCharRatio: _unmappedCharRatio(text),
        },
      ];
    })
    .sort((a, b) => {
      // Top to bottom first. y grows upward in PDF space, so a larger y is
      // higher on the page and sorts first.
      const yDelta = b.y - a.y;
      if (Math.abs(yDelta) > 1) {
        return yDelta;
      }
      return a.x - b.x;
    });

  const vectors = await _extractVectors(page);

  return {
    pageIndex,
    width: viewport.width,
    height: viewport.height,
    textItems: assembleWords(textItems),
    rules: vectors.rules,
    marks: vectors.marks,
    marksTruncated: vectors.marksTruncated,
    looksScanned: textItems.length <= SCANNED_PAGE_MAX_TEXT_ITEMS,
  };
}
