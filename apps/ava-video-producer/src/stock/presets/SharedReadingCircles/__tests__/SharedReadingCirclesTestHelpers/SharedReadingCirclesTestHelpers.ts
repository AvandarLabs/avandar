/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { SharedReadingCircles } from "../../SharedReadingCircles";
import { sharedReadingCirclesContract as contract } from "../../SharedReadingCircles.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  denseInput,
  minimumInput,
} from "../../SharedReadingCircles.fixtures";
import { inputSchema, type Input } from "../../SharedReadingCircles.schema";
import { getPointsFromSvgPath } from "./getPointsFromSvgPath";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(SharedReadingCircles, {
        frame,
        input,
        accent: "#81d7bd",
        id: "packet15",
      }),
    ),
  );
}
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.books,
    input.labels.class,
    input.labels.readers,
    input.caption,
    ...input.learners.map(prop("label")),
    ...input.books.flatMap((book) => {
      return frame >= (input.startingShelf === "side" ? 118 : 108)
        ? [book.label, book.pageLabel]
        : [book.label];
    }),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "bookId", "learnerIds", "startingShelf"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
function _bookPositions(markup: string): number[][] {
  return [
    ...markup.matchAll(
      /data-book-id="[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
    ),
  ].map((match) => {
    return [Number(match[1]), Number(match[2])];
  });
}
function _createCrossingInput(): Input {
  return {
    ...DEFAULT_INPUT,
    learners: Array.from({ length: 8 }, (_, index) => {
      return { id: `l${index}`, label: `Learner ${index + 1}` };
    }),
    books: Array.from({ length: 3 }, (_, index) => {
      return {
        id: `b${index}`,
        label: `Book ${index + 1}`,
        pageLabel: `Passage ${index + 1}`,
      };
    }),
    readingGroups: [
      { bookId: "b2", learnerIds: ["l7"] },
      { bookId: "b0", learnerIds: ["l0", "l1", "l2", "l3"] },
      { bookId: "b1", learnerIds: ["l4", "l5", "l6"] },
    ],
    startingShelf: "front",
    showGroupCounts: false,
  };
}
function _getReaderPosition({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): number[] {
  const reader = markup.match(
    new RegExp(
      `data-reader-id="${id}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
    ),
  );
  assert.ok(reader);
  return [Number(reader[1]), Number(reader[2])];
}
type Bounds = { left: number; right: number; top: number; bottom: number };
function _getBoundsFromPoints({
  points,
  stroke,
}: {
  points: number[][];
  stroke: number;
}): Bounds {
  return {
    left:
      Math.min(
        ...points.map(([x]) => {
          return x;
        }),
      ) - stroke,
    right:
      Math.max(
        ...points.map(([x]) => {
          return x;
        }),
      ) + stroke,
    top:
      Math.min(
        ...points.map(([, y]) => {
          return y;
        }),
      ) - stroke,
    bottom:
      Math.max(
        ...points.map(([, y]) => {
          return y;
        }),
      ) + stroke,
  };
}
function _getReaderShapeBounds(segment: string): Bounds[] {
  const person = segment.match(
    /scale\(([-.\d]+)\)"[^>]*stroke-width="([-.\d]+)"[^>]*>[\s\S]*?<circle[^>]*cy="([-.\d]+)" r="([-.\d]+)"[^>]*><\/circle><path d="([^"]+)"/,
  );
  assert.ok(person);
  const scale = Number(person[1]);
  const radius = (Number(person[4]) + Number(person[2]) / 2) * scale;
  const centerY = Number(person[3]) * scale;
  const body = getPointsFromSvgPath(person[5]).map(([x, y]) => {
    return [x * scale, y * scale];
  });
  const seat = segment.match(/data-reading-seat="[^"]+" d="([^"]+)"/);
  assert.ok(seat);
  return [
    {
      left: -radius,
      right: radius,
      top: centerY - radius,
      bottom: centerY + radius,
    },
    _getBoundsFromPoints({
      points: body,
      stroke: (Number(person[2]) * scale) / 2,
    }),
    _getBoundsFromPoints({ points: getPointsFromSvgPath(seat[1]), stroke: 1 }),
  ];
}
function _getReaderKeyBounds({
  segment,
  key,
}: {
  segment: string;
  key: string;
}): Bounds {
  const keyText = segment.match(
    new RegExp(
      `<text aria-label="${key}" x="([-.\\d]+)" y="([-.\\d]+)"[^>]*font-size="([-.\\d]+)"`,
    ),
  );
  assert.ok(keyText);
  const x = Number(keyText[1]);
  const y = Number(keyText[2]);
  const fontSize = Number(keyText[3]);
  return {
    left: x,
    right: x + getConservativeWidthFromText({ text: key, fontSize }),
    top: y - fontSize,
    bottom: y + fontSize / 4,
  };
}
function _getReaderBounds({
  markup,
  id,
  key,
}: {
  markup: string;
  id: string;
  key: string;
}): Bounds & { identityBounds: Bounds[] } {
  const [x, y] = _getReaderPosition({ markup, id });
  const segment = markup
    .split(`data-reader-id="${id}"`)[1]
    .split("data-reader-id=")[0];
  const shapes = [
    ..._getReaderShapeBounds(segment),
    _getReaderKeyBounds({ segment, key }),
  ].map((shape) => {
    return {
      left: shape.left + x,
      right: shape.right + x,
      top: shape.top + y,
      bottom: shape.bottom + y,
    };
  });
  return {
    identityBounds: [shapes[0], shapes[3]],
    left: Math.min(...shapes.map(prop("left"))),
    right: Math.max(...shapes.map(prop("right"))),
    top: Math.min(...shapes.map(prop("top"))),
    bottom: Math.max(...shapes.map(prop("bottom"))),
  };
}
function _assertReaderSeparation({
  input,
  frame,
}: {
  input: Input;
  frame: number;
}): void {
  const markup = _render({ frame, input });
  assert.equal(_bookPositions(markup).length, input.books.length);
  _bookPositions(markup).forEach(([, bookY]) => {
    return assert.ok(
      bookY - 20 > 188.6,
      `${input.startingShelf} frame ${frame}: book enters maximum-label roster rail`,
    );
  });
  input.learners.forEach(({ id }) => {
    return assert.equal(markup.split(`data-reader-id="${id}"`).length - 1, 1);
  });
  const bounds = input.learners.map((learner, index) => {
    return _getReaderBounds({ markup, id: learner.id, key: String(index + 1) });
  });
  _assertReaderSceneClearance({ input, frame, markup, bounds });
}
function _createRouteInputs(): Input[] {
  const exact = _createCrossingInput();
  const books = [
    ...exact.books,
    { id: "b3", label: "界".repeat(22), pageLabel: "界".repeat(28) },
  ];
  const groups = [
    [
      ["l6", "l7"],
      ["l4", "l5"],
      ["l2", "l3"],
      ["l0", "l1"],
    ],
    [["l7"], ["l6"], ["l4", "l5"], ["l0", "l1", "l2", "l3"]],
    [["l3", "l0", "l7", "l2"], ["l6", "l1"], ["l5"], ["l4"]],
  ];
  return [
    exact,
    DEFAULT_INPUT,
    denseInput,
    minimumInput,
    changedInput,
    {
      ...exact,
      books: exact.books.slice(0, 2),
      readingGroups: [
        { bookId: "b1", learnerIds: ["l7", "l2", "l5", "l0"] },
        { bookId: "b0", learnerIds: ["l3", "l6", "l1", "l4"] },
      ],
    },
    ...[1, 2, 3].map((largeGroupIndex) => {
      const readingGroups = denseInput.readingGroups.slice(1);
      readingGroups.splice(largeGroupIndex, 0, denseInput.readingGroups[0]);
      return { ...denseInput, readingGroups };
    }),
    ...groups.map((members) => {
      return _createGroupedReadingRoute({ exact, books, members });
    }),
  ];
}
export {
  _render,
  _getVisibleTexts,
  options,
  _bookPositions,
  _createCrossingInput,
  _getReaderPosition,
  getPointsFromSvgPath,
  _getBoundsFromPoints,
  _getReaderShapeBounds,
  _getReaderKeyBounds,
  _getReaderBounds,
  _assertReaderSeparation,
  _createRouteInputs,
};
export type { Bounds };

/** Checks reader envelopes clear moving books and one another. */
function _assertReaderSceneClearance(
  scene: Readonly<ReaderSceneClearanceOptions>,
): void {
  const { input, frame, markup, bounds } = scene;

  bounds.forEach((reader, index) => {
    _bookPositions(markup).forEach(([bookX, bookY]) => {
      const openingStart = input.startingShelf === "front" ? 94 : 104;
      const halfWidth = frame <= openingStart ? 23 : 41;
      reader.identityBounds.forEach((identity) => {
        return assert.ok(
          identity.right <= bookX - halfWidth ||
            identity.left >= bookX + halfWidth ||
            identity.bottom <= bookY - 22 ||
            identity.top >= bookY + 24,
          `${input.startingShelf} frame ${frame}: book obscures reader ${index + 1} head or key`,
        );
      });
    });
    assert.ok(
      reader.left >= 0 &&
        reader.right <= 960 &&
        reader.top > 188.6 &&
        reader.bottom < 435,
      `${frame}: reader ${index + 1} outside scene lane ${JSON.stringify(reader)}`,
    );
    bounds.slice(index + 1).forEach((other, offset) => {
      assert.ok(
        reader.right <= other.left ||
          other.right <= reader.left ||
          reader.bottom <= other.top ||
          other.bottom <= reader.top,
        `${input.startingShelf} frame ${frame}: reader ${index + 1} and ${index + offset + 2} envelopes overlap ${JSON.stringify([reader, other])}`,
      );
    });
  });
}

/** Reader envelopes and the scene state used for collision assertions. */
type ReaderSceneClearanceOptions = {
  input: Input;
  frame: number;
  markup: string;
  bounds: Array<ReturnType<typeof _getReaderBounds>>;
};

/** Returns one dense route while retaining the supplied group order. */
function _createGroupedReadingRoute({
  exact,
  books,
  members,
}: Readonly<{
  exact: Input;
  books: Input["books"];
  members: string[][];
}>): Input {
  return {
    ...exact,
    learners: exact.learners.map((learner) => {
      return { ...learner, label: "界".repeat(16) };
    }),
    books: books.map((book) => {
      return {
        ...book,
        label: "界".repeat(22),
        pageLabel: "界".repeat(28),
      };
    }),
    labels: denseInput.labels,
    caption: denseInput.caption,
    readingGroups: members.map((learnerIds, index) => {
      return { bookId: `b${3 - index}`, learnerIds };
    }),
  };
}
