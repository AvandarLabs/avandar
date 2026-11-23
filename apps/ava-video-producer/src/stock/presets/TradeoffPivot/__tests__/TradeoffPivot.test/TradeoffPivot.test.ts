import { TradeoffPivotTestState } from "./TradeoffPivotTestState";

const { render: _render, leaf: _leaf } = TradeoffPivotTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { tradeoffPivotContract } from "../../TradeoffPivot.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../TradeoffPivot.fixtures";
import { inputSchema } from "../../TradeoffPivot.schema";
import { assertReversingRevealOrderSwapsReversed as _assertReversingRevealOrderSwapsReversed } from "./assertReversingRevealOrderSwapsReversed";

test("both tradeoff sides retain every authored point and the priority at the hold", () => {
  const markup = _render({ frame: 150 });
  assert.equal(_leaf({ markup, side: "gain" })?.[1], "1");
  assert.equal(_leaf({ markup, side: "concession" })?.[1], "1");
  [...DEFAULT_INPUT.gains, ...DEFAULT_INPUT.concessions].forEach(
    ({ label }) => {
      return assert.ok(markup.includes(label));
    },
  );
  assert.ok(markup.includes(DEFAULT_INPUT.priorityStatement));
});

test("reversing reveal order swaps leaf entrances without changing the settled editorial hinge", () => {
  const reversed = {
    ...DEFAULT_INPUT,
    revealOrder: "concession-first" as const,
  };
  assert.equal(
    _leaf({ markup: _render({ frame: 66 }), side: "gain" })?.[1],
    "1",
  );
  _assertReversingRevealOrderSwapsReversed(reversed);
  assert.equal(
    _leaf({ markup: _render({ frame: 150 }), side: "concession" })?.[2],
    _leaf({
      markup: _render({ frame: 150, input: reversed }),
      side: "concession",
    })?.[2],
  );
  const uneven = { ...DEFAULT_INPUT, gains: [DEFAULT_INPUT.gains[0]] };
  assert.equal(
    _leaf({ markup: _render({ frame: 150 }), side: "gain" })?.[2],
    _leaf({
      markup: _render({ frame: 150, input: uneven }),
      side: "gain",
    })?.[2],
  );
});

test("default, minimum, dense and changed tradeoffs retain exact text during backward seeking", () => {
  assert.deepEqual(fixtures.map(prop("id")), [
    "default",
    "minimum",
    "dense",
    "changed",
  ]);
  fixtures.forEach(({ input }) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const frames = [0, 36, 66, 90, 150, 179];
    const samples = frames.map((frame) => {
      return _render({ frame, input });
    });
    [...frames].reverse().forEach((frame) => {
      return assert.equal(
        _render({ frame, input }),
        samples[frames.indexOf(frame)],
      );
    });
    [
      input.approach,
      input.priorityStatement,
      ...input.gains.map(prop("label")),
      ...input.concessions.map(prop("label")),
    ].forEach((text) => {
      return assert.ok(
        _render({ frame: 150, input }).includes(`aria-label="${text}"`),
      );
    });
  });
});

test("strict tradeoffs reject empty sides, duplicate IDs, extra keys and oversized copy", () => {
  invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
  assert.equal(inputSchema.safeParse({}).success, false);
});

test("the complete contract keeps separate bounded gain and concession collections", () => {
  assert.deepEqual(tradeoffPivotContract.defaultInput, DEFAULT_INPUT);
  assert.equal(tradeoffPivotContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    tradeoffPivotContract.controls.map(prop("path")),
    Object.keys(DEFAULT_INPUT),
  );
  tradeoffPivotContract.bindingExamples.forEach(({ input }) => {
    return assert.equal(inputSchema.safeParse(input).success, true);
  });
});

test("accepted hard breaks in every tradeoff label remain authored while the display fits", () => {
  const text = "A\nB\tC\nD\nE";
  const input = {
    ...DEFAULT_INPUT,
    approach: text,
    gains: DEFAULT_INPUT.gains.map((point) => {
      return { ...point, label: text };
    }),
    concessions: DEFAULT_INPUT.concessions.map((point) => {
      return { ...point, label: text };
    }),
    sideLabels: { gain: text, concession: text },
    priorityStatement: text,
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input });
  assert.ok(markup.includes(`aria-label="${text}"`));
  assert.match(markup, />A B C D E<\/tspan>/);
});
