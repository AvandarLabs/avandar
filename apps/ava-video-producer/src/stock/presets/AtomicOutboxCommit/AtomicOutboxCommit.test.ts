import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { AtomicOutboxCommit } from "./AtomicOutboxCommit";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./AtomicOutboxCommit.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(AtomicOutboxCommit, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

test("a committed local edit has exactly one matching pending durable ticket", () => {
  const hold = _render({ frame: 150 });
  assert.match(hold, /data-local-value="Count 3"/);
  assert.equal((hold.match(/data-durable-ticket="edit-a"/g) ?? []).length, 1);
  assert.match(hold, /data-ticket-state="pending"/);
});
test("abort retains the before value without durable tickets or visible proposals", () => {
  const hold = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      outcome: "abort",
      showIdentifier: false,
    },
  });
  assert.match(hold, /data-local-value="Count 2"/);
  assert.doesNotMatch(hold, /data-durable-ticket=/);
  assert.doesNotMatch(hold, /data-provisional-half=/);
});
test("every sampled frame commits both durable halves or neither", () => {
  fixtures.forEach(({ input }) =>
    Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const committed = markup.includes('data-local-durable="true"');
      const tickets = (markup.match(/data-durable-ticket=/g) ?? []).length;
      assert.equal(
        tickets,
        committed ? 1 : 0,
        `${input.outcome} frame ${frame}`,
      );
    }),
  );
});
test("both proposal halves write beneath one moving latch before one atomic stamp", () => {
  const early = _render({ frame: 20 }),
    written = _render({ frame: 55 });
  assert.equal((written.match(/data-provisional-half=/g) ?? []).length, 2);
  assert.notEqual(early, written);
  const y = (frame: number) =>
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: frame }),
        marker: "commit-latch",
      }),
      name: "y1",
    });
  assert.ok(y(80) > y(56) && y(80) < y(110));
  assert.equal(
    (_render({ frame: 139 }).match(/data-commit-stamp=/g) ?? []).length,
    2,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { atomicOutboxCommitContract } from "./AtomicOutboxCommit.contract";
import { inputSchema, type Input } from "./AtomicOutboxCommit.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const isCommitted = input.outcome === "commit" && frame >= 111;
  return [
    input.copy.context,
    input.labels.local,
    input.labels.outbox,
    input.change.recordLabel,
    isCommitted ? input.copy.after : input.copy.before,
    isCommitted ? input.change.after : input.change.before,
    ...(frame < 139 ? [input.labels.pending] : []),
    ...(frame >= 139
      ? [isCommitted ? input.labels.committed : input.labels.aborted]
      : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: atomicOutboxCommitContract,
  render: _render,
  excludedTextFields: ["id", "outcome", "before", "after"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: atomicOutboxCommitContract,
  expectedTextPaths: [
    ["change", "recordLabel"],
    ["labels", "local"],
    ["labels", "outbox"],
    ["labels", "pending"],
    ["labels", "committed"],
    ["labels", "aborted"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("literal empty and whitespace values survive commit and abort while hidden IDs preserve pairing", () => {
  const input = fixtures[1].input;
  const committed = _render({
    frame: 150,
    input: { ...input, showIdentifier: false },
  });
  assert.match(committed, /data-local-value=" "/);
  assert.equal((committed.match(/data-durable-ticket="a"/g) ?? []).length, 1);
  assert.match(committed, /data-correlation-id="a"/);
  assert.doesNotMatch(committed, /data-literal-value="a"/);
  const aborted = _render({
    frame: 150,
    input: { ...input, outcome: "abort" },
  });
  assert.match(aborted, /data-local-value=""/);
  assert.doesNotMatch(aborted, /data-durable-ticket=/);
});
test("the complete latch stroke and handle remain clear of the record caption throughout closure", () => {
  [
    DEFAULT_INPUT,
    fixtures[2].input,
    {
      ...fixtures[2].input,
      change: { ...fixtures[2].input.change, recordLabel: "界".repeat(28) },
    },
  ].forEach((input) => {
    Array.from({ length: 221 }, (_, index) => index / 2).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const caption = [...markup.matchAll(/<text[^>]+>/g)]
        .map(([tag]) => tag)
        .find((tag) =>
          tag.includes(`aria-label="${input.change.recordLabel}"`),
        );
      assert.ok(caption);
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: caption,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({
          attributes: caption,
          name: "y",
        }),
        fontSize = SvgAttributes.getNumberFromMarkup({
          attributes: caption,
          name: "font-size",
        });
      const right =
        x +
        getConservativeWidthFromText({
          text: input.change.recordLabel,
          fontSize,
        });
      const top = y - fontSize,
        bottom = y + fontSize * 0.3;
      const latch = SvgAttributes.fromMarker({
        markup,
        marker: "commit-latch",
      });
      const latchY = SvgAttributes.getNumberFromMarkup({
        attributes: latch,
        name: "y1",
      });
      const halfStroke =
        SvgAttributes.getNumberFromMarkup({
          attributes: latch,
          name: "stroke-width",
        }) / 2;
      assert.ok(
        right < 98 ||
          x > 862 ||
          bottom < latchY - halfStroke ||
          top > latchY + halfStroke,
        `latch crosses caption at ${frame}`,
      );
      assert.ok(
        right < 463.5 ||
          x > 496.5 ||
          bottom < latchY - 13.5 ||
          top > latchY + 1.5,
        `handle crosses caption at ${frame}`,
      );
    });
  });
});
