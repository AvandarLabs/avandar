import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { sharedReadingCirclesContract as contract } from "../SharedReadingCircles.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  denseInput,
  minimumInput,
} from "../SharedReadingCircles.fixtures";
import { inputSchema } from "../SharedReadingCircles.schema";
import { assertFirstReaderPicksUpStartingShelf as _assertFirstReaderPicksUpStartingShelf } from "./assertFirstReaderPicksUpStartingShelf";
import { assertFourCopiesNonuniformReaderStartingShelf as _assertFourCopiesNonuniformReaderStartingShelf } from "./assertFourCopiesNonuniformReaderStartingShelf";
import {
  _render,
  options,
  _bookPositions,
  _createCrossingInput,
  _getReaderPosition,
} from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

test("book inventory and reader identities survive shelf-to-table travel", () => {
  [0, 36, 64.5, 90, 150].forEach((frame) => {
    const markup = _render({ frame, input: changedInput });
    assert.equal([...markup.matchAll(/data-book-id="book-a"/g)].length, 1);
    changedInput.learners.forEach((learner) => {
      return assert.equal(
        markup.split(`data-reader-id="${learner.id}"`).length - 1,
        1,
      );
    });
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("four copies and nonuniform reader groups survive both shelf positions and hidden counts", () => {
  (["front", "side"] as const).forEach((startingShelf) => {
    return _assertFourCopiesNonuniformReaderStartingShelf(startingShelf);
  });
  assert.match(
    _render({ frame: 150, input: denseInput }),
    /aria-label="4 \/ 8"/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...denseInput, showGroupCounts: false } }),
    /aria-label="4 \/ 8"/,
  );
});

test("the first reader picks up and carries the single physical copy with hand contact", () => {
  (["front", "side"] as const).forEach((startingShelf) => {
    return _assertFirstReaderPicksUpStartingShelf(startingShelf);
  });
});

test("every book is assigned once and references do not mutate during stress registration", () => {
  [
    undefined,
    {},
    {
      ...DEFAULT_INPUT,
      books: [...DEFAULT_INPUT.books, DEFAULT_INPUT.books[0]],
    },
    {
      ...minimumInput,
      readingGroups: [{ bookId: "book-a", learnerIds: ["a", "b", "a"] }],
    },
    { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: "x" } },
    {
      ...DEFAULT_INPUT,
      books: [
        { ...DEFAULT_INPUT.books[0], pageLabel: "x".repeat(29) },
        DEFAULT_INPUT.books[1],
      ],
    },
  ].forEach((value) => {
    return assert.equal(inputSchema.safeParse(value).success, false);
  });
  assert.deepEqual(denseInput.readingGroups[0].learnerIds, [
    "reader 0",
    "reader 1",
    "reader 2",
    "reader 3",
  ]);
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(contract.semanticRules),
  ) as typeof contract.semanticRules;
  assert.ok(
    rules.some((rule) => {
      return (
        rule.paths.includes("readingGroups.*.learnerIds") &&
        rule.description.includes("exactly once")
      );
    }),
  );
});

test("every moving physical copy has a visible key matching its caption", () => {
  [24, 64.5, 124, 150].forEach((frame) => {
    const markup = _render({
      frame,
      input: { ...denseInput, startingShelf: "side" },
    });
    denseInput.readingGroups.forEach((group, index) => {
      assert.match(
        markup,
        new RegExp(
          `data-book-key="${group.bookId}"[^>]*>[\\s\\S]*?aria-label="${index + 1}"`,
        ),
      );
      assert.match(
        markup,
        new RegExp(
          `data-book-caption-key="${group.bookId}"[^>]*>[\\s\\S]*?aria-label="${index + 1}"`,
        ),
      );
    });
  });
});

test("concentrated groups remain intact when the large group changes table position", () => {
  [0, 1, 2, 3].forEach((largeGroupIndex) => {
    const groups = denseInput.readingGroups.slice(1);
    groups.splice(largeGroupIndex, 0, denseInput.readingGroups[0]);
    (["front", "side"] as const).forEach((startingShelf) => {
      const input = { ...denseInput, readingGroups: groups, startingShelf };
      assert.deepEqual(inputSchema.parse(input), input);
      [24, 44, 64.5, 94, 108, 124, 150].forEach((frame) => {
        const markup = _render({ frame, input });
        assert.equal(_bookPositions(markup).length, 4);
        const readers = [
          ...markup.matchAll(
            /data-reader-id="([^"]+)" data-reader-book="([^"]+)"/g,
          ),
        ];
        assert.equal(readers.length, 8);
        readers.forEach((reader) => {
          return assert.ok(
            groups
              .find(propEq("bookId", reader[2]))!
              .learnerIds.includes(reader[1]),
          );
        });
      });
    });
  });
});

test("seats physically pivot toward their group book and clear the caption rail", () => {
  const paths = (markup: string) => {
    return [...markup.matchAll(/data-reading-seat="([^"]+)" d="([^"]+)"/g)];
  };
  const setup = paths(_render({ frame: 0, input: denseInput }));
  const hold = paths(_render({ frame: 150, input: denseInput }));
  assert.equal(hold.length, 8);
  hold.forEach((seat, index) => {
    return assert.notEqual(seat[2], setup[index][2]);
  });
  [44, 64.5, 94, 108, 150].forEach((frame) => {
    const markup = _render({ frame, input: denseInput });
    paths(markup).forEach((seat) => {
      const reader = markup.match(
        new RegExp(
          `data-reader-id="${seat[1]}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
        ),
      );
      assert.ok(reader);
      const points = seat[2]
        .match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g)!
        .map(Number);
      points.forEach((coordinate, index) => {
        return assert.ok(
          index % 2 === 0
            ? Number(reader[1]) + coordinate >= 0 &&
                Number(reader[1]) + coordinate <= 960
            : Number(reader[2]) + coordinate < 435,
        );
      });
    });
  });
});

test("reordered front pickup keeps the exact l0 and l7 heads distinct at frame 36", () => {
  const input = _createCrossingInput();
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 36, input });
  const [firstX, firstY] = _getReaderPosition({ markup, id: "l0" });
  const [lastX, lastY] = _getReaderPosition({ markup, id: "l7" });
  const fullHeadDiameter = (2 * 7 + 2.5) * (40 / 48);
  const centerDistance = Math.hypot(firstX - lastX, firstY - lastY);
  assert.ok(
    centerDistance >= fullHeadDiameter,
    `l0/l7 head centers ${centerDistance} apart, full stroked diameter ${fullHeadDiameter}`,
  );
});
