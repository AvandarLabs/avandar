import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CapabilityMatrix } from "./CapabilityMatrix";
import { capabilityMatrixContract } from "./CapabilityMatrix.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./CapabilityMatrix.fixtures";
import { inputSchema } from "./CapabilityMatrix.schema";
/** Inputs for render. */
type RenderInput = {
  options: Array<{ id: string; label: string }>;
  capabilities: Array<{
    id: string;
    label: string;
    cells: Array<{
      optionId: string;
      state: "unknown" | "included" | "absent" | "conditional";
      note: string;
    }>;
  }>;
  stateLabels: {
    included: string;
    absent: string;
    conditional: string;
    unknown: string;
  };
  focus: { kind: "row" | "column" | "none"; id: string };
  showNotes: boolean;
  caption: string;
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
      createElement(CapabilityMatrix, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
function _cells(markup: string): string[] {
  return [...markup.matchAll(/data-cell="([^"]+)" data-state="([^"]+)"/g)].map(
    (match) => `${match[1]}:${match[2]}`,
  );
}

test("four capability states retain four distinct glyph shapes including unknown", () => {
  const markup = _render({ frame: 150 });
  const paths = [
    ...markup.matchAll(/data-state-glyph="([^"]+)"[^>]*><path d="([^"]+)"/g),
  ];
  assert.equal(new Set(paths.map((match) => match[1])).size, 4);
  assert.equal(new Set(paths.map((match) => match[2])).size, 4);
  assert.ok(markup.includes('data-cell="refill:desk" data-state="unknown"'));
  assert.ok(markup.includes('data-cell="ruler:pocket" data-state="absent"'));
});

test("row and column emphasis preserve every explicit capability value", () => {
  const row = _render({ frame: 150 });
  const column = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      focus: { kind: "column", id: "desk" },
    },
  });
  assert.match(row, /data-focus="row:refill"/);
  assert.match(column, /data-focus="column:desk"/);
  assert.deepEqual(_cells(row), _cells(column));
  assert.doesNotMatch(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, focus: { kind: "none", id: "" } },
    }),
    /data-focus=/,
  );
});

test("local querying, remote invitations and optional sync retain independently authored availability", () => {
  const input = fixtures.find(({ id }) => id === "changed")!.input;
  const markup = _render({ frame: 150, input });
  assert.ok(markup.includes('data-cell="query:local" data-state="included"'));
  assert.ok(markup.includes('data-cell="invite:local" data-state="absent"'));
  assert.ok(markup.includes('data-cell="sync:local" data-state="conditional"'));
  const hidden = _render({ frame: 150, input: { ...input, showNotes: false } });
  assert.deepEqual(_cells(hidden), _cells(markup));
  assert.doesNotMatch(hidden, /Requires network/);
});

test("default, minimum, dense and changed fixtures remain complete during backward seeking", () => {
  assert.deepEqual(fixtures.map(prop("id")), [
    "default",
    "minimum",
    "dense",
    "changed",
  ]);
  fixtures.forEach(({ input }) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const frames = [0, 36, 90, 150, 179];
    const samples = frames.map((frame) => _render({ frame, input }));
    [...frames]
      .reverse()
      .forEach((frame) =>
        assert.equal(_render({ frame, input }), samples[frames.indexOf(frame)]),
      );
    assert.equal(
      _cells(_render({ frame: 150, input })).length,
      input.capabilities.length * input.options.length,
    );
  });
});

test("strict cells reject incomplete coverage, foreign IDs, duplicate cells and impossible focus", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.equal(inputSchema.safeParse({}).success, false);
  assert.equal(
    inputSchema.safeParse({ ...DEFAULT_INPUT, caption: "Q".repeat(49) })
      .success,
    false,
  );
});

test("the complete contract exposes nested cell controls and valid bindings", () => {
  assert.deepEqual(capabilityMatrixContract.defaultInput, DEFAULT_INPUT);
  assert.equal(capabilityMatrixContract.jsonSchema.additionalProperties, false);
  assert.deepEqual(
    capabilityMatrixContract.controls.map(prop("path")),
    Object.keys(DEFAULT_INPUT),
  );
  capabilityMatrixContract.bindingExamples.forEach(({ input }) =>
    assert.equal(inputSchema.safeParse(input).success, true),
  );
});

test("accepted spaced row labels and hard breaks retain authored copy in rendered cells", async () => {
  const { textRegressionInputs } = await import("./CapabilityMatrix.fixtures");
  textRegressionInputs.forEach(({ id, input, text }) => {
    assert.deepEqual(inputSchema.parse(input), input, id);
    const markup = _render({ frame: 150, input });
    assert.ok(markup.includes(`aria-label="${text}"`), id);
    assert.equal(
      _cells(markup).length,
      input.capabilities.length * input.options.length,
    );
  });
});
