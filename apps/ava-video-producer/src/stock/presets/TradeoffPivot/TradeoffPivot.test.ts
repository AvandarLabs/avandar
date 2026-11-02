import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TradeoffPivot } from "./TradeoffPivot";
import { tradeoffPivotContract } from "./TradeoffPivot.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./TradeoffPivot.fixtures";
import { inputSchema } from "./TradeoffPivot.schema";
/** Inputs for render. */
type RenderInput = {
  approach: string;
  gains: Array<{ id: string; label: string }>;
  concessions: Array<{ id: string; label: string }>;
  sideLabels: { gain: string; concession: string };
  priorityStatement: string;
  revealOrder: "gain-first" | "concession-first";
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: RenderInput;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(TradeoffPivot, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
function _leaf({
  markup,
  side,
}: {
  markup: string;
  side: string;
}): RegExpMatchArray | null {
  return markup.match(
    new RegExp(`data-leaf="${side}" opacity="([^"]+)" transform="([^"]+)"`),
  );
}

test("both tradeoff sides retain every authored point and the priority at the hold", () => {
  const markup = _render({ frame: 150 });
  assert.equal(_leaf({ markup, side: "gain" })?.[1], "1");
  assert.equal(_leaf({ markup, side: "concession" })?.[1], "1");
  [...DEFAULT_INPUT.gains, ...DEFAULT_INPUT.concessions].forEach(({ label }) =>
    assert.ok(markup.includes(label)),
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
  assert.equal(
    _leaf({ markup: _render({ frame: 66 }), side: "concession" })?.[1],
    "0",
  );
  assert.equal(
    _leaf({
      markup: _render({ frame: 66, input: reversed }),
      side: "gain",
    })?.[1],
    "0",
  );
  assert.equal(
    _leaf({
      markup: _render({ frame: 66, input: reversed }),
      side: "concession",
    })?.[1],
    "1",
  );
  assert.equal(
    _leaf({ markup: _render({ frame: 150 }), side: "gain" })?.[2],
    _leaf({
      markup: _render({ frame: 150, input: reversed }),
      side: "gain",
    })?.[2],
  );
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
    const samples = frames.map((frame) => _render({ frame, input }));
    [...frames]
      .reverse()
      .forEach((frame) =>
        assert.equal(_render({ frame, input }), samples[frames.indexOf(frame)]),
      );
    [
      input.approach,
      input.priorityStatement,
      ...input.gains.map(prop("label")),
      ...input.concessions.map(prop("label")),
    ].forEach((text) =>
      assert.ok(
        _render({ frame: 150, input }).includes(`aria-label="${text}"`),
      ),
    );
  });
});

test("strict tradeoffs reject empty sides, duplicate IDs, extra keys and oversized copy", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.equal(inputSchema.safeParse({}).success, false);
});

test("the complete contract keeps separate bounded gain and concession collections", () => {
  assert.deepEqual(tradeoffPivotContract.defaultInput, DEFAULT_INPUT);
  assert.equal(tradeoffPivotContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    tradeoffPivotContract.controls.map(prop("path")),
    Object.keys(DEFAULT_INPUT),
  );
  tradeoffPivotContract.bindingExamples.forEach(({ input }) =>
    assert.equal(inputSchema.safeParse(input).success, true),
  );
});

test("accepted hard breaks in every tradeoff label remain authored while the display fits", () => {
  const text = "A\nB\tC\nD\nE";
  const input = {
    ...DEFAULT_INPUT,
    approach: text,
    gains: DEFAULT_INPUT.gains.map((point) => ({ ...point, label: text })),
    concessions: DEFAULT_INPUT.concessions.map((point) => ({
      ...point,
      label: text,
    })),
    sideLabels: { gain: text, concession: text },
    priorityStatement: text,
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input });
  assert.ok(markup.includes(`aria-label="${text}"`));
  assert.match(markup, />A B C D E<\/tspan>/);
});
