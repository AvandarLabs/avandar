/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ClassroomDayPresence } from "./ClassroomDayPresence";
import {
  DEFAULT_INPUT,
  changedInput,
  fixtures,
  invalidInputs,
} from "./ClassroomDayPresence.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(ClassroomDayPresence, {
        frame,
        accent: "#74e0bd",
        id: "test",
        input,
      }),
    ),
  );
}
test("unknown days retain the complete roster without classifying anyone as absent", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-desk=/g) || []).length, 6);
  assert.equal((markup.match(/data-unknown-marker=/g) || []).length, 6);
  const totals = SvgAttributes.fromMarker({
    markup,
    marker: "attendance-totals",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: totals,
      name: "data-present",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: totals,
      name: "data-absent",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: totals,
      name: "data-unknown",
    }),
    6,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: totals,
      name: "data-roster",
    }),
    6,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { classroomDayPresenceContract as contract } from "./ClassroomDayPresence.contract";
import { inputSchema, SEMANTIC_RULES } from "./ClassroomDayPresence.schema";
import type { Input } from "./ClassroomDayPresence.schema";
function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...input.learners.map(prop("label")),
    ...input.days.map(prop("label")),
    ...Object.values(input.labels),
    input.caption,
  ];
}
const assertions = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: [
    "id",
    "cellId",
    "fromPatchId",
    "toPatchId",
    "learnerId",
    "state",
    "orientation",
    "context",
    "stage",
    "deskLayout",
  ],
  getVisibleTexts: _getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(assertions);
registerStockTextLayoutAssertions(assertions);
test("serialized semantic rules retain every runtime relation", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(contract.semanticRules)).map(
      ({ id, paths }: { id: string; paths: string[] }) => ({ id, paths }),
    ),
    [
      {
        id: "unique-roster",
        paths: ["learners.*.id"],
      },
      {
        id: "unique-days",
        paths: ["days.*.id"],
      },
      {
        id: "complete-days",
        paths: ["days.*.records.*.learnerId", "learners.*.id"],
      },
    ],
  );
  assert.ok(
    SEMANTIC_RULES.every(
      (rule) => rule.paths.length && rule.description.length,
    ),
  );
});

test("each day partitions the unchanged roster and preserves one silhouette per named desk", () => {
  fixtures.forEach(({ input }) => {
    input.days.forEach((day, index) => {
      const markup = _render({ frame: [24, 76, 150][index], input: input }),
        totals = SvgAttributes.fromMarker({
          markup,
          marker: "attendance-totals",
        });
      assert.equal(
        (markup.match(/data-learner-silhouette=/g) || []).length,
        input.learners.length,
      );
      assert.equal(
        (markup.match(/data-desk=/g) || []).length,
        input.learners.length,
      );
      ["present", "absent", "unknown"].forEach((state) =>
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: totals,
            name: `data-${state}`,
          }),
          day.records.filter(
            propEq<{ state: unknown }, "state", unknown>("state", state),
          ).length,
        ),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: totals,
          name: "data-present",
        }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: totals,
            name: "data-absent",
          }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: totals,
            name: "data-unknown",
          }),
        input.learners.length,
      );
    });
  });
});
test("full desk, person, label and impression envelopes remain separate through both layouts", () => {
  ["two-rows", "horseshoe"].forEach((deskLayout) => {
    const input = inputSchema.parse({ ...fixtures[2].input, deskLayout });
    [24, 52, 52.5, 63.5, 76, 98, 98.5, 109.5, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const desks = Array.from(
        markup.matchAll(/<g[^>]*data-desk="[^"]*"[^>]*>/g),
        (match) => ({
          x: SvgAttributes.getNumberFromMarkup({
            attributes: match[0],
            name: "data-x",
          }),
          y: SvgAttributes.getNumberFromMarkup({
            attributes: match[0],
            name: "data-y",
          }),
        }),
      );
      desks.forEach((desk, index) => {
        assert.ok(
          desk.x - 65 >= 32 &&
            desk.x + 65 <= 928 &&
            desk.y - 22 >= 140 &&
            desk.y + 115 <= 529,
        );
        desks
          .slice(index + 1)
          .forEach((other) =>
            assert.ok(
              desk.x + 65 < other.x - 65 ||
                other.x + 65 < desk.x - 65 ||
                desk.y + 115 < other.y - 22 ||
                other.y + 115 < desk.y - 22,
            ),
          );
      });
    });
  });
});
test("hidden day impressions keep the complete roster and separate unknown seats", () => {
  const input = { ...changedInput, showDayImpressions: false },
    markup = _render({ frame: 150, input: input });
  assert.doesNotMatch(markup, /data-day-impression/);
  assert.equal(
    (markup.match(/data-unknown-marker=/g) || []).length,
    input.learners.length,
  );
  assert.equal(
    (markup.match(/data-desk=/g) || []).length,
    input.learners.length,
  );
});
