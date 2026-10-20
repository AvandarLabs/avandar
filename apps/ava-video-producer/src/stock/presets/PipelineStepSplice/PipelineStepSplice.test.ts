import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { PipelineStepSplice } from "./PipelineStepSplice";
import { pipelineStepSpliceContract as contract } from "./PipelineStepSplice.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PipelineStepSplice.fixtures";
import { inputSchema, type Input } from "./PipelineStepSplice.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PipelineStepSplice, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
function _visibleTexts(input: Readonly<Input>): string[] {
  return [
    input.title,
    input.editLabel,
    ...input.steps.map(prop("label")),
    ...(input.showPreview ? Object.values(input.preview) : []),
  ];
}
registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "joinStyle"],
  getVisibleTexts: ({ input }) => _visibleTexts(input),
});
function _positions(
  markup: string,
): Array<{ id: string; x: number; y: number }> {
  return [
    ...markup.matchAll(
      /data-step="([^"]*)" transform="translate\(([^ ]*) ([^)]*)\)"/g,
    ),
  ].map((match) => ({
    id: match[1],
    x: Number(match[2]),
    y: Number(match[3]),
  }));
}
test("one parked module enters the requested gap and its joints follow the final ordered sequence", () => {
  fixtures.forEach(({ input }) => {
    const setup = _positions(_render({ frame: 36, input: input })),
      middle = _positions(_render({ frame: 72, input: input })),
      hold = _positions(_render({ frame: 150, input: input }));
    const inserted = input.steps.find(prop("isInserted"))!;
    const at = input.steps.findIndex(prop("isInserted"));
    assert.deepEqual(hold.map(prop("id")), input.steps.map(prop("id")));
    assert.equal(hold.filter(propEq("id", inserted.id)).length, 1);
    assert.ok(setup[at].y < setup[at - 1].y);
    assert.ok(middle[at].y > setup[at].y);
    assert.ok(middle[at].y < hold[at].y);
    assert.equal(hold[at].y, hold[at + 1].y);
    assert.ok(hold[at + 1].x > setup[at + 1].x);
    hold.forEach((step, index) => {
      if (index) {
        assert.ok(step.x >= hold[index - 1].x + 140);
      }
    });
    const markup = _render({ frame: 150, input: input });
    const joins = [
      ...markup.matchAll(
        /data-final-join="[^"]*" data-from="([^"]*)" data-to="([^"]*)" x1="([^"]*)"[^>]*x2="([^"]*)"/g,
      ),
    ];
    assert.deepEqual(
      joins.map((join) => join.slice(1, 3)),
      input.steps
        .slice(1)
        .map((step, index) => [input.steps[index].id, step.id]),
    );
    joins.forEach((join, index) => {
      assert.equal(Number(join[3]), hold[index].x + 140);
      assert.equal(Number(join[4]), hold[index + 1].x);
    });
    assert.equal(markup.includes('data-preview="authored"'), input.showPreview);
  });
});
test("preview strings preserve actual whitespace and empty upper-only values", () => {
  const whitespace = fixtures[4].input;
  const markup = _render({ frame: 150, input: whitespace });
  Object.values(whitespace.preview).forEach((value) =>
    assert.ok(markup.includes(`aria-label="${value}"`)),
  );
  assert.ok(
    markup.includes(`data-preview-input="${whitespace.preview.inputValue}"`),
  );
  assert.match(markup, /xml:space="preserve"/);
  assert.doesNotThrow(() =>
    _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        preview: {
          inputLabel: "",
          inputValue: "",
          outputLabel: "",
          outputValue: "",
        },
      },
    }),
  );
});

test("the gap opens before the descending module reaches its neighbors", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    Array.from(
      { length: Math.max(0, Math.floor((98 - 38) / 2) + 1) },
      (_, sampleIndex) => 38 + sampleIndex * 2,
    ).forEach((frame) => {
      const modules = _positions(_render({ frame: frame, input: input }));
      modules.forEach((module, index) =>
        modules.slice(index + 1).forEach((other) => {
          const separated =
            module.x + 140 <= other.x ||
            other.x + 140 <= module.x ||
            module.y + 110 <= other.y ||
            other.y + 110 <= module.y;
          assert.ok(
            separated,
            `frame ${frame}: ${module.id} overlaps ${other.id}`,
          );
        }),
      );
    });
  });
});
