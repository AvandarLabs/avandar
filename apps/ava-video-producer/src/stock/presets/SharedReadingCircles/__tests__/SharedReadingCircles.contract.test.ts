/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { sharedReadingCirclesContract as contract } from ".././SharedReadingCircles.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  denseInput,
  minimumInput,
} from ".././SharedReadingCircles.fixtures";
import { inputSchema } from ".././SharedReadingCircles.schema";
import {
  _render,
  options,
  _bookPositions,
  _createCrossingInput,
  _getReaderPosition,
  _createRouteInputs,
} from "./SharedReadingCirclesTestHelpers";

test("book inventory and reader identities survive shelf-to-table travel", () => {
  [0, 36, 64.5, 90, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: changedInput });
    assert.equal([...markup.matchAll(/data-book-id="book-a"/g)].length, 1);
    changedInput.learners.forEach((learner) =>
      assert.equal(
        markup.split(`data-reader-id="${learner.id}"`).length - 1,
        1,
      ),
    );
  });
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("four copies and nonuniform reader groups survive both shelf positions and hidden counts", () => {
  (["front", "side"] as const).forEach((startingShelf) => {
    [true, false].forEach((showGroupCounts) => {
      [denseInput, changedInput, minimumInput].forEach((fixture) => {
        const input = { ...fixture, startingShelf, showGroupCounts };
        [
          0, 24, 43.999, 44, 44.001, 64.5, 93.999, 94, 94.001, 107.999, 108,
          108.001, 124, 150,
        ].forEach((frame) => {
          const markup = _render({ frame: frame, input: input });
          assert.equal(_bookPositions(markup).length, input.books.length);
          _bookPositions(markup).forEach(([, bookY]) =>
            assert.ok(
              bookY - 20 > 188.6,
              `${input.startingShelf} frame ${frame}: book enters maximum-label roster rail`,
            ),
          );
          input.learners.forEach((learner) => {
            const group = input.readingGroups.find((candidate) =>
              candidate.learnerIds.includes(learner.id),
            )!;
            assert.equal(
              markup.split(
                `data-reader-id="${learner.id}" data-reader-book="${group.bookId}"`,
              ).length - 1,
              1,
            );
          });
          _bookPositions(markup).forEach(([x, y], index, positions) => {
            const halfWidth = frame <= 94 ? 23 : 41;
            assert.ok(
              x - halfWidth >= 0 &&
                x + halfWidth <= 960 &&
                y - 22 > 180 &&
                y + 24 < 440,
            );
            positions
              .slice(index + 1)
              .forEach(([otherX, otherY]) =>
                assert.ok(
                  Math.abs(x - otherX) >= 2 * halfWidth ||
                    Math.abs(y - otherY) >= 46,
                ),
              );
          });
        });
      });
    });
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
    [denseInput, ..._createRouteInputs()].forEach((fixture) => {
      const input = { ...fixture, startingShelf };
      input.readingGroups.forEach((group, index) => {
        const start = 24 + index * 18;
        const frames =
          startingShelf === "front"
            ? [44, 44.001, 64.5, 93.999, 94]
            : [4, 4.001, 7, 10, 15.5, 19.999, 20, 22.999, 23].map(
                (offset) => start + offset,
              );
        frames.forEach((frame) => {
          const markup = _render({ frame: frame, input: input });
          const books = _bookPositions(markup);
          const [readerX, readerY] = _getReaderPosition({
            markup,
            id: group.learnerIds[0],
          });
          const hand = markup.match(
            new RegExp(
              `data-reading-hand="${group.learnerIds[0]}" d="([^"]+)"`,
            ),
          );
          assert.ok(hand);
          const coordinates = hand[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
          assert.ok(
            Math.abs(
              readerX +
                coordinates.at(-2)! -
                (books[index][0] + (startingShelf === "front" ? 22 : -22)),
            ) < 0.001,
          );
          assert.ok(
            Math.abs(readerY + coordinates.at(-1)! - (books[index][1] - 12)) <
              0.001,
          );
        });
      });
      assert.notDeepEqual(
        _bookPositions(_render({ frame: 24, input: input })),
        _bookPositions(_render({ frame: 101, input: input })),
      );
      assert.equal(
        [..._render({ frame: 130, input: input }).matchAll(/data-page-turn=/g)]
          .length,
        input.books.length,
      );
      assert.equal(
        [..._render({ frame: 150, input: input }).matchAll(/data-page-turn=/g)]
          .length,
        0,
      );
    });
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
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
  assert.deepEqual(denseInput.readingGroups[0].learnerIds, [
    "reader 0",
    "reader 1",
    "reader 2",
    "reader 3",
  ]);
  const rules = JSON.parse(
    JSON.stringify(contract.semanticRules),
  ) as typeof contract.semanticRules;
  assert.ok(
    rules.some(
      (rule) =>
        rule.paths.includes("readingGroups.*.learnerIds") &&
        rule.description.includes("exactly once"),
    ),
  );
});

test("every moving physical copy has a visible key matching its caption", () => {
  [24, 64.5, 124, 150].forEach((frame) => {
    const markup = _render({
      frame: frame,
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
        const markup = _render({ frame: frame, input: input });
        assert.equal(_bookPositions(markup).length, 4);
        const readers = [
          ...markup.matchAll(
            /data-reader-id="([^"]+)" data-reader-book="([^"]+)"/g,
          ),
        ];
        assert.equal(readers.length, 8);
        readers.forEach((reader) =>
          assert.ok(
            groups
              .find(propEq("bookId", reader[2]))!
              .learnerIds.includes(reader[1]),
          ),
        );
      });
    });
  });
});

test("seats physically pivot toward their group book and clear the caption rail", () => {
  const paths = (markup: string) => [
    ...markup.matchAll(/data-reading-seat="([^"]+)" d="([^"]+)"/g),
  ];
  const setup = paths(_render({ frame: 0, input: denseInput }));
  const hold = paths(_render({ frame: 150, input: denseInput }));
  assert.equal(hold.length, 8);
  hold.forEach((seat, index) => assert.notEqual(seat[2], setup[index][2]));
  [44, 64.5, 94, 108, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: denseInput });
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
      points.forEach((coordinate, index) =>
        assert.ok(
          index % 2 === 0
            ? Number(reader[1]) + coordinate >= 0 &&
                Number(reader[1]) + coordinate <= 960
            : Number(reader[2]) + coordinate < 435,
        ),
      );
    });
  });
});

test("reordered front pickup keeps the exact l0 and l7 heads distinct at frame 36", () => {
  const input = _createCrossingInput();
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 36, input: input });
  const [firstX, firstY] = _getReaderPosition({ markup, id: "l0" });
  const [lastX, lastY] = _getReaderPosition({ markup, id: "l7" });
  const fullHeadDiameter = (2 * 7 + 2.5) * (40 / 48);
  const centerDistance = Math.hypot(firstX - lastX, firstY - lastY);
  assert.ok(
    centerDistance >= fullHeadDiameter,
    `l0/l7 head centers ${centerDistance} apart, full stroked diameter ${fullHeadDiameter}`,
  );
});
